// Server-only data access layer for auth. Every server-side access check goes
// through these helpers; the proxy's cookie check is only an optimistic redirect.
// Callers read request headers, so they must render behind <Suspense>.
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

/** The current session, or null. Deduplicated per request. */
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

/** The signed-in user, or a redirect to sign-in that returns to `next`. */
export async function requireUser(next?: string) {
  const session = await getSession();
  if (!session) {
    redirect(next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in");
  }
  return session.user;
}

/** The signed-in admin. Non-admins get a 404 so admin routes aren't disclosed. */
export async function requireAdmin(next = "/admin") {
  const user = await requireUser(next);
  if (user.role !== "admin") notFound();
  return user;
}
