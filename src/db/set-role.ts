// Usage: npm run auth:set-role -- <email> <customer|admin>
import { eq } from "drizzle-orm";
import { db } from "./index";
import { user } from "./schema";

const ROLES = ["customer", "admin"] as const;
type Role = (typeof ROLES)[number];

async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || !ROLES.includes(role as Role)) {
    console.error(`Usage: npm run auth:set-role -- <email> <${ROLES.join("|")}>`);
    process.exit(1);
  }

  const updated = await db
    .update(user)
    .set({ role })
    .where(eq(user.email, email.trim().toLowerCase()))
    .returning({ id: user.id });

  if (updated.length === 0) {
    console.error(`No user with email ${email}`);
    process.exit(1);
  }
  console.log(`${email} is now ${role}. Takes effect on their next request.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
