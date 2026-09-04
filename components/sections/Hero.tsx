import { Button } from "@/components/ui/Button";
import { ik, localImage } from "@/lib/media/imagekit";
import { ORG } from "@/lib/org";

/**
 * Hero. Rebuilt from scratch — three flat layers, no tricks.
 *
 *   1. media   — background-image, cover. Not an <img>: object-fit:cover was
 *                letterboxing with bands down both sides even though its box
 *                measured full width. background-size:cover has never done that.
 *   2. scrim   — one vertical gradient. Nothing horizontal, so no edge can ever
 *                read as a margin.
 *   3. content — normal flow, inside .wrap.
 *
 * The section is a plain block element, so it is the full width of <main> with
 * no breakout hacks needed.
 *
 * Accepts an image OR a muted autoplay video, chosen in the CMS.
 */
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
  const asset = localImage(image);
  const src = ik(asset?.path ?? image, { w: 2560 });

  return (
    <>
      {/* A background-image is invisible to the preload scanner, so LCP needs this. */}
      {!videoUrl && <link rel="preload" as="image" href={src} fetchPriority="high" />}

      <section className="relative isolate flex min-h-[88svh] items-end overflow-hidden md:min-h-[94svh] ">
        {/* 1 · Media */}
        {videoUrl ? (
          <video
            className="absolute inset-0 -z-20 h-full w-full object-cover"
            poster={src}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={asset?.alt ?? ""}
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        ) : (
          <div
            className="absolute inset-0 -z-20"
            role="img"
            aria-label={asset?.alt ?? ""}
            style={{
              backgroundColor: "var(--color-violet-950)",
              backgroundImage: asset?.lqip ? `url("${src}"), url("${asset.lqip}")` : `url("${src}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
        )}

        {/* 2 · Scrim — vertical only. Reaches high enough to carry the headline. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(to top, rgba(23,11,48,.88) 0%, rgba(23,11,48,.78) 22%, rgba(23,11,48,.58) 44%, rgba(23,11,48,.28) 66%, rgba(23,11,48,0) 88%)",
          }}
        />

        {/* 3 · Content */}
        <div className="wrap relative w-full pb-16 pt-32 md:pb-24 md:pt-40">
          {/* The tagline sits high in the hero, where the scrim has already
              faded out, so small mono text at 80% white had nothing to hold on
              to. Given its own translucent bar it reads at any brightness and
              never depends on what the CMS puts behind it. */}
          {eyebrow && (
            <p className="mb-7 inline-flex rounded-pill border border-white/20 bg-[rgba(23,11,48,.42)] px-4 py-2 font-mono text-[0.72rem] font-medium uppercase leading-none tracking-[0.08em] text-white backdrop-blur-[6px]">
              {eyebrow}
            </p>
          )}

          <h1 className="max-w-[19ch] font-display text-[clamp(2.75rem,1.54rem+4.95vw,6rem)] leading-[.95] tracking-tighter text-white">
            {headline}
          </h1>

          <p className="mt-7 max-w-[46ch] text-body-l leading-lede text-white/90">
            {lede}
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Button href="/get-involved" size="lg" arrow>Join the movement</Button>
            <Button href="/donate" variant="on-inverse" size="lg" arrow>Donate</Button>
          </div>

          <p className="mono mt-10 !text-white/70">{ORG.countries.join(" · ")}</p>
        </div>
      </section>
    </>
  );
}
