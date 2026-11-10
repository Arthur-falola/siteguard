import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Benefits } from "@/components/landing/benefits";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";
import { Button } from "@/components/ui";
import { ArrowRightIcon } from "@/components/landing/icons";

function FinalCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl bg-brand-600 px-6 py-14 text-center sm:px-12 dark:bg-brand-500">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_120%_at_50%_0%,rgba(255,255,255,0.25),transparent_70%)]"
        />
        <h2 className="relative text-3xl font-bold tracking-tight text-white text-balance sm:text-4xl">
          Find out before your clients do.
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-lg text-indigo-100">
          Add your first site in under a minute. Free plan, no card required.
        </p>
        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            href="/register"
            size="lg"
            className="bg-white text-brand-700 shadow-md hover:bg-indigo-50 dark:bg-white dark:text-brand-700 dark:hover:bg-indigo-50"
          >
            Start Monitoring
            <ArrowRightIcon className="h-4 w-4" />
          </Button>
          <Button
            href="#pricing"
            size="lg"
            variant="outline"
            className="border-white/40 bg-transparent text-white hover:border-white hover:bg-white/10 dark:border-white/40 dark:bg-transparent dark:text-white dark:hover:bg-white/10"
          >
            See pricing
          </Button>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-white dark:bg-ink-950">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <Benefits />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
