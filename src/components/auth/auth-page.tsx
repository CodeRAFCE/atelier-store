import { Suspense } from "react";
import { AuthForm } from "./auth-form";

export function AuthPage({
  mode,
  title,
  intro,
}: {
  mode: "sign-in" | "sign-up";
  title: string;
  intro: string;
}) {
  return (
    <section className="container-prose py-16 md:py-24">
      <div className="stack mx-auto max-w-sm gap-10">
        <header className="stack gap-3 text-center">
          <p className="text-label text-muted">Account</p>
          <h1 className="text-4xl md:text-5xl">{title}</h1>
          <p className="text-sm text-muted">{intro}</p>
        </header>
        {/* useSearchParams (for ?next=) needs a boundary under Cache Components. */}
        <Suspense>
          <AuthForm mode={mode} />
        </Suspense>
      </div>
    </section>
  );
}
