export const CHAT_ATTACHMENT_ACCEPT = "image/*";

/** Maximum dimension (width or height) for compressed images.
 *  Images larger than this are downscaled proportionally.
 */
export const ATTACHMENT_MAX_DIMENSION = 1600;

/** JPEG quality for compressed images (0.0 – 1.0). */
export const ATTACHMENT_JPEG_QUALITY = 0.8;

/** Maximum base64 data-URL size in bytes before compression is attempted (~4 MB). */
export const ATTACHMENT_MAX_BYTES = 4 * 1024 * 1024;

export function isSupportedChatAttachmentMimeType(mimeType: string | null | undefined): boolean {
  if (typeof mimeType === "string" && mimeType.startsWith("image/")) {
    return true;
  }
  // Some mobile browsers (iOS Safari) report empty or null MIME types for photos
  // from the library. Accept them — we'll detect the type from the data URL later.
  return mimeType === "" || mimeType == null;
}

/**
 * Infer MIME type from a data URL or file extension when the browser
 * didn't provide one. Falls back to image/jpeg for common image formats.
 */
export function inferMimeType(dataUrl: string, originalType?: string | null): string {
  if (originalType && originalType.startsWith("image/")) {
    return originalType;
  }
  // Try to extract MIME from the data URL itself
  const match = /^data:([^;]+);/.exec(dataUrl);
  if (match && match[1].startsWith("image/")) {
    return match[1];
  }
  // Default fallback — most photos from mobile libraries are JPEG or PNG
  return "image/jpeg";
}

/**
 * Compress an image data URL if it exceeds ATTACHMENT_MAX_BYTES.
 *
 * iPhone screenshots are PNG and can be 5–10 MB, which becomes 7–14 MB of
 * base64 text — too large for WebSocket over Tailscale.  This function
 * down-scales the image to ATTACHMENT_MAX_DIMENSION and re-encodes as JPEG
 * at ATTACHMENT_JPEG_QUALITY, bringing payloads down to ~200–800 KB.
 *
 * If the image is already small enough it is returned unchanged.
 */
export async function compressAttachmentIfNeeded(dataUrl: string): Promise<string> {
  // Quick check — if the data URL is already under the limit, skip compression
  if (dataUrl.length <= ATTACHMENT_MAX_BYTES) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;

        // Down-scale if either dimension exceeds the max
        if (width > ATTACHMENT_MAX_DIMENSION || height > ATTACHMENT_MAX_DIMENSION) {
          const scale = Math.min(ATTACHMENT_MAX_DIMENSION / width, ATTACHMENT_MAX_DIMENSION / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          // Canvas not available — return original
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Re-encode as JPEG (much smaller than PNG for photos/screenshots)
        const compressed = canvas.toDataURL("image/jpeg", ATTACHMENT_JPEG_QUALITY);
        resolve(compressed);
      } catch {
        // If anything goes wrong, fall back to the original
        resolve(dataUrl);
      }
    };
    img.onerror = () => {
      // Can't load the image — return original
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
}
