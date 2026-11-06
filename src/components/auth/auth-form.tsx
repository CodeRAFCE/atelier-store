"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { safeNext } from "@/lib/auth-redirect";

type Mode = "sign-in" | "sign-up";
type FieldName = "name" | "email" | "password";
type Values = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, string>>;

// Keep in step with src/lib/auth.ts (minPasswordLength) and Better Auth's default max.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function fieldsFor(mode: Mode): FieldName[] {
  return mode === "sign-up" ? ["name", "email", "password"] : ["email", "password"];
}

function validate(mode: Mode, v: Values): Errors {
  const errors: Errors = {};
  if (mode === "sign-up" && !v.name.trim()) errors.name = "Enter your name.";

  const email = v.email.trim();
  if (!email) errors.email = "Enter your email address.";
  else if (!EMAIL_PATTERN.test(email))
    errors.email = "Enter a valid email address, like name@example.com.";

  if (!v.password) errors.password = "Enter your password.";
  else if (mode === "sign-up" && v.password.length < PASSWORD_MIN)
    errors.password = `Use at least ${PASSWORD_MIN} characters.`;
  else if (v.password.length > PASSWORD_MAX)
    errors.password = `Use ${PASSWORD_MAX} characters or fewer.`;

  return errors;
}

type ServerError = { code?: string; status?: number; message?: string };

