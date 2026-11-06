"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Field } from "@/components/auth/auth-form";
import { authClient } from "@/lib/auth-client";
import { FormStatus, type Status } from "./form-status";

const NAME_MAX = 100;

function validateName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "Enter your name.";
  if (trimmed.length > NAME_MAX) return `Use ${NAME_MAX} characters or fewer.`;
}

export function ProfileForm({ name: savedName, email }: { name: string; email: string }) {
  const router = useRouter();
  const [name, setName] = useState(savedName);
  const [error, setError] = useState<string | undefined>();
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const unchanged = name.trim() === savedName;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || unchanged) return;

    const found = validateName(name);
    setError(found);
    setStatus(null);
    if (found) {
      inputRef.current?.focus();
      return;
    }

    setPending(true);
    try {
      const { error: err } = await authClient.updateUser({ name: name.trim() });
      if (err) {
        setStatus({
          tone: "error",
          message:
            err.status === 429
              ? "Too many attempts. Please wait a minute and try again."
              : "We couldn't save your details. Please try again.",
        });
      } else {
        setName(name.trim());
        setStatus({ tone: "success", message: "Your details have been saved." });
        router.refresh();
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
          label="Name"
          error={error}
          input={{ name: "name", autoComplete: "name", value: name, maxLength: NAME_MAX }}
          inputRef={(el) => {
            inputRef.current = el;
          }}
          onChange={(v) => {
            setName(v);
            setStatus(null);
            if (error) setError(validateName(v));
          }}
          onBlur={() => name !== savedName && setError(validateName(name))}
        />

        <div className="stack gap-2">
          <p className="text-label">Email</p>
          <p className="flex min-h-12 items-center break-all text-muted hairline-b">{email}</p>
          <p className="text-xs text-muted">You sign in with this address.</p>
        </div>
      </fieldset>

      <button type="submit" className="btn btn-primary self-start" disabled={pending || unchanged}>
        {pending ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}
