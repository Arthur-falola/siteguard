// Website checking with SSRF protection.
//
// validatePublicUrl() rejects anything that is not a public http(s) URL:
// non-http/https schemes, localhost, *.local, IP literals in
// private/loopback/link-local/reserved ranges, and hostnames whose DNS
// answers resolve to such addresses (ALL resolved addresses are checked).
// Redirects are followed manually (max 3) and every redirect target is
// re-validated, so a public URL cannot bounce the fetch onto an internal
// address (e.g. 169.254.169.254, the cloud metadata endpoint).
//
// Uptime and certificate health are reported INDEPENDENTLY:
// - The HTTP probe uses a raw http/https request whose TLS handshake does
//   NOT reject untrusted certificates (rejectUnauthorized: false). A site
//   that answers HTTP is "up" even if its certificate is broken; the
//   certificate problem is reported separately as an SSL warning. The
//   probe sends no credentials, so skipping cert validation here leaks
//   nothing — it only reads a public status page.
// - The SSL probe (getSslInfo) verifies the certificate chain itself and
//   reports issuer, expiry and plain-language warnings.
//
// Failure causes are classified (dns / tcp / tls / timeout / http_error /
// validation) and surfaced ONLY as curated plain-English messages. Raw
// Node.js/undici error text is never shown to users — it can contain
// runtime internals (e.g. hints about running Node with --use-system-ca)
// that mean nothing to a freelancer checking a client's site.

import http from 'node:http';
import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import tls from 'node:tls';

export type CheckFailureKind =
  | 'dns'
  | 'tcp'
  | 'tls'
  | 'timeout'
  | 'http_error'
  | 'validation';

export interface SslInfo {
  valid: boolean | null;
  issuer: string | null;
  expiresAt: Date | null;
  daysRemaining: number | null;
  error: string | null;
}

export interface CheckResult {
  ok: boolean;
  statusCode: number | null;
  responseTimeMs: number | null;
  failureKind: CheckFailureKind | null;
  error: string | null;
  ssl: SslInfo;
}

const FETCH_TIMEOUT_MS = 10_000;
const SSL_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

function emptySsl(): SslInfo {
  return {
    valid: null,
    issuer: null,
    expiresAt: null,
    daysRemaining: null,
    error: null,
  };
}

// ---------------------------------------------------------------------------
// IP range checks (fail closed: an unparseable address is treated as blocked)
// ---------------------------------------------------------------------------

function parseIPv4(ip: string): number[] | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n < 0 || n > 255) return null;
    octets.push(n);
  }
  return octets;
}

function isPrivateOrReservedIPv4(octets: number[]): boolean {
  const [a, b, c] = octets;
  if (a === 0) return true; // 0.0.0.0/8 ("this network")
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (incl. cloud metadata 169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24 IETF protocol assignments
  if (a === 192 && b === 0 && c === 2) return true; // 192.0.2.0/24 TEST-NET-1 (documentation)
  if (a === 192 && b === 88 && c === 99) return true; // 192.88.99.0/24 deprecated
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 198 && b >= 18 && b <= 19) return true; // 198.18.0.0/15 benchmarking
  if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24 TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24 TEST-NET-3
  if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved
  return false;
}

