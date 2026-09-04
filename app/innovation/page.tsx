import type { Metadata } from "next";
import { Reveal } from "@/components/motion/Reveal";
import { ApplyPanel } from "@/components/ui/ApplyPanel";

export const metadata: Metadata = {
  title: "UgwuMind — Education & Innovation",
  description: "UgwuMind is AAC's innovation work: exploring how AI, digital health and computational methods can contribute to cancer prevention, screening, diagnosis, research and drug discovery in low-resource settings.",
};

export default function InnovationPage() {
  return (
    <>
      {/* Dark ground — the one page that leads with the inverse surface */}
      <section className="bg-[var(--color-surface-inverse)] pb-24 pt-32 text-[var(--color-text-on-inverse)] md:pb-32 md:pt-40">
        <div className="wrap">
          <Reveal>
            <p className="mono mb-5 !text-[var(--color-violet-300)]">Education &amp; Innovation</p>
            <h1 className="max-w-[16ch] font-display text-[clamp(2.5rem,1.7rem+3.4vw,4.5rem)] leading-display tracking-tighter text-white">
              UgwuMind
            </h1>
            <p className="measure mt-7 text-body-l leading-lede text-[var(--color-violet-100)]">
              Technology is only useful when it solves a real problem. UgwuMind is where we explore how
              artificial intelligence, digital health, computational methods and other technologies can
              contribute to cancer prevention, screening, diagnosis, research and drug discovery.
            </p>
            <p className="mt-10 max-w-[38ch] font-display text-[clamp(1.5rem,1.1rem+1.6vw,2.25rem)] leading-heading text-white">
              Our question is not &ldquo;can we build it?&rdquo; It is &ldquo;can this actually help someone?&rdquo;
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="wrap grid gap-12 lg:grid-cols-3 lg:gap-14">
          {[
            { t: "The constraint is the brief", b: "We are interested in solutions that work where resources are limited — intermittent power, low bandwidth, few specialists, shared devices. A tool that only works in a well-funded hospital does not help the people cancer reaches last." },
            { t: "Evidence before enthusiasm", b: "AI in health is full of demos that never touched a patient. We would rather ship one thing that measurably helps than a portfolio of prototypes." },
            { t: "Built with, not for", b: "Anything we build is designed with the clinicians, advocates and patients who would use it — not delivered to them afterwards." },
          ].map((c, i) => (
            <Reveal key={c.t} delay={i * 0.08}>
              <div className="border-t border-[var(--color-border-default)] pt-5">
                <h2 className="font-display text-[1.5rem] leading-heading text-[var(--color-text-display)]">{c.t}</h2>
                <p className="mt-3 text-body leading-body text-[var(--color-text-secondary)]">{c.b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <ApplyPanel
        title="We are looking for collaborators"
        body="Engineers, data scientists, clinicians, designers and researchers who want to work on cancer problems in low-resource settings. Tell us what you can build and what you would want to work on."
        subject="UgwuMind collaboration"
        mailtoOnly
      />
    </>
  );
}
