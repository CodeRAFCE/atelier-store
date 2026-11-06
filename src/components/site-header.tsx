"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { brand, navigation } from "@/lib/site-content";
import { CloseIcon, MenuIcon, SearchIcon, UserIcon } from "./icons";

/** `bag` is the server-rendered bag link (it reads the cart cookie). */
export function SiteHeader({ bag }: { bag: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 bg-background hairline-b">
      <div className="container-site grid h-header grid-cols-[1fr_auto_1fr] items-center">
        {/* Left: menu (mobile) / search (desktop) */}
        <div className="flex items-center">
          <button
            type="button"
            className="btn-icon -ml-3 lg:hidden"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen(true)}
          >
            <MenuIcon />
          </button>
          <Link href="/search" className="btn-icon -ml-3 hidden lg:inline-flex" aria-label="Search">
            <SearchIcon />
          </Link>
        </div>

        {/* Center: wordmark */}
        <Link
          href="/"
          className="font-serif text-xl tracking-[0.2em] whitespace-nowrap uppercase md:text-2xl"
        >
          {brand.name}
        </Link>

        {/* Right: account + bag */}
        <div className="flex items-center justify-end">
          <Link href="/search" className="btn-icon lg:hidden" aria-label="Search">
            <SearchIcon />
          </Link>
          <Link href="/account" className="btn-icon hidden sm:inline-flex" aria-label="Account">
            <UserIcon />
          </Link>
          {bag}
        </div>
      </div>

      {/* Desktop navigation */}
      <nav aria-label="Main" className="hidden lg:block">
        <ul className="container-site flex justify-center gap-10 pb-4">
          {navigation.map((item) => (
            <li key={item.label}>
              <a href={item.href} className="text-label link-reveal">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile drawer */}
      <div
        id="mobile-menu"
        className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
        inert={!open}
      >
        <div
          className={`absolute inset-0 bg-overlay transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={`absolute inset-y-0 left-0 flex w-full max-w-sm flex-col bg-background transition-transform duration-300 ease-luxe ${open ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex h-header items-center justify-between px-gutter hairline-b">
            <span className="text-label">Menu</span>
            <button
              type="button"
              className="btn-icon -mr-3"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            >
              <CloseIcon />
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto px-gutter py-6">
            {navigation.map((item) => (
              <li key={item.label} className="hairline-b">
                <a
                  href={item.href}
                  className="block py-4 font-serif text-2xl"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="stack gap-3 px-gutter pb-8">
            {/* Signed-out visitors are redirected to sign-in by the proxy. */}
            <Link href="/account" className="btn btn-secondary btn-block" onClick={() => setOpen(false)}>
              My account
            </Link>
            <a href="#" className="text-label link self-start">
              Client services
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
