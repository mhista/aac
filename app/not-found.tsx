import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <section className="flex min-h-[70svh] items-center">
      <div className="wrap py-28 text-center">
        <p className="mono mb-6">404</p>
        <h1 className="display mx-auto max-w-[18ch] text-[clamp(2.25rem,1.6rem+3vw,4rem)]">
          That page is not here.
        </h1>
        <p className="mx-auto mt-6 max-w-[46ch] text-body-l text-[var(--color-text-secondary)]">
          The link may be old, or the page may not have been published yet. Everything on this site
          appears only once it is real.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button href="/" size="lg" arrow>Back to home</Button>
          <Button href="/contact" variant="secondary" size="lg">Contact us</Button>
        </div>
        <p className="mt-10 text-caption text-[var(--color-text-secondary)]">
          Looking for something specific? Try{" "}
          <Link href="/what-we-do" className="text-[var(--color-text-emphasis)] underline-offset-4 hover:underline">what we do</Link>,{" "}
          <Link href="/events" className="text-[var(--color-text-emphasis)] underline-offset-4 hover:underline">events</Link> or{" "}
          <Link href="/get-involved" className="text-[var(--color-text-emphasis)] underline-offset-4 hover:underline">get involved</Link>.
        </p>
      </div>
    </section>
  );
}
