// Static, non-catalogue storefront content (brand, navigation, marketing
// blocks). Products and categories live in the database: see src/db/queries.ts.

import type { ImageRef } from "./catalog";

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}`;

export type Collection = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  image: ImageRef;
  href: string;
};

export const brand = {
  name: "Maison Lumière",
};

export const navigation = [
  { label: "New In", href: "/#new-in" },
  { label: "Women", href: "/#collections" },
  { label: "Men", href: "/#collections" },
  { label: "Handbags", href: "/#categories" },
  { label: "Shoes", href: "/#categories" },
  { label: "Jewelry", href: "/#categories" },
];

export const hero = {
  eyebrow: "Autumn – Winter Collection",
  title: "The Quiet Season",
  description:
    "Tailored layers, soft structure and colour drawn from the city at dusk.",
  image: {
    src: unsplash("1539109136881-3be0616acf4b"),
    alt: "Woman in a pale blue overcoat standing in a historic city square",
  },
  primary: { label: "Discover the collection", href: "#collections" },
  secondary: { label: "Shop new in", href: "/#new-in" },
};

export const collections: Collection[] = [
  {
    id: "women",
    eyebrow: "Women",
    title: "Romance, Reworked",
    description: "Volume, texture and print in a modern register.",
    image: {
      src: unsplash("1581044777550-4cfa60707c03"),
      alt: "Woman in a voluminous pink ruffled blouse in a wheat field",
    },
    href: "#new-in",
  },
  {
    id: "men",
    eyebrow: "Men",
    title: "The New Tailoring",
    description: "Relaxed shoulders and warm neutrals for every day.",
    image: {
      src: unsplash("1552374196-1ab2a1c593e8"),
      alt: "Man in a camel blazer and cream trousers seated on a wooden stool",
    },
    href: "#new-in",
  },
];

export const editorial = {
  eyebrow: "Evening",
  title: "In Full Bloom",
  description: "Fluid silhouettes in saturated red, made to move.",
  image: {
    src: unsplash("1595777457583-95e059d581b8"),
    alt: "Woman twirling in a flowing red gown outside a stone building",
  },
  cta: { label: "Explore eveningwear", href: "/#new-in" },
};

export const services = [
  {
    title: "Complimentary Shipping",
    description: "On all orders, delivered in signature packaging.",
  },
  {
    title: "Returns & Exchanges",
    description: "Free returns within 30 days of delivery.",
  },
  {
    title: "Client Services",
    description: "Advisors available seven days a week.",
  },
];

export const footerLinks = [
  {
    title: "Client Services",
    links: ["Contact Us", "Shipping", "Returns", "FAQ", "Track Your Order"],
  },
  {
    title: "The House",
    links: ["About", "Sustainability", "Careers", "Press"],
  },
  {
    title: "Legal",
    links: [
      "Privacy Policy",
      "Terms of Use",
      "Cookie Settings",
      "Accessibility",
    ],
  },
];
