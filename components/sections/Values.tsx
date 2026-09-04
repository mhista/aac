import { Reveal } from "@/components/motion/Reveal";
import { ORG } from "@/lib/org";

export function Values() {
  return (
    <section className="section bg-[var(--color-surface-inverse)] text-[var(--color-text-on-inverse)]">
      <div className="wrap">
        <Reveal>
          <p className="mono mb-4 !text-[var(--color-violet-300)]">What we stand for</p>
          <h2 className="max-w-[16ch] font-display text-[clamp(2.125rem,1.43rem+2.86vw,4rem)] leading-display tracking-tighter text-white">
            Eight commitments we can be held to
          </h2>
        </Reveal>

        <dl className="mt-16 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {ORG.values.map((v, i) => (
            <Reveal key={v.name} delay={(i % 4) * 0.07}>
              <div className="border-t border-[var(--color-border-inverse)] pt-5">
                <dt className="font-display text-[1.5rem] text-white">{v.name}</dt>
                <dd className="mt-2.5 text-caption leading-body text-[var(--color-violet-200)]">{v.note}</dd>
              </div>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}
