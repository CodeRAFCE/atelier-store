import { Suspense } from "react";
import { AccountNav } from "@/components/account/account-nav";

// Navigation only. Every page under /account must still call requireUser()
// itself: a layout doesn't re-run on client navigation between sibling pages.
export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <div className="container-content py-12 md:py-20">
      <div className="grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16 xl:gap-24">
        <aside className="stack gap-6">
          <p className="text-label text-muted">My account</p>
          {/* The nav reads the URL segment, which is dynamic under /orders/[id]. */}
          <Suspense fallback={<div className="h-14" aria-hidden />}>
            <AccountNav />
          </Suspense>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
