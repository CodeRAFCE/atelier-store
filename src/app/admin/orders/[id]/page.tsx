import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader, adminLoading } from "@/components/admin/admin-header";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "Order · Admin",
  robots: { index: false },
};

export default function Page({ params }: PageProps<"/admin/orders/[id]">) {
  return (
    <Suspense fallback={adminLoading}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Guard before anything else: the layout is not a security check.
  await requireAdmin(`/admin/orders/${id}`);
  return (
    <AdminHeader title="Order" eyebrow="Orders">
      <p className="text-sm text-muted">Order detail. Coming in a later step.</p>
    </AdminHeader>
  );
}
