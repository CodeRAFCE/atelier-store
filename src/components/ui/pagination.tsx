import Link from "next/link";
import { pageHref } from "@/lib/pagination";

/**
 * Previous / Next pager for any server-rendered list. Pass the route's path and
 * the query params to keep (e.g. `{ filter }`); `page` is managed here.
 * Renders nothing when everything fits on one page.
 */
export function Pagination({
  basePath,
  params = {},
  page,
  totalPages,
  totalItems,
  pageSize,
  label = "Pagination",
}: {
  basePath: string;
  params?: Record<string, string | undefined>;
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  label?: string;
}) {
  if (totalPages <= 1) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalItems);

  return (
    <nav
      aria-label={label}
      className="flex flex-wrap items-center justify-between gap-4 text-sm"
    >
      <p className="text-muted" aria-live="polite">
        {first}–{last} of {totalItems} · Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={pageHref(basePath, params, page - 1)}
            className="btn btn-secondary"
            rel="prev"
          >
            Previous
          </Link>
        ) : (
          <span className="btn btn-secondary" aria-disabled="true" style={{ opacity: 0.4 }}>
            Previous
          </span>
        )}
        {page < totalPages ? (
          <Link
            href={pageHref(basePath, params, page + 1)}
            className="btn btn-secondary"
            rel="next"
          >
            Next
          </Link>
        ) : (
          <span className="btn btn-secondary" aria-disabled="true" style={{ opacity: 0.4 }}>
            Next
          </span>
        )}
      </div>
    </nav>
  );
}
