import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { requireAuthSecret } from "./auth-secret";

export const auth = betterAuth({
  // Passed explicitly so Better Auth never falls back to its public default.
  secret: requireAuthSecret(),
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
});
