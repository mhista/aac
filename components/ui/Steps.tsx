import { Reveal } from "@/components/motion/Reveal";

/** Numbered "how it works" list. Used across every get-involved route. */
export function Steps({ heading, steps }: { heading?: string; steps: { title: string; body: string }[] }) {
  return (
    <section className="section bg-[var(--color-surface-page-alt)]">
      <div className="wrap">
        {heading && (
          <Reveal>
            <h2 className="display max-w-[16ch] text-[clamp(1.75rem,1.3rem+1.9vw,2.75rem)]">{heading}</h2>
          </Reveal>
        )}
        <ol className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={(i % 3) * 0.07}>
              <li className="border-t border-[var(--color-border-default)] pt-5">
                <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 font-display text-[1.4rem] leading-heading text-[var(--color-text-display)]">{s.title}</h3>
                <p className="mt-2 text-caption leading-body text-[var(--color-text-secondary)]">{s.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
