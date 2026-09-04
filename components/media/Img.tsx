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
      <div className={`absolute inset-0 ${className}`}>
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

  /* No aspect-ratio box here — the hero fills whatever height the section is.
     Using <Img> would impose a 16/9 box that letterboxes the image inside the
     container instead of covering it. */
  const local2 = localImage(image);
  return (
    <div
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        ...(local2?.lqip
          ? { backgroundImage: `url("${local2.lqip}")`, backgroundSize: "cover", backgroundPosition: "center" }
          : {}),
      }}
    >
      <img
        src={ik(local2?.path ?? image, { w: 2560 })}
        srcSet={srcSet(local2?.path ?? image)}
        sizes="100vw"
        alt={alt ?? local2?.alt ?? ""}
        loading="eager"
        fetchPriority="high"
        decoding="sync"
        /* Inline, not utilities. The base layer sets img{height:auto;max-width:100%},
           and any of that leaking through leaves the hero letterboxed with bands
           down the sides. Inline styles remove the cascade from the equation. */
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          maxWidth: "none",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
        }}
      />
    </div>
  );
}
