// Placeholder storefront content. Replace with database queries once the
// product/collection schema exists.

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}`;

export type ImageRef = { src: string; alt: string };

export type ProductSize = { label: string; stock: number };

export type Product = {
  /** URL slug; maps to /products/[slug]. */
  id: string;
  name: string;
  category: string;
  price: number;
  color: string;
  badge?: string;
  /** Primary image, used on cards. */
  image: ImageRef;
  /** Full PDP gallery; first entry is `image`. */
  gallery: ImageRef[];
  /** Units available; for sized items this is the sum across sizes. */
  stock: number;
  sizes?: ProductSize[];
  description: string;
  details: string[];
  href: string;
};

export type Collection = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  image: ImageRef;
  href: string;
};

export type Category = {
  id: string;
  title: string;
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

const LOW_STOCK_THRESHOLD = 3;

/** Unsplash focal-point crop, used for close-up gallery shots. */
const detailShot = (id: string, x: number, y: number, zoom: number) =>
  `${unsplash(id)}?fit=crop&crop=focalpoint&fp-x=${x}&fp-y=${y}&fp-z=${zoom}&w=1600&h=2000`;

type ProductInput = Omit<Product, "href" | "image" | "gallery" | "stock"> & {
  photo: string;
  alt: string;
  closeUps: { x: number; y: number; zoom: number; alt: string }[];
  /** Total stock for one-size items; ignored when `sizes` is set. */
  stock?: number;
};

function defineProduct({
  photo,
  alt,
  closeUps,
  stock,
  ...rest
}: ProductInput): Product {
  const image = { src: unsplash(photo), alt };
  return {
    ...rest,
    href: `/products/${rest.id}`,
    image,
    gallery: [
      image,
      ...closeUps.map((c) => ({
        src: detailShot(photo, c.x, c.y, c.zoom),
        alt: c.alt,
      })),
    ],
    stock: rest.sizes
      ? rest.sizes.reduce((n, s) => n + s.stock, 0)
      : (stock ?? 0),
  };
}

const apparelSizes = (stock: [number, number, number, number, number]) =>
  (["XS", "S", "M", "L", "XL"] as const).map((label, i) => ({
    label,
    stock: stock[i],
  }));

export const products: Product[] = [
  defineProduct({
    id: "wicker-top-handle",
    name: "Woven Top Handle Bag",
    category: "Handbags",
    price: 2450,
    badge: "New",
    color: "Tan",
    photo: "1590874103328-eac38a683ce7",
    alt: "Woven wicker top handle bag with tan leather flap",
    closeUps: [
      {
        x: 0.5,
        y: 0.9,
        zoom: 2.4,
        alt: "Close-up of the hand-woven wicker body",
      },
      {
        x: 0.5,
        y: 0.22,
        zoom: 2.2,
        alt: "Detail of the rounded leather top handle",
      },
    ],
    stock: 6,
    description:
      "A structured top handle bag hand-woven in wicker and finished with a smooth leather flap. Light enough for every day, composed enough for the evening.",
    details: [
      "Hand-woven wicker body",
      "Smooth calfskin leather flap and handle",
      "Detachable, adjustable shoulder strap",
      "Cotton-linen lining with one flat pocket",
      "W 28cm × H 22cm × D 14cm",
      "Made in Italy",
    ],
  }),
  defineProduct({
    id: "leather-biker",
    name: "Leather Biker Jacket",
    category: "Ready-to-wear",
    price: 4200,
    color: "Black",
    photo: "1551028719-00167b16eac5",
    alt: "Black leather biker jacket on a hanger",
    closeUps: [
      {
        x: 0.3,
        y: 0.8,
        zoom: 2.2,
        alt: "Close-up of the zip pockets and leather grain",
      },
      { x: 0.6, y: 0.75, zoom: 2, alt: "Detail of the zip pocket and sleeve" },
    ],
    sizes: apparelSizes([0, 2, 4, 3, 1]),
    description:
      "Cut from supple lambskin with an asymmetric zip and broad notched lapels, the biker is tailored close to the body and softens with every wear.",
    details: [
      "100% lambskin leather",
      "Cupro lining",
      "Asymmetric front zip with silver-tone hardware",
      "Three zip pockets",
      "Regular fit, true to size",
      "Professional leather clean only",
    ],
  }),
  defineProduct({
    id: "twisted-hoops",
    name: "Twisted Gold Hoops",
    category: "Jewelry",
    price: 890,
    badge: "New",
    color: "Gold",
    photo: "1617038260897-41a1f14a8ca0",
    alt: "Pair of twisted gold hoop earrings resting on a stone",
    closeUps: [
      {
        x: 0.55,
        y: 0.4,
        zoom: 2.2,
        alt: "Close-up of a twisted hoop catching the light",
      },
      { x: 0.45, y: 0.75, zoom: 2.2, alt: "Detail of the hoop's rope texture" },
    ],
    stock: 2,
    description:
      "Chunky rope-twist hoops in polished gold vermeil. Weighty in appearance, light on the ear.",
    details: [
      "18k gold vermeil on sterling silver",
      "Hinged click-top closure",
      "Diameter 2.4cm",
      "Sold as a pair",
      "Presented in a signature box",
    ],
  }),
  defineProduct({
    id: "silk-bomber",
    name: "Silk Bomber Jacket",
    category: "Ready-to-wear",
    price: 2900,
    color: "Rust",
    photo: "1591047139829-d91aecb6caea",
    alt: "Rust coloured bomber jacket on a hanger",
    closeUps: [
      { x: 0.5, y: 0.3, zoom: 2, alt: "Close-up of the ribbed collar and zip" },
      {
        x: 0.6,
        y: 0.75,
        zoom: 2.2,
        alt: "Detail of the ribbed hem and sleeve pocket",
      },
    ],
    sizes: apparelSizes([3, 5, 5, 4, 2]),
    description:
      "A relaxed bomber in washed silk twill with ribbed trims and a utility sleeve pocket. Fluid, lightweight and easy to layer.",
    details: [
      "100% silk twill",
      "Ribbed cotton collar, cuffs and hem",
      "Two-way front zip",
      "Utility pocket on the left sleeve",
      "Relaxed fit",
      "Dry clean only",
    ],
  }),
  defineProduct({
    id: "floral-tote",
    name: "Botanical Print Tote",
    category: "Handbags",
    price: 2150,
    color: "Blush multicolour",
    photo: "1591561954557-26941169b49e",
    alt: "Structured tote bag with a botanical print",
    closeUps: [
      { x: 0.5, y: 0.85, zoom: 2.2, alt: "Close-up of the botanical print" },
    ],
    stock: 4,
    description:
      "A structured tote printed with an archival botanical motif, sized for the essentials and finished with rolled leather handles.",
    details: [
      "Printed coated canvas with leather trim",
      "Rolled leather top handles",
      "Silver-tone hardware",
      "Zip interior pocket",
      "W 32cm × H 25cm × D 15cm",
      "Made in Italy",
    ],
  }),
  defineProduct({
    id: "selvedge-denim",
    name: "Selvedge Denim Jacket",
    category: "Ready-to-wear",
    price: 1250,
    color: "Indigo",
    photo: "1611312449408-fcece27cdbb7",
    alt: "Indigo denim jacket with a corduroy collar",
    closeUps: [
      { x: 0.28, y: 0.3, zoom: 2.4, alt: "Close-up of the corduroy collar" },
      {
        x: 0.62,
        y: 0.62,
        zoom: 2.2,
        alt: "Detail of the contrast topstitching",
      },
    ],
    sizes: apparelSizes([0, 0, 1, 2, 0]),
    description:
      "Raw Japanese selvedge denim, cut in a boxy trucker shape and finished with a corduroy collar and contrast topstitching.",
    details: [
      "100% cotton selvedge denim, 14oz",
      "Corduroy collar",
      "Metal shank buttons",
      "Two chest flap pockets",
      "Boxy fit, size down for a closer fit",
      "Machine wash cold, inside out",
    ],
  }),
  defineProduct({
    id: "crepe-trousers",
    name: "Crêpe Jogger Trousers",
    category: "Ready-to-wear",
    price: 980,
    badge: "New",
    color: "Blush",
    photo: "1594633312681-425c7b97ccd1",
    alt: "Blush crêpe jogger trousers",
    closeUps: [
      {
        x: 0.5,
        y: 0.3,
        zoom: 2,
        alt: "Close-up of the waistband and patch pockets",
      },
      { x: 0.5, y: 0.85, zoom: 2.2, alt: "Detail of the elasticated cuffs" },
    ],
    sizes: apparelSizes([2, 4, 6, 4, 2]),
    description:
      "Tailoring meets ease: fluid crêpe joggers with pressed patch pockets and elasticated cuffs.",
    details: [
      "Triacetate-polyester crêpe",
      "Elasticated waist with drawcord",
      "Front patch pockets",
      "Elasticated cuffs",
      "Relaxed fit",
      "Dry clean only",
    ],
  }),
  defineProduct({
    id: "knit-poncho",
    name: "Open Knit Poncho",
    category: "Ready-to-wear",
    price: 1100,
    color: "Ivory",
    photo: "1434389677669-e08b4cac3105",
    alt: "Ivory open knit poncho on a wooden hanger",
    closeUps: [
      { x: 0.5, y: 0.45, zoom: 2, alt: "Close-up of the open knit stitch" },
      { x: 0.5, y: 0.85, zoom: 2, alt: "Detail of the fringed hem" },
    ],
    stock: 0,
    description:
      "An airy poncho hand-knit in a cotton-cashmere blend, finished with a deep V-neck and a fringed hem.",
    details: [
      "80% cotton, 20% cashmere",
      "Hand-knit open stitch",
      "Fringed hem",
      "One size",
      "Hand wash cold, dry flat",
    ],
  }),
];

export type StockState = {
  status: "in_stock" | "low_stock" | "sold_out";
  label: string;
};

export function getStockState(stock: number): StockState {
  if (stock <= 0) return { status: "sold_out", label: "Sold out" };
  if (stock <= LOW_STOCK_THRESHOLD)
    return { status: "low_stock", label: `Only ${stock} left` };
  return { status: "in_stock", label: "In stock" };
}

export const getProduct = (id: string) => products.find((p) => p.id === id);

/** Same-category products first, then the rest, excluding the current one. */
export function getRelatedProducts(product: Product, count = 4) {
  const others = products.filter((p) => p.id !== product.id);
  return [
    ...others.filter((p) => p.category === product.category),
    ...others.filter((p) => p.category !== product.category),
  ].slice(0, count);
}

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

export const categories: Category[] = [
  {
    id: "handbags",
    title: "Handbags",
    image: {
      src: unsplash("1584917865442-de89df76afd3"),
      alt: "Glossy red top handle handbag on a plinth",
    },
    href: "#",
  },
  {
    id: "shoes",
    title: "Shoes",
    image: {
      src: unsplash("1560769629-975ec94e6a86"),
      alt: "Pair of multicolour sneakers on white plinths",
    },
    href: "#",
  },
  {
    id: "jewelry",
    title: "Jewelry",
    image: {
      src: unsplash("1606760227091-3dd870d97f1d"),
      alt: "Assorted silver and gold jewelry",
    },
    href: "#",
  },
  {
    id: "ready-to-wear",
    title: "Ready-to-wear",
    image: {
      src: unsplash("1445205170230-053b83016050"),
      alt: "Rail of neutral toned garments in a boutique",
    },
    href: "#",
  },
];

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

export const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
