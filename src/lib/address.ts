// India shipping address: validated on the server (the source of truth) and
// reused by the client form for inline messages. Pure, so it is safe to import
// from client components.
import type { ShippingAddress } from "@/db/schema";

export type AddressInput = {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
};

export type AddressResult =
  | { ok: true; address: ShippingAddress & { phone: string } }
  | { ok: false; message: string };

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "";

/** Normalises and checks untrusted input; never trust the client's shape. */
export function parseAddress(input: unknown): AddressResult {
  const raw = (input ?? {}) as Partial<Record<keyof AddressInput, unknown>>;
  const address = {
    name: clean(raw.name, 80),
    phone: clean(raw.phone, 20).replace(/[\s-]/g, ""),
    line1: clean(raw.line1, 120),
    line2: clean(raw.line2, 120),
    city: clean(raw.city, 80),
    state: clean(raw.state, 80),
    postalCode: clean(raw.postalCode, 6),
  };

  if (!address.name) return { ok: false, message: "Please enter your full name." };
  // Indian mobile: optional +91 or 0 prefix, then 10 digits starting 6-9.
  if (!/^(\+?91|0)?[6-9]\d{9}$/.test(address.phone))
    return { ok: false, message: "Please enter a valid 10-digit mobile number." };
  if (!address.line1) return { ok: false, message: "Please enter your address." };
  if (!address.city) return { ok: false, message: "Please enter your city." };
  if (!address.state) return { ok: false, message: "Please enter your state." };
  if (!/^[1-9]\d{5}$/.test(address.postalCode))
    return { ok: false, message: "Please enter a valid 6-digit PIN code." };

  return {
    ok: true,
    address: {
      name: address.name,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 || null,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: "IN",
    },
  };
}
