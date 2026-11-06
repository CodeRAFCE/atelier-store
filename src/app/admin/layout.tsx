import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";

// Navigation only, not an access check. Every page under /admin and every
// admin Server Action must call requireAdmin() itself: a layout doesn't re-run
// on client navigation between sibling pages.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="container-content py-12 md:py-20">
      <div className="grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16 xl:gap-24">
        <aside className="stack gap-6">
          <p className="text-label text-muted">Store admin</p>
          <Suspense fallback={<div className="h-14" aria-hidden />}>
            <AdminNav />
          </Suspense>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
