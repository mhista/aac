import { HeroMedia } from "@/components/media/Img";
import { Button } from "@/components/ui/Button";
import { ORG } from "@/lib/org";

export function Hero({
  eyebrow,
  headline,
  lede,
  image = "hero-community-gathering",
  videoUrl,
}: {
  eyebrow?: string;
  headline: string;
  lede: string;
  image?: string;
  videoUrl?: string | null;
}) {
  return (
    /* Full-bleed breakout.
       Rather than trusting that no ancestor constrains the width, this forces
       the hero to span the viewport regardless: 100vw wide, pulled back by
       half the difference between its container and the viewport. If nothing
       is constraining it, the calc resolves to 0 and this is a no-op. Paired
       with overflow-x:clip on body so the scrollbar cannot cause overflow. */
    <section
      className="relative isolate flex min-h-[86svh] items-end overflow-hidden md:min-h-[92svh]"
      style={{ width: "100vw", marginLeft: "calc(50% - 50vw)", maxWidth: "none" }}
    >
      {/* Layer 1 — media, furthest back */}
      <HeroMedia image={image} videoUrl={videoUrl} alt="" className="z-0" />

      {/* Layer 2 — scrim, ABOVE the media.

          Vertical only. A horizontal (100deg) gradient runs its first stops
          across ~340px of a 1425px-wide hero, which paints a flat slab down
          the left edge — indistinguishable from a margin, and the reason this
          looked like the image was clipped. Because a bottom-up gradient is
          uniform across the width, no edge can read as a border.

          The content is bottom-anchored (items-end), so bottom-up is also
          where the legibility is actually needed. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(to top, rgba(30,11,69,.80) 0%, rgba(30,11,69,.62) 26%, rgba(30,11,69,.34) 48%, rgba(30,11,69,.12) 68%, rgba(30,11,69,0) 86%)",
        }}
      />

      {/* Layer 3 — content */}
      <div className="wrap relative z-[2] w-full pb-16 pt-32 md:pb-24 md:pt-40">
        {eyebrow && (
          <p className="mono mb-6 !text-[var(--color-violet-200)]">{eyebrow}</p>
        )}

        <h1 className="max-w-[20ch] font-display text-[clamp(2.75rem,1.54rem+4.95vw,6rem)] leading-[.95] tracking-tighter text-white [text-shadow:0_2px_24px_rgba(30,11,69,.45)]">
          {headline}
        </h1>

        <p className="mt-7 max-w-[46ch] text-body-l leading-lede text-[var(--color-violet-100)] [text-shadow:0_1px_12px_rgba(30,11,69,.5)]">
          {lede}
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <Button href="/get-involved" size="lg" arrow>Join the movement</Button>
          <Button href="/donate" variant="on-inverse" size="lg" arrow>Donate</Button>
        </div>

        <p className="mono mt-10 !text-[var(--color-violet-200)]">
          {ORG.countries.join(" · ")}
        </p>
      </div>
    </section>
  );
}
