import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeader, adminLoading } from "@/components/admin/admin-header";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false },
};

const LINKS = [
  { href: "/admin/products", label: "Products", note: "View, create and edit products." },
  { href: "/admin/stock", label: "Stock", note: "Current stock per size, and updates." },
  { href: "/admin/categories", label: "Categories", note: "Add, rename and remove categories." },
  { href: "/admin/orders", label: "Orders", note: "Every order, newest first." },
] as const;

export default function AdminPage() {
  return (
    <Suspense fallback={adminLoading}>
      <AdminHome />
    </Suspense>
  );
}

async function AdminHome() {
  const admin = await requireAdmin("/admin");
  return (
    <div className="stack gap-8">
      <AdminHeader title="Store admin">
        <p className="text-sm text-muted">Signed in as {admin.email}.</p>
      </AdminHeader>
      <ul className="hairline-t">
        {LINKS.map((l) => (
          <li key={l.href} className="hairline-b">
            <Link href={l.href} className="flex flex-wrap items-baseline justify-between gap-2 py-5">
              <span className="text-lg">{l.label}</span>
              <span className="text-sm text-muted">{l.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
