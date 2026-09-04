import { Img } from "@/components/media/Img";
import { Reveal } from "@/components/motion/Reveal";

/**
 * The statement block — an oversized serif paragraph with images set inline in
 * the text flow. The most distinctive moment on the page.
 *
 * Everything inside the <p> must be a genuinely inline element. A <div> inside
 * a <p> is invalid HTML: the browser silently closes the paragraph and reparents
 * the div, so the server and client trees diverge and hydration fails. Hence
 * `as="span"` on every Img here, and spans (never divs) for the wrappers.
 *
 * Numbers are passed in from real impact figures — never hardcoded.
 */
export function Statement({ advocates, campuses }: { advocates: string; campuses: string }) {
  return (
    <section className="section">
      <div className="wrap">
        <Reveal>
          <p className="font-display text-[clamp(1.6rem,1.05rem+2.3vw,3rem)] leading-[1.35] tracking-tight text-[var(--color-text-display)]">
            All Against Cancer is building a bridge between hope and evidence.
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/aac-icon-96.png"
              alt=""
              width={52}
              height={52}
              className="mx-3 inline-block h-[1.15em] w-[1.15em] translate-y-[.18em] rounded-md align-baseline"
            />
            Today,
            <span className="mx-2 inline-flex translate-y-[.16em] -space-x-3 align-baseline">
              {["portrait-man-laughing", "portrait-woman-earrings", "portrait-man-red"].map((k) => (
                <Img
                  key={k}
                  as="span"
                  src={k}
                  ratio="1/1"
                  sizes="60px"
                  className="h-[1.15em] w-[1.15em] rounded-full ring-2 ring-[var(--color-surface-page)]"
                />
              ))}
            </span>
            <strong className="font-normal text-[var(--color-text-emphasis)]">{advocates} advocates</strong> across{" "}
            <strong className="font-normal text-[var(--color-text-emphasis)]">{campuses} campuses</strong> are turning
            awareness into action for the communities cancer reaches last.
            <Img
              as="span"
              src="youth-students-walking"
              ratio="16/10"
              sizes="140px"
              className="ml-3 h-[1.4em] w-[2.4em] translate-y-[.2em] rounded-md align-baseline"
            />
          </p>
        </Reveal>
      </div>
    </section>
  );
}
