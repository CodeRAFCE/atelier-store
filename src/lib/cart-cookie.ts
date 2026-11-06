// Server-only cart cookie access. Reading works anywhere on the server;
// writing only works in Server Actions and Route Handlers.
import { cookies } from "next/headers";
import { CART_COOKIE, MAX_LINES, parseCartCookie, type CartItem } from "./cart";

export async function readCart(): Promise<CartItem[]> {
  return parseCartCookie((await cookies()).get(CART_COOKIE)?.value);
}

export async function writeCart(items: CartItem[]) {
  const store = await cookies();
  if (items.length === 0) {
    store.delete(CART_COOKIE);
    return;
  }
  store.set(CART_COOKIE, JSON.stringify(items.slice(0, MAX_LINES)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}
