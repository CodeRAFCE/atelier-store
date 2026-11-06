import { Suspense } from "react";
import { AuthForm } from "./auth-form";

export function AuthPage({
  mode,
  title,
}: {
  mode: "sign-in" | "sign-up";
  title: string;
}) {
  return (
    <section className="container-prose py-16 md:py-24">
      <div className="stack mx-auto max-w-sm gap-10">
        <header className="stack gap-3 text-center">
          <p className="text-label text-muted">Account</p>
          <h1 className="text-4xl md:text-5xl">{title}</h1>
        </header>
        {/* useSearchParams (for ?next=) needs a boundary under Cache Components. */}
        <Suspense>
          <AuthForm mode={mode} />
        </Suspense>
      </div>
    </section>
  );
}