/** Expand an IPv6 literal to 8 numeric 16-bit groups, or null if invalid. */
function expandIPv6(ip: string): number[] | null {
  let addr = ip;
  // Embedded IPv4 tail (e.g. ::ffff:127.0.0.1): convert to two hex groups.
  const lastColon = addr.lastIndexOf(':');
  const tail = addr.slice(lastColon + 1);
  if (tail.includes('.')) {
    const v4 = parseIPv4(tail);
    if (!v4) return null;
    const high = (v4[0] << 8) | v4[1];
    const low = (v4[2] << 8) | v4[3];
    addr = `${addr.slice(0, lastColon + 1)}${high.toString(16)}:${low.toString(16)}`;
  }

  const parseGroup = (g: string): number | null => {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
    return parseInt(g, 16);
  };

  if (addr.includes('::')) {
    const [left, right] = addr.split('::');
    const leftGroups = left ? left.split(':') : [];
    const rightGroups = right ? right.split(':') : [];
    if (leftGroups.length + rightGroups.length > 7) return null;
    const missing = 8 - (leftGroups.length + rightGroups.length);
    const groups: number[] = [];
    for (const g of leftGroups) {
      const n = parseGroup(g);
      if (n === null) return null;
      groups.push(n);
    }
    for (let i = 0; i < missing; i++) groups.push(0);
    for (const g of rightGroups) {
      const n = parseGroup(g);
      if (n === null) return null;
      groups.push(n);
    }
    return groups.length === 8 ? groups : null;
  }

  const parts = addr.split(':');
  if (parts.length !== 8) return null;
  const groups: number[] = [];
  for (const g of parts) {
    const n = parseGroup(g);
    if (n === null) return null;
    groups.push(n);
  }
  return groups;
}

function isPrivateOrReservedIPv6(ip: string): boolean {
  const g = expandIPv6(ip);
  if (!g) return true; // fail closed
  const [g0, g1, g2, g3, g4, g5, g6, g7] = g;
  if (g.every((n) => n === 0)) return true; // :: unspecified
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0 && g6 === 0 && g7 === 1) {
    return true; // ::1 loopback
  }
  if ((g0 & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((g0 & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((g0 & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (g0 === 0x2001 && g1 === 0x0db8) return true; // 2001:db8::/32 documentation
  if (g0 === 0x0100 && g1 === 0 && g2 === 0 && g3 === 0) return true; // 100::/64 discard
  // IPv4-mapped (::ffff:0:0/96) and NAT64 well-known prefix (64:ff9b::/96):
  // the embedded IPv4 address decides.
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0xffff) {
    return isPrivateOrReservedIPv4([(g6 >> 8) & 0xff, g6 & 0xff, (g7 >> 8) & 0xff, g7 & 0xff]);
  }
  if (g0 === 0x0064 && g1 === 0xff9b && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) {
    return isPrivateOrReservedIPv4([(g6 >> 8) & 0xff, g6 & 0xff, (g7 >> 8) & 0xff, g7 & 0xff]);
  }
  // IPv4-compatible (::a.b.c.d, first 96 bits zero): embedded IPv4 decides.
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) {
    return isPrivateOrReservedIPv4([(g6 >> 8) & 0xff, g6 & 0xff, (g7 >> 8) & 0xff, g7 & 0xff]);
  }
  return false;
}

function isPrivateOrReservedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const octets = parseIPv4(ip);
    return octets === null ? true : isPrivateOrReservedIPv4(octets);
  }
  if (version === 6) {
    return isPrivateOrReservedIPv6(ip);
  }
  return true; // not a parseable IP — fail closed
}

// ---------------------------------------------------------------------------
// URL validation
// ---------------------------------------------------------------------------

/**
 * Validate that a URL is a public http(s) URL safe to fetch.
 * Throws an Error with a clear message otherwise.
 *
 * NOTE: this is async because it resolves the hostname via DNS and checks
 * every resolved address. The CONTRACT.md signature `validatePublicUrl(raw):
 * URL` cannot do that synchronously, so this returns Promise<URL> instead.
 */
export async function validatePublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http:// and https:// URLs are allowed');
  }
  if (url.username || url.password) {
    throw new Error('URLs with embedded credentials are not allowed');
  }
  // URL.hostname keeps brackets around IPv6 literals; strip them for checks.
  const hostname = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
  if (!hostname) {
    throw new Error('URL must have a hostname');
  }
  if (hostname === 'localhost' || hostname.endsWith('.local')) {
    throw new Error(`Host "${hostname}" is not a public address`);
  }
  if (isIP(hostname) !== 0) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new Error(`IP address ${hostname} is not a public address`);
    }
    return url;
  }
  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new Error(`Could not resolve host: ${hostname}`);
  }
  if (addresses.length === 0) {
    throw new Error(`Could not resolve host: ${hostname}`);
  }
  for (const { address } of addresses) {
    if (isPrivateOrReservedIp(address)) {
      throw new Error(`Host ${hostname} resolves to a non-public IP address (${address})`);
    }
  }
  return url;
}

