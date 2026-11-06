import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import { Suspense } from "react";
import { BagLink, CartCount } from "@/components/cart/cart-count";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/site-content";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: brand.name, template: `%s | ${brand.name}` },
  description: "eCommerce store",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <div className="bg-foreground py-2.5 text-center text-background">
          <p className="text-label px-gutter">Complimentary shipping &amp; returns</p>
        </div>
        <SiteHeader
          bag={
            <Suspense fallback={<BagLink />}>
              <CartCount />
            </Suspense>
          }
        />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
