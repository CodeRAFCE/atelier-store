import Link from "next/link";
import { getCart } from "@/db/cart";
import { readCart } from "@/lib/cart-cookie";
import { BagIcon } from "../icons";

/** Header bag link. Static fallback for the Suspense boundary that wraps CartCount. */
export function BagLink({ count = 0 }: { count?: number }) {
  return (
    <Link
      href="/cart"
      className="btn-icon relative -mr-3"
      aria-label={`Shopping bag, ${count} ${count === 1 ? "item" : "items"}`}
    >
      <BagIcon />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] leading-none text-background"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

/**
 * Reads the cart cookie, so it must render behind <Suspense>. Counts against
 * live stock so it matches the bag page.
 */
export async function CartCount() {
  const { count } = await getCart(await readCart());
  return <BagLink count={count} />;
}
