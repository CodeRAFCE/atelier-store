"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <p role="status" className="text-sm text-muted">
        Thank you. You&apos;ll hear from us soon.
      </p>
    );
  }

  return (
    <form
      className="flex w-full flex-col gap-4 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
    >
      <label className="flex-1">
        <span className="sr-only">Email address</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="Email address"
          className="field"
        />
      </label>
      <button type="submit" className="btn btn-primary">
        Subscribe
      </button>
    </form>
  );
}
