import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <AccountOverview />
    </Suspense>
  );
}

async function AccountOverview() {
  const user = await requireUser("/account");
  const firstName = user.name.trim().split(/\s+/)[0];
  const memberSince = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(user.createdAt);

  return (
    <div className="stack gap-10">
      <header className="stack gap-3 hairline-b pb-8">
        <h1 className="text-4xl md:text-5xl">Hello, {firstName}</h1>
        <p className="text-sm text-muted">
          Manage your personal details and how you sign in.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Personal details" href="/account/details" action="Edit details">
          <Detail label="Name" value={user.name} />
          <Detail label="Member since" value={memberSince} />
        </Panel>
        <Panel title="Sign-in & security" href="/account/details#password" action="Change password">
          <Detail label="Email" value={user.email} />
          <Detail label="Password" value="••••••••" />
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title,
  href,
  action,
  children,
}: {
  title: string;
  href: string;
  action: string;
  children: React.ReactNode;
}) {
  return (
    <section className="stack gap-6 hairline p-6 md:p-8">
      <h2 className="text-2xl md:text-3xl">{title}</h2>
      <dl className="stack flex-1 gap-5">{children}</dl>
      <Link href={href} className="text-label link self-start">
        {action}
      </Link>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="stack gap-1">
      <dt className="text-label text-muted">{label}</dt>
      <dd className="wrap-break-word">{value}</dd>
    </div>
  );
}
