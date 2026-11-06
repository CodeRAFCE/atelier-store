import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader, adminLoading } from "@/components/admin/admin-header";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "Categories · Admin",
  robots: { index: false },
};

export default function Page() {
  return (
    <Suspense fallback={adminLoading}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await requireAdmin("/admin/categories");
  return (
    <AdminHeader title="Categories" eyebrow="Admin">
      <p className="text-sm text-muted">Category management. Coming in a later step.</p>
    </AdminHeader>
  );
}
