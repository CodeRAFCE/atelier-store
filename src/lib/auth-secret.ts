// Better Auth only warns about short or low-entropy secrets, and outside
// production it silently falls back to a public default. A guessable secret
// lets attackers forge signed cookies and email-verification tokens, so refuse
// to start instead.

const MIN_LENGTH = 32;
/** Random base64/hex secrets easily clear this; "aaaa…" or "1212…" don't. */
const MIN_DISTINCT_CHARS = 10;
const PLACEHOLDER_PATTERNS = [
  /better-auth-secret/i, // Better Auth's built-in default
  /change[-_ ]?me/i,
  /example/i,
  /placeholder/i,
  /your[-_ ]?secret/i,
];

const HOW_TO_FIX =
  "Generate one with `npx @better-auth/cli secret` (or `openssl rand -base64 32`) " +
  "and set it in .env.local, or in your host's environment for deployments.";

function fail(reason: string): never {
  throw new Error(`BETTER_AUTH_SECRET ${reason}. ${HOW_TO_FIX}`);
}

/** Returns the secret, or throws if it is missing or obviously weak. */
export function requireAuthSecret(
  secret = process.env.BETTER_AUTH_SECRET,
): string {
  if (!secret) fail("is not set");
  if (secret !== secret.trim()) fail("has leading or trailing whitespace");
  if (secret.length < MIN_LENGTH)
    fail(`must be at least ${MIN_LENGTH} characters (got ${secret.length})`);
  if (new Set(secret).size < MIN_DISTINCT_CHARS)
    fail("is too repetitive to be randomly generated");
  if (PLACEHOLDER_PATTERNS.some((p) => p.test(secret)))
    fail("looks like a placeholder value");
  return secret;
}
