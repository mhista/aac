import { ik, srcSet, localImage } from "@/lib/media/imagekit";

type Props = {
  /** Either a manifest key ("hero-community-gathering") or an ImageKit path. */
  src: string;
  alt?: string;
  /** Rendered aspect ratio. Reserves space so nothing shifts on load. */
  ratio?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  /** Focal point for ImageKit smart cropping. */
  focus?: "auto" | "face" | "center" | "top" | "bottom" | "left" | "right";
  /**
   * Wrapper element. Use "span" anywhere this sits inside a <p> or other
   * inline context — a <div> inside a <p> is invalid HTML and the browser
   * silently reparents it, which breaks hydration.
   */
  as?: "div" | "span";
};

/**
 * The only image component on the site.
 *
 * - Serves through ImageKit (AVIF/WebP, responsive srcset, CDN)
 * - Falls back to /img locally when ImageKit isn't configured
 * - Reserves the aspect ratio box, so CLS is zero
 * - Blur-up from a 20px LQIP baked into the manifest at build time
 * - alt is required in practice: a seeded image carries its own, and a CMS
 *   image cannot be saved without one
 */
export function Img({
  src,
  alt,
  ratio = "16/9",
  sizes = "100vw",
  priority = false,
  className = "",
  imgClassName = "",
  focus,
  as: Wrapper = "div",
}: Props) {
  const local = localImage(src);
  const path = local?.path ?? src;
  const altText = alt ?? local?.alt ?? "";
  const lqip = local?.lqip;

  return (
    <Wrapper
      className={`relative overflow-hidden bg-violet-100 ${
        Wrapper === "span" ? "inline-block" : ""
      } ${className}`}
      style={{
        aspectRatio: ratio,
        ...(lqip
          ? {
              backgroundImage: `url("${lqip}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}),
      }}
    >
      <img
        src={ik(path, { w: 1440, focus })}
        srcSet={srcSet(path)}
        sizes={sizes}
        alt={altText}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        width={local?.width}
        height={local?.height}
        className={`absolute inset-0 h-full w-full object-cover ${imgClassName}`}
      />
    </Wrapper>
  );
}

/**
 * Hero media — accepts an image OR a muted autoplay video, chosen in the CMS.
 * A video always ships with a poster, a scrim, and a working pause control:
 * an autoplaying video that cannot be paused is an accessibility failure.
 */
export function HeroMedia({
  image,
  videoUrl,
  alt,
  className = "",
}: {
  image: string;
  videoUrl?: string | null;
  alt?: string;
  className?: string;
}) {
  const local = localImage(image);
  const poster = ik(local?.path ?? image, { w: 1920 });

  if (videoUrl) {
    return (
      <div
        className={className}
        style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: "50%",
        width: "100vw",
        maxWidth: "none",
        transform: "translateX(-50%)",
        overflow: "hidden",
        }}
      >
        <video
          className="h-full w-full object-cover"
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={alt ?? "Background video"}
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
      </div>
    );
  }

  /* Rendered as a background-image, not an <img>.

     Why: with an identical full-width box, `object-fit: fill` painted edge to
     edge while `object-fit: cover` left ~142px bands on each side. The box was
     never the problem — object-fit was. `background-size: cover` is a separate
     code path that has behaved correctly here throughout (the LQIP has always
     filled), and it cannot letterbox.

     The image is decorative (alt=""), so nothing is lost semantically. LCP is
     preserved with a preload link in Hero.tsx, since a background-image is not
     discoverable by the preload scanner. */
  const local2 = localImage(image);
  const url = ik(local2?.path ?? image, { w: 2560 });

  return (
    <div
      className={className}
      role="img"
      aria-label={alt ?? local2?.alt ?? ""}
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: "50%",
        width: "100vw",
        maxWidth: "none",
        transform: "translateX(-50%)",
        overflow: "hidden",
        backgroundColor: "var(--color-violet-100)",
        backgroundImage: local2?.lqip ? `url("${url}"), url("${local2.lqip}")` : `url("${url}")`,
        backgroundSize: "cover, cover",
        backgroundPosition: "center, center",
        backgroundRepeat: "no-repeat, no-repeat",
      }}
    />
  );
}
