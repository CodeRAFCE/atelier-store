"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { safeNext } from "@/lib/auth-redirect";

type Mode = "sign-in" | "sign-up";

const COPY = {
  "sign-in": {
    submit: "Sign in",
    pending: "Signing in…",
    switchPrompt: "New to the store?",
    switchLabel: "Create an account",
    switchHref: "/sign-up",
  },
  "sign-up": {
    submit: "Create account",
    pending: "Creating account…",
    switchPrompt: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/sign-in",
  },
} as const;

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const copy = COPY[mode];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    setPending(true);
    setError(null);
    const { error } =
      mode === "sign-up"
        ? await authClient.signUp.email({
            name: String(form.get("name") ?? "").trim(),
            email,
            password,
          })
        : await authClient.signIn.email({ email, password });

    if (error) {
      setError(error.message ?? "Something went wrong. Please try again.");
      setPending(false);
      return;
    }
    router.replace(safeNext(next));
    router.refresh();
  }

  const switchHref = next
    ? `${copy.switchHref}?next=${encodeURIComponent(next)}`
    : copy.switchHref;

  return (
    <form onSubmit={onSubmit} className="stack gap-8">
      {mode === "sign-up" && (
        <label className="stack gap-2">
          <span className="text-label">Name</span>
          <input name="name" required autoComplete="name" className="field" />
        </label>
      )}
      <label className="stack gap-2">
        <span className="text-label">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="field"
          aria-invalid={error ? true : undefined}
        />
      </label>
      <label className="stack gap-2">
        <span className="text-label">Password</span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          className="field"
          aria-invalid={error ? true : undefined}
          aria-describedby={mode === "sign-up" ? "password-hint" : undefined}
        />
        {mode === "sign-up" && (
          <span id="password-hint" className="text-xs text-muted">
            At least 8 characters.
          </span>
        )}
      </label>

      <p role="alert" className="min-h-5 text-sm text-error">
        {error}
      </p>

      <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
        {pending ? copy.pending : copy.submit}
      </button>

      <p className="text-sm text-muted">
        {copy.switchPrompt}{" "}
        <Link href={switchHref} className="link text-foreground">
          {copy.switchLabel}
        </Link>
      </p>
    </form>
  );
}
