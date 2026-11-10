import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SiteGuard — The Website Health Assistant for Freelancers and Agencies",
  description:
    "SiteGuard monitors your clients' websites — uptime, SSL certificates, and incidents — in one calm dashboard, so you find out before your clients do.",
  metadataBase: new URL("https://siteguard.example.com"),
  openGraph: {
    title: "SiteGuard — The Website Health Assistant for Freelancers and Agencies",
    description:
      "Uptime, SSL, and incident monitoring for freelancers and agencies. One calm dashboard for every site you look after.",
    type: "website",
  },
};

/**
 * Blocking theme script: applies the saved theme (or the system
 * preference) before first paint so there is no dark/light flash.
 * The ThemeToggle component keeps localStorage in sync afterwards.
 */
const themeScript = `(function(){try{var t=localStorage.getItem('siteguard-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
