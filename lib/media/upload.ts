"use client";

/**
 * Browser → ImageKit upload.
 *
 * Written for the actual user: a campus coordinator, on a phone, on a slow
 * connection, who has never heard of ImageKit and should never have to. They
 * pick photos from their camera roll; everything below is invisible.
 *
 * Two decisions worth stating:
 *
 * · Compression happens on the device, before the bytes go anywhere. A modern
 *   phone photo is 4–12MB and almost none of that survives being displayed at
 *   1600px wide. Shrinking first turns a two-minute upload into ten seconds on
 *   a 3G connection. It is offered as a choice, not forced, because a
 *   photograph destined for print needs its original pixels.
 *
 * · Uploads run through XMLHttpRequest rather than fetch, purely because fetch
 *   still cannot report upload progress. On a slow connection a progress bar
 *   is the difference between waiting and force-quitting the tab.
 */

const ENDPOINT = "https://upload.imagekit.io/api/v1/files/upload";

export interface UploadResult {
  url: string;
  fileId: string;
  name: string;
  width?: number;
  height?: number;
  size: number;
  fileType: string;
  thumbnailUrl?: string;
}

export const MAX_BYTES = {
  image: 25 * 1024 * 1024,
  video: 300 * 1024 * 1024,
};

export function isVideo(file: File) {
  return file.type.startsWith("video/");
}

export function prettyBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Downscale and re-encode an image on the device.
 *
 * Long edge capped at 2200px — comfortably more than the largest slot on the
 * site (a full-bleed hero at 2x) and far less than a 12MP phone sensor.
 * Returns the original untouched if it is already small, or if anything goes
 * wrong: a failed compression must never block an upload.
 */
export async function compressImage(file: File, maxEdge = 2200, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  /* Nothing to gain, and re-encoding would only lose detail. */
  if (file.size < 400 * 1024) return file;
  /* Canvas rasterises these badly or not at all. */
  if (/svg|gif/i.test(file.type)) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", quality)
    );
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

/** Strip characters that make a filename awkward in a URL. */
function safeName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\- ]/g, "")
    .replace(/\s+/g, "-")
    .slice(-80);
}

/**
 * Upload one file, reporting progress 0–100.
 *
 * `folder` keeps the media library tidy — event photographs land under
 * /events, portraits under /team — which matters once there are thousands.
 */
export async function uploadFile(
  file: File,
  opts: {
    folder?: string;
    onProgress?: (pct: number) => void;
    signal?: AbortSignal;
  } = {}
): Promise<UploadResult> {
  const limit = isVideo(file) ? MAX_BYTES.video : MAX_BYTES.image;
  if (file.size > limit) {
    throw new Error(
      `That file is ${prettyBytes(file.size)}. The limit is ${prettyBytes(limit)} — try compressing it, or trim the video first.`
    );
  }

  const authRes = await fetch("/api/upload/auth", { cache: "no-store" });
  if (!authRes.ok) {
    const body = await authRes.json().catch(() => ({}));
    throw new Error(body.error ?? "Could not start the upload. Try signing in again.");
  }
  const { token, expire, signature, publicKey } = await authRes.json();

  const form = new FormData();
  form.append("file", file);
  form.append("fileName", safeName(file.name) || "upload");
  form.append("publicKey", publicKey);
  form.append("signature", signature);
  form.append("expire", String(expire));
  form.append("token", token);
  form.append("useUniqueFileName", "true");
  if (opts.folder) form.append("folder", opts.folder);

  return new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", ENDPOINT, true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      let body: any = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* fall through to the status check */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.url) {
        opts.onProgress?.(100);
        resolve({
          url: body.url,
          fileId: body.fileId,
          name: body.name,
          width: body.width,
          height: body.height,
          size: body.size ?? file.size,
          fileType: body.fileType ?? file.type,
          thumbnailUrl: body.thumbnailUrl,
        });
      } else {
        reject(new Error(body?.message ?? `Upload failed (${xhr.status}).`));
      }
    };

    xhr.onerror = () => reject(new Error("The connection dropped during upload."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));

    opts.signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(form);
  });
}
