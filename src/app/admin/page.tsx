import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false },
};

// Every admin page must call requireAdmin() itself: a layout-level check
// doesn't re-run on client navigation between sibling pages.
export default function AdminPage() {
  return (
    <section className="container-content py-16 md:py-24">
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <AdminHome />
      </Suspense>
    </section>
  );
}

async function AdminHome() {
  const admin = await requireAdmin("/admin");
  return (
    <header className="stack gap-3 hairline-b pb-8">
      <p className="text-label text-muted">Admin</p>
      <h1 className="text-4xl md:text-5xl">Store admin</h1>
      <p className="text-sm text-muted">Signed in as {admin.email}.</p>
    </header>
  );
}
