import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader, adminLoading } from "@/components/admin/admin-header";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "Orders · Admin",
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
  await requireAdmin("/admin/orders");
  return (
    <AdminHeader title="Orders" eyebrow="Admin">
      <p className="text-sm text-muted">Order list. Coming in a later step.</p>
    </AdminHeader>
  );
}
