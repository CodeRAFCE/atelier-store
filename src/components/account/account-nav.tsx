"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";

// `segment` is the child of /account: null for the overview page.
const ITEMS = [
  { label: "Overview", href: "/account", segment: null },
  { label: "Orders", href: "/account/orders", segment: "orders" },
  { label: "Account details", href: "/account/details", segment: "details" },
] as const;

export function AccountNav() {
  const active = useSelectedLayoutSegment();

  return (
    <nav aria-label="Account">
      {/* Mobile: a scrollable tab row. Desktop: a vertical list. */}
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
        <li className="shrink-0 lg:pt-6">
          <SignOutButton className="text-label block py-4 text-muted transition-colors hover:text-foreground disabled:text-subtle lg:py-0" />
        </li>
      </ul>
    </nav>
  );
}
