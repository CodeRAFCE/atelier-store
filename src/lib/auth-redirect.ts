export const DEFAULT_AFTER_AUTH = "/account";

const BASE = "http://local.invalid";

/**
 * Returns `next` only if it resolves to a same-origin path, so `?next=` can't be
 * used as an open redirect (`//evil.com`, `/\evil.com`, `/\t/evil.com`, `https://…`).
 */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/")) return DEFAULT_AFTER_AUTH;
  try {
    // Resolve the way a browser would (it strips tabs/newlines and treats `\` as `/`).
    const url = new URL(next, BASE);
    if (url.origin !== BASE) return DEFAULT_AFTER_AUTH;
    return url.pathname + url.search + url.hash;
  } catch {
    return DEFAULT_AFTER_AUTH;
  }
}
