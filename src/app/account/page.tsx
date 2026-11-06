import type { Metadata } from "next";
import { Suspense } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <section className="container-prose py-16 md:py-24">
      <header className="stack gap-3 hairline-b pb-8">
        <p className="text-label text-muted">Account</p>
        <h1 className="text-4xl md:text-5xl">Your account</h1>
      </header>
      <Suspense fallback={<p className="pt-8 text-sm text-muted">Loading…</p>}>
        <AccountDetails />
      </Suspense>
    </section>
  );
}

async function AccountDetails() {
  const user = await requireUser("/account");
  const memberSince = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(user.createdAt);

  return (
    <div className="stack gap-10 pt-8">
      <dl className="stack gap-6">
        <div className="stack gap-1">
          <dt className="text-label text-muted">Name</dt>
          <dd>{user.name}</dd>
        </div>
        <div className="stack gap-1">
          <dt className="text-label text-muted">Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div className="stack gap-1">
          <dt className="text-label text-muted">Member since</dt>
          <dd>{memberSince}</dd>
        </div>
      </dl>
      <div>
        <SignOutButton />
      </div>
    </div>
  );
}
