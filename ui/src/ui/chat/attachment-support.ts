export const CHAT_ATTACHMENT_ACCEPT = "image/*";

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
 * didn't provide one. Falls back to image/png for common image formats.
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
