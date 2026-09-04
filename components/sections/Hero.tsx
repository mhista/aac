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
    <section className="relative isolate flex min-h-[86svh] items-end overflow-hidden md:min-h-[92svh]">
      {/* Layer 1 — media, furthest back */}
      <HeroMedia image={image} videoUrl={videoUrl} alt="" className="z-0" />

      {/* Layer 2 — scrim, ABOVE the media.
          Two stacked gradients: a diagonal wash that anchors the text column,
          plus a bottom-up fade so the lede and buttons stay readable over a
          bright foreground. Sized for the worst case — a pale sky and sunlit
          sand — because the CMS can swap this image for anything. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1]"
        style={{
          background: [
            // Anchors the text column, then releases so the photograph reads
            "linear-gradient(100deg, rgba(30,11,69,.74) 0%, rgba(30,11,69,.52) 26%, rgba(30,11,69,.18) 52%, rgba(30,11,69,.04) 78%, rgba(30,11,69,0) 100%)",
            // Light foot so the lede and buttons hold over a bright foreground
            "linear-gradient(to top, rgba(30,11,69,.52) 0%, rgba(30,11,69,.16) 30%, rgba(30,11,69,0) 55%)",
          ].join(","),
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