// ---------------------------------------------------------------------------
// SSL check
// ---------------------------------------------------------------------------

/** Plain-language explanation of a certificate verification failure.
 * `authorizationError` is typed as Error by @types/node, but at runtime
 * Node hands back the bare verification code string (e.g.
 * "DEPTH_ZERO_SELF_SIGNED_CERT") — handle both shapes. */
function describeCertProblem(
  authorizationError: unknown,
  expired: boolean,
): string {
  if (expired) return 'The certificate has expired.';
  const code =
    typeof authorizationError === 'string'
      ? authorizationError
      : ((authorizationError as NodeJS.ErrnoException | undefined)?.code ?? '');
  switch (code) {
    case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
      return 'The certificate chain is incomplete — the server did not send the intermediate certificate(s) needed to verify it.';
    case 'DEPTH_ZERO_SELF_SIGNED_CERT':
    case 'SELF_SIGNED_CERT_IN_CHAIN':
      return 'The certificate is self-signed and cannot be verified against a trusted authority.';
    case 'ERR_TLS_CERT_ALTNAME_INVALID':
      return 'The certificate does not cover this hostname.';
    case 'CERT_NOT_YET_VALID':
      return 'The certificate is not valid yet.';
    case 'CERT_HAS_EXPIRED':
      return 'The certificate has expired.';
    case 'UNABLE_TO_GET_ISSUER_CERT':
    case 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY':
      return 'The certificate could not be verified — its issuer is not recognised.';
    default:
      return 'The certificate could not be verified against a trusted authority.';
  }
}

function readIssuer(
  cert: tls.PeerCertificate & { issuer?: { CN?: string; O?: string } | string },
): string | null {
  const issuer = cert.issuer;
  if (!issuer) return null;
  if (typeof issuer === 'string') return issuer || null;
  return issuer.CN ?? issuer.O ?? null;
}

/**
 * Read a site's TLS certificate: issuer, expiry, days remaining, and
 * whether the chain verifies. The handshake deliberately does NOT reject
 * untrusted chains (rejectUnauthorized: false) so the certificate can
 * still be read — and reported in plain language — when the chain is
 * incomplete or untrusted. `socket.authorized` /
 * `socket.authorizationError` tell us whether verification succeeded.
 * Transport errors are mapped to plain messages; raw error text is
 * never surfaced.
 */
