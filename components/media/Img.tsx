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