/** Turns a Better Auth error into a field error or a form-level message. */
function describeServerError(err: ServerError): { field?: Errors; form?: string } {
  if (err.status === 429)
    return { form: "Too many attempts. Please wait a minute and try again." };
  switch (err.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return { form: "That email and password don't match. Check them and try again." };
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return { field: { email: "An account with this email already exists." } };
    case "INVALID_EMAIL":
      return { field: { email: "Enter a valid email address, like name@example.com." } };
    case "PASSWORD_TOO_SHORT":
      return { field: { password: `Use at least ${PASSWORD_MIN} characters.` } };
    case "PASSWORD_TOO_LONG":
      return { field: { password: `Use ${PASSWORD_MAX} characters or fewer.` } };
    default:
      return { form: "Something went wrong on our side. Please try again." };
  }
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const copy = COPY[mode];
  const fields = fieldsFor(mode);

  const [values, setValues] = useState<Values>({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const inputs = useRef<Partial<Record<FieldName, HTMLInputElement | null>>>({});
  const alertRef = useRef<HTMLDivElement>(null);

  function update(name: FieldName, value: string) {
    const nextValues = { ...values, [name]: value };
    setValues(nextValues);
    // Once a field has been left (or the form submitted), re-check it as the user types
    // so the message clears as soon as it's fixed.
    if (touched[name]) {
      setErrors((prev) => ({ ...prev, [name]: validate(mode, nextValues)[name] }));
    }
  }

  function blur(name: FieldName) {
    // Don't nag about an empty field the user just tabbed through.
    if (!values[name] && !touched[name]) return;
    setTouched((t) => ({ ...t, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validate(mode, values)[name] }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    const found = validate(mode, values);
    setTouched(Object.fromEntries(fields.map((f) => [f, true])));
    setErrors(found);
    setFormError(null);
    const firstInvalid = fields.find((f) => found[f]);
    if (firstInvalid) {
      inputs.current[firstInvalid]?.focus();
      return;
    }

    setPending(true);
    const email = values.email.trim();
    let error: ServerError | null = null;
    try {
      const res =
        mode === "sign-up"
          ? await authClient.signUp.email({ name: values.name.trim(), email, password: values.password })
          : await authClient.signIn.email({ email, password: values.password });
      error = res.error;
    } catch {
      setFormError("We couldn't reach the store. Check your connection and try again.");
      setPending(false);
      requestAnimationFrame(() => alertRef.current?.focus());
      return;
    }

    if (error) {
      const { field, form } = describeServerError(error);
      setPending(false);
      if (field) {
        setErrors(field);
        const f = fields.find((name) => field[name]);
        if (f) requestAnimationFrame(() => inputs.current[f]?.focus());
      }
      if (form) {
        setFormError(form);
        requestAnimationFrame(() => alertRef.current?.focus());
      }
      return;
    }

    // Stay in the pending state while we navigate away.
    router.replace(safeNext(next));
    router.refresh();
  }

  const withNext = (href: string) =>
    next ? `${href}?next=${encodeURIComponent(next)}` : href;

  const visible = (name: FieldName) => (touched[name] ? errors[name] : undefined);

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={pending} className="stack gap-8">
      <div
        ref={alertRef}
        tabIndex={-1}
        role="alert"
        className={formError ? "border-l-2 border-error py-1 pl-4 text-sm text-error outline-none" : "sr-only"}
      >
        {formError}
      </div>

      {/* A disabled fieldset locks every input while the request is in flight. */}
      <fieldset disabled={pending} className="stack gap-8">
        {mode === "sign-up" && (
          <Field
            label="Name"
            error={visible("name")}
            input={{
              name: "name",
              autoComplete: "name",
              value: values.name,
              maxLength: 100,
            }}
            inputRef={(el) => (inputs.current.name = el)}
            onChange={(v) => update("name", v)}
            onBlur={() => blur("name")}
          />
        )}

        <Field
          label="Email"
          error={visible("email")}
          errorAction={
            errors.email?.startsWith("An account") ? (
              <Link href={withNext("/sign-in")} className="link">
                Sign in instead
              </Link>
            ) : null
          }
          input={{
            name: "email",
            type: "email",
            inputMode: "email",
            autoComplete: "email",
            autoCapitalize: "none",
            spellCheck: false,
            value: values.email,
          }}
          inputRef={(el) => (inputs.current.email = el)}
          onChange={(v) => update("email", v)}
          onBlur={() => blur("email")}
        />

        <Field
          label="Password"
          error={visible("password")}
          hint={mode === "sign-up" ? `At least ${PASSWORD_MIN} characters.` : undefined}
          input={{
            name: "password",
            type: showPassword ? "text" : "password",
            autoComplete: mode === "sign-up" ? "new-password" : "current-password",
            value: values.password,
            className: "pr-16",
          }}
          inputRef={(el) => (inputs.current.password = el)}
          onChange={(v) => update("password", v)}
          onBlur={() => blur("password")}
          adornment={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="text-label absolute inset-y-0 right-0 px-1 text-muted transition-colors hover:text-foreground"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          }
        />
      </fieldset>

      <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
        {pending ? copy.pending : copy.submit}
      </button>

      <p className="text-center text-sm text-muted">
        {copy.switchPrompt}{" "}
        <Link href={withNext(copy.switchHref)} className="link text-foreground">
          {copy.switchLabel}
        </Link>
      </p>
    </form>
  );
}

export function Field({
  label,
  hint,
  error,
  errorAction,
  input,
  inputRef,
  onChange,
  onBlur,
  adornment,
}: {
  label: string;
  hint?: string;
  error?: string;
  errorAction?: React.ReactNode;
  input: React.InputHTMLAttributes<HTMLInputElement> & { name: string; value: string };
  inputRef: (el: HTMLInputElement | null) => void;
  onChange: (value: string) => void;
  onBlur: () => void;
  adornment?: React.ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error && errorId, hint && !error && hintId].filter(Boolean).join(" ") || undefined;
  const { className, ...rest } = input;

  return (
    <div className="stack gap-2">
      <label htmlFor={id} className="text-label">
        {label}
      </label>
      <div className="relative">
        <input
          {...rest}
          id={id}
          ref={inputRef}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={`field disabled:text-muted ${className ?? ""}`}
        />
        {adornment}
      </div>
      {error && (
        <p id={errorId} className="text-xs text-error">
          {error}
          {errorAction && <> {errorAction}</>}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