export async function getSslInfo(url: URL): Promise<SslInfo> {
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const port = url.port ? Number(url.port) : 443;
  const isIpLiteral = isIP(hostname) !== 0;

  return new Promise((resolve) => {
    let settled = false;
    const done = (info: SslInfo) => {
      if (!settled) {
        settled = true;
        resolve(info);
      }
    };
    const fail = (message: string): SslInfo => ({
      valid: false,
      issuer: null,
      expiresAt: null,
      daysRemaining: null,
      error: message,
    });

    let socket: tls.TLSSocket;
    try {
      socket = tls.connect({
        host: hostname,
        port,
        // SNI only for real hostnames, never for IP literals.
        servername: isIpLiteral ? undefined : hostname,
        rejectUnauthorized: false,
        timeout: SSL_TIMEOUT_MS,
      });
    } catch {
      done(fail('The secure connection could not be established.'));
      return;
    }

    socket.setTimeout(SSL_TIMEOUT_MS);
    socket.once('secureConnect', () => {
      const cert = socket.getPeerCertificate() as tls.PeerCertificate & {
        issuer?: { CN?: string; O?: string } | string;
      };
      const validToRaw = (cert as { valid_to?: unknown } | null)?.valid_to;
      if (typeof validToRaw !== 'string' || !cert || Object.keys(cert).length === 0) {
        socket.destroy();
        done(fail('The server did not present a certificate.'));
        return;
      }
      const expiresAt = new Date(validToRaw);
      if (Number.isNaN(expiresAt.getTime())) {
        socket.destroy();
        done(fail('The certificate expiry date could not be read.'));
        return;
      }
      const daysRemaining = Math.floor((expiresAt.getTime() - Date.now()) / 86_400_000);
      const expired = expiresAt.getTime() <= Date.now();
      const authorized = Boolean(socket.authorized);
      const valid = authorized && !expired;
      const authorizationError = socket.authorizationError;
      socket.destroy();
      done({
        valid,
        issuer: readIssuer(cert),
        expiresAt,
        daysRemaining,
        error: valid
          ? null
          : describeCertProblem(authorizationError, expired),
      });
    });
    socket.once('timeout', () => {
      socket.destroy();
      done(fail('The SSL check timed out.'));
    });
    socket.once('error', (err) => {
      const code = (err as NodeJS.ErrnoException).code ?? '';
      if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
        done(fail('The hostname could not be resolved (DNS lookup failed).'));
      } else if (code === 'ECONNREFUSED') {
        done(fail('The server refused the connection.'));
      } else {
        done(fail('The secure connection could not be established.'));
      }
      try {
        socket.destroy();
      } catch {
        // Socket already gone — nothing to do.
      }
    });
  });
}

// ---------------------------------------------------------------------------
// HTTP probe (raw http/https — see the header note on why not fetch)
// ---------------------------------------------------------------------------

export interface ProbeLeg {
  statusCode: number | null;
  responseTimeMs: number;
  failureKind: CheckFailureKind | null;
  error: string | null;
  location: string | null;
}

/** One request, no redirect following. Only the status code and the
 * `location` header are recorded; the body is discarded immediately. */
