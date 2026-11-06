"use client";

import { useId, useRef, useState } from "react";
import { Field, PASSWORD_MAX, PASSWORD_MIN } from "@/components/auth/auth-form";
import { authClient } from "@/lib/auth-client";
import { FormStatus, type Status } from "./form-status";

type FieldName = "current" | "next";
type Errors = Partial<Record<FieldName, string>>;

function validate(current: string, next: string): Errors {
  const errors: Errors = {};
  if (!current) errors.current = "Enter your current password.";
  if (!next) errors.next = "Enter a new password.";
  else if (next.length < PASSWORD_MIN) errors.next = `Use at least ${PASSWORD_MIN} characters.`;
  else if (next.length > PASSWORD_MAX) errors.next = `Use ${PASSWORD_MAX} characters or fewer.`;
  else if (next === current) errors.next = "Choose a password you aren't using now.";
  return errors;
}

export function PasswordForm() {
  const [values, setValues] = useState<Record<FieldName, string>>({ current: "", next: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [revokeOthers, setRevokeOthers] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState(false);
  const inputs = useRef<Partial<Record<FieldName, HTMLInputElement | null>>>({});
  const statusRef = useRef<HTMLDivElement>(null);
  const checkboxId = useId();

  function update(name: FieldName, value: string) {
    const next = { ...values, [name]: value };
    setValues(next);
    setStatus(null);
    // After a submit attempt, re-check as the user types so errors clear once fixed.
    if (submitted) setErrors(validate(next.current, next.next));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    const found = validate(values.current, values.next);
    setSubmitted(true);
    setErrors(found);
    setStatus(null);
    const firstInvalid = (["current", "next"] as const).find((f) => found[f]);
    if (firstInvalid) {
      inputs.current[firstInvalid]?.focus();
      return;
    }

    setPending(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword: values.current,
        newPassword: values.next,
        revokeOtherSessions: revokeOthers,
      });
      if (error?.code === "INVALID_PASSWORD") {
        setErrors({ current: "That password is incorrect." });
        setPending(false);
        requestAnimationFrame(() => inputs.current.current?.focus());
        return;
      }
      if (error) {
        setStatus({
          tone: "error",
          message:
            error.status === 429
              ? "Too many attempts. Please wait a minute and try again."
              : "We couldn't change your password. Please try again.",
        });
      } else {
        setValues({ current: "", next: "" });
        setErrors({});
        setSubmitted(false);
        setShowPassword(false);
        setStatus({
          tone: "success",
          message: revokeOthers
            ? "Your password has been changed and your other devices have been signed out."
            : "Your password has been changed.",
        });
      }
    } catch {
      setStatus({ tone: "error", message: "We couldn't reach the store. Check your connection and try again." });
    }
    setPending(false);
    requestAnimationFrame(() => statusRef.current?.focus());
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={pending} className="stack gap-8">
      <FormStatus status={status} ref={statusRef} />

      <fieldset disabled={pending} className="stack gap-8">
        <Field
          label="Current password"
          error={errors.current}
          input={{
            name: "current-password",
            type: "password",
            autoComplete: "current-password",
            value: values.current,
          }}
          inputRef={(el) => (inputs.current.current = el)}
          onChange={(v) => update("current", v)}
          onBlur={() => {}}
        />

        <Field
          label="New password"
          error={errors.next}
          hint={`At least ${PASSWORD_MIN} characters.`}
          input={{
            name: "new-password",
            type: showPassword ? "text" : "password",
            autoComplete: "new-password",
            value: values.next,
            className: "pr-16",
          }}
          inputRef={(el) => (inputs.current.next = el)}
          onChange={(v) => update("next", v)}
          onBlur={() => {}}
          adornment={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Hide new password" : "Show new password"}
              className="text-label absolute inset-y-0 right-0 px-1 text-muted transition-colors hover:text-foreground"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          }
        />

        <div className="flex items-start gap-3">
          <input
            id={checkboxId}
            type="checkbox"
            checked={revokeOthers}
            onChange={(e) => setRevokeOthers(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-foreground"
          />
          <label htmlFor={checkboxId} className="text-sm">
            Sign out of all other devices
          </label>
        </div>
      </fieldset>

      <button type="submit" className="btn btn-primary self-start" disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
