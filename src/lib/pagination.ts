// Reusable, framework-free pagination helpers. The page number lives in the URL
// (`?page=N`), so pages stay server-rendered, linkable and back-button friendly.

/** Default number of rows per page for admin list views. */
export const ADMIN_PAGE_SIZE = 5;

export type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

/** Reads `?page=` defensively: anything but a positive integer becomes 1. */
export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d{1,6}$/.test(raw)) return 1;
  return Math.max(1, Number(raw));
}

/** Slices one page out of a list, clamping out-of-range pages to the last one. */
export function paginate<T>(
  items: readonly T[],
  requestedPage: number,
  pageSize: number = ADMIN_PAGE_SIZE,
): Page<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    totalItems: items.length,
    totalPages,
  };
}

/**
 * Builds a URL for `page`, keeping the other query params (e.g. `filter`).
 * Page 1 drops the param so the first page keeps its clean URL.
 */
export function pageHref(
  basePath: string,
  params: Record<string, string | undefined>,
  page: number,
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && key !== "page") qs.set(key, value);
  }
  if (page > 1) qs.set("page", String(page));
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}
