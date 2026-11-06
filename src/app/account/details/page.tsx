import type { Metadata } from "next";
import { Suspense } from "react";
import { PasswordForm } from "@/components/account/password-form";
import { ProfileForm } from "@/components/account/profile-form";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Account details",
  robots: { index: false },
};

export default function AccountDetailsPage() {
  return (
    <div className="stack gap-10">
      <header className="stack gap-3 hairline-b pb-8">
        <h1 className="text-4xl md:text-5xl">Account details</h1>
        <p className="text-sm text-muted">Update your name and password.</p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <AccountDetails />
      </Suspense>
    </div>
  );
}

async function AccountDetails() {
  const user = await requireUser("/account/details");

  return (
    <div className="stack max-w-md gap-16">
      <section aria-labelledby="personal-heading" className="stack gap-8">
        <h2 id="personal-heading" className="text-2xl md:text-3xl">
          Personal details
        </h2>
        <ProfileForm name={user.name} email={user.email} />
      </section>
      <section id="password" aria-labelledby="password-heading" className="stack gap-8 hairline-t pt-12">
        <h2 id="password-heading" className="text-2xl md:text-3xl">
          Password
        </h2>
        <PasswordForm />
      </section>
    </div>
  );
}
