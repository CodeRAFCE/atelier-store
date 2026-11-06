/**
 * Hosts `next/image` may load from. `next.config.ts` builds `remotePatterns`
 * from this list and admin validation checks image URLs against it, so an
 * admin can never save a URL that makes `next/image` throw at render time.
 */
export const ALLOWED_IMAGE_HOSTS = ["images.unsplash.com"] as const;

export function isAllowedImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (ALLOWED_IMAGE_HOSTS as readonly string[]).includes(url.hostname)
    );
  } catch {
    return false;
  }
}
