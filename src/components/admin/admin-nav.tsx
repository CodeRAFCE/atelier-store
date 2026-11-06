"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

// `segment` is the child of /admin: null for the overview page.
const ITEMS = [
  { label: "Overview", href: "/admin", segment: null },
  { label: "Products", href: "/admin/products", segment: "products" },
  { label: "Stock", href: "/admin/stock", segment: "stock" },
  { label: "Categories", href: "/admin/categories", segment: "categories" },
  { label: "Orders", href: "/admin/orders", segment: "orders" },
] as const;

export function AdminNav() {
  const active = useSelectedLayoutSegment();

  return (
    <nav aria-label="Admin">
      <ul className="scrollbar-none -mx-gutter flex gap-8 overflow-x-auto px-gutter hairline-b lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:px-0 lg:border-b-0">
        {ITEMS.map((item) => {
          const current = item.segment === active;
          return (
            <li key={item.href} className="shrink-0 lg:hairline-b">
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={`text-label -mb-px block border-b py-4 transition-colors lg:mb-0 lg:border-b-0 ${
                  current
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
