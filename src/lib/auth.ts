import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as authSchema from "@/db/auth-schema";
import { requireAuthSecret } from "./auth-secret";

export const auth = betterAuth({
  // Passed explicitly so Better Auth never falls back to its public default.
  secret: requireAuthSecret(),
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  emailAndPassword: { enabled: true, minPasswordLength: 8, autoSignIn: true },
  user: {
    additionalFields: {
      // `input: false`: sign-up and update-user can't set it. Promote with
      // `npm run auth:set-role`.
      role: {
        type: ["customer", "admin"],
        required: false,
        defaultValue: "customer",
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // slide the expiry at most once a day
    // No cookieCache: every check hits the DB, so sign-out and role changes
    // apply on the next request.
  },
});

export type Session = typeof auth.$Infer.Session;
export type SessionUser = Session["user"];