export function requestOnce(url: URL, startedAt: number): Promise<ProbeLeg> {
  return new Promise((resolve) => {
    const isHttps = url.protocol === 'https:';
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    const isIpLiteral = isIP(hostname) !== 0;
    let settled = false;
    let tlsEstablished = false;
    let timedOut = false;

    const done = (leg: ProbeLeg) => {
      if (!settled) {
        settled = true;
        resolve(leg);
      }
    };
    const fail = (kind: CheckFailureKind, message: string) => {
      done({
        statusCode: null,
        responseTimeMs: Date.now() - startedAt,
        failureKind: kind,
        error: message,
        location: null,
      });
    };

    const options: https.RequestOptions = {
      method: 'GET',
      // See the header note: certificate validation lives in the SSL
      // probe, so a broken certificate never turns into a false "down".
      rejectUnauthorized: false,
      servername: isHttps && !isIpLiteral ? hostname : undefined,
      headers: {
        'user-agent': 'SiteGuard/1.0 (website health monitor)',
        accept: '*/*',
      },
    };

    let req: http.ClientRequest;
    try {
      const get = (isHttps ? https.get : http.get) as typeof https.get;
      req = get(url.toString(), options, (res) => {
        const statusCode = res.statusCode ?? 0;
        const location =
          typeof res.headers.location === 'string' ? res.headers.location : null;
        // Status only — discard the body and finish immediately.
        res.once('error', () => {
          // Body errors after headers are irrelevant to the verdict.
        });
        res.destroy();
        done({
          statusCode,
          responseTimeMs: Date.now() - startedAt,
          failureKind: null,
          error: null,
          location,
        });
      });
    } catch {
      fail('tcp', 'The site could not be reached.');
      return;
    }

    req.on('socket', (socket) => {
      if (isHttps) {
        (socket as unknown as tls.TLSSocket).once('secureConnect', () => {
          tlsEstablished = true;
        });
      }
    });
    req.setTimeout(FETCH_TIMEOUT_MS);
    req.once('timeout', () => {
      timedOut = true;
      req.destroy(new Error('Request timed out'));
    });
    req.once('error', (err) => {
      // Only the error CODE is used — never the raw message, which can
      // contain runtime internals (e.g. Node.js hints) users should
      // never see.
      const code = (err as NodeJS.ErrnoException).code ?? '';
      const message = err.message ?? '';
      if (timedOut || code === 'ETIMEDOUT' || code === 'ECONNABORTED') {
        fail('timeout', 'The site did not respond within 10 seconds.');
      } else if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
        fail('dns', 'The hostname could not be resolved (DNS lookup failed).');
      } else if (code === 'ECONNREFUSED') {
        fail('tcp', 'The server refused the connection.');
      } else if (
        code === 'ECONNRESET' ||
        code === 'EPIPE' ||
        message.includes('socket hang up')
      ) {
        fail(
          'tcp',
          tlsEstablished
            ? 'The server accepted the secure connection but sent no response.'
            : 'The connection was closed before the site sent a response.',
        );
      } else if (
        code.startsWith('ERR_SSL') ||
        code.startsWith('CERT_') ||
        message.includes('certificate')
      ) {
        fail('tls', 'The secure connection could not be established.');
      } else {
        fail('tcp', 'The site could not be reached.');
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Website check
// ---------------------------------------------------------------------------

/**
 * Check a website: HTTP probe (10s timeout, manual redirects, max 3)
 * plus an SSL certificate check for https URLs. Never throws for a bad
 * URL or a failed probe — those come back as { ok: false, failureKind,
 * error } instead. A site is "up" when the final response is 2xx/3xx.
 * A certificate problem never makes a site "down" — it is reported
 * separately in `ssl` as a warning.
 */
export async function checkWebsite(rawUrl: string): Promise<CheckResult> {
  const startedAt = Date.now();

  let initialUrl: URL;
  try {
    initialUrl = await validatePublicUrl(rawUrl);
  } catch (err) {
    return {
      ok: false,
      statusCode: null,
      responseTimeMs: null,
      failureKind: 'validation',
      error: err instanceof Error ? err.message : 'Invalid URL',
      ssl: emptySsl(),
    };
  }

  let currentUrl = initialUrl;
  let statusCode: number | null = null;
  let responseTimeMs: number | null = null;
  let failureKind: CheckFailureKind | null = null;
  let error: string | null = null;

  let redirects = 0;
  for (;;) {
    const leg = await requestOnce(currentUrl, startedAt);
    responseTimeMs = leg.responseTimeMs;
    if (leg.failureKind !== null) {
      failureKind = leg.failureKind;
      error = leg.error;
      statusCode = null;
      break;
    }
    statusCode = leg.statusCode;

    const location = leg.location;
    if (statusCode !== null && statusCode >= 300 && statusCode < 400 && location) {
      if (redirects >= MAX_REDIRECTS) {
        failureKind = 'http_error';
        error = `Too many redirects (max ${MAX_REDIRECTS})`;
        break;
      }
      redirects += 1;
      try {
        // Re-validate every redirect target — a public URL must not be
        // able to bounce the check onto an internal address.
        currentUrl = await validatePublicUrl(new URL(location, currentUrl).toString());
      } catch (err) {
        failureKind = 'validation';
        error = err instanceof Error ? err.message : 'Invalid redirect URL';
        statusCode = null;
        break;
      }
      continue;
    }
    break;
  }

  // SSL is checked on the host that actually served the final response,
  // independently of the HTTP outcome.
  const ssl = currentUrl.protocol === 'https:' ? await getSslInfo(currentUrl) : emptySsl();

  const httpOk =
    failureKind === null && statusCode !== null && statusCode >= 200 && statusCode < 400;
  if (!httpOk && failureKind === null && statusCode !== null) {
    // HTTP error status (4xx/5xx) with no transport failure.
    failureKind = 'http_error';
    error = `The site returned HTTP ${statusCode}.`;
  }

  return {
    ok: httpOk,
    statusCode,
    responseTimeMs,
    failureKind,
    error: httpOk ? null : error,
    ssl,
  };
}
