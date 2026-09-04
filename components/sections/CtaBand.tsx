import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { ORG } from "@/lib/org";

export function CtaBand() {
  return (
    <section
      className="section"
      style={{ background: "var(--color-overlay-gradient-brand)" }}
    >
      <div className="wrap text-center">
        <Reveal>
          <p className="mono mb-5 !text-[var(--color-violet-200)]">Get involved</p>
          <h2 className="mx-auto max-w-[18ch] font-display text-[clamp(2.125rem,1.43rem+2.86vw,4rem)] leading-display tracking-tighter text-white">
            {ORG.principle}
          </h2>
          <p className="mx-auto mt-6 max-w-[52ch] text-body-l text-[var(--color-violet-100)]">
            Whether you are a student, a health professional, a researcher, a survivor
            or someone who simply wants to help — there is a role for you.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button href="/get-involved/advocates" variant="on-inverse" size="lg" arrow>Become an advocate</Button>
            <Button href="/get-involved/partner" variant="on-inverse" size="lg" className="!bg-transparent !text-white ring-1 ring-inset ring-white/40 hover:!bg-white/10">
              Partner with us
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
