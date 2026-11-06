import Image from "next/image";
import { ArrowRightIcon } from "@/components/icons";
import { ProductCard } from "@/components/product-card";
import { getCategories, getProducts } from "@/db/queries";
import { collections, editorial, hero, services } from "@/lib/site-content";

export default async function Home() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  return (
    <>
        {/* Hero */}
        <section aria-labelledby="hero-title" className="media-hero">
          <Image
            src={hero.image.src}
            alt={hero.image.alt}
            fill
            preload
            sizes="100vw"
            className="object-cover object-[50%_30%]"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent md:from-black/55" />
          <div className="container-site absolute inset-x-0 bottom-0 pb-10 text-white md:pb-16">
            <div className="stack max-w-xl gap-5">
              <p className="text-label">{hero.eyebrow}</p>
              <h1 id="hero-title" className="text-display">
                {hero.title}
              </h1>
              <p className="max-w-md text-base text-white/85">{hero.description}</p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <a href={hero.primary.href} className="btn btn-inverse">
                  {hero.primary.label}
                </a>
                <a
                  href={hero.secondary.href}
                  className="btn btn-outline-inverse"
                >
                  {hero.secondary.label}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Intro statement */}
        <section className="container-prose section stack items-center gap-5 text-center">
          <p className="text-label text-muted">The House</p>
          <h2>Crafted slowly, made to be kept.</h2>
          <p className="text-muted">
            Each piece begins in our ateliers with a single material and a
            considered hand, finished to last well beyond the season.
          </p>
          <a href="#collections" className="text-label link mt-2">
            Our craft
          </a>
        </section>

        {/* Featured collections */}
        <section id="collections" aria-label="Featured collections" className="grid-split">
          {collections.map((c) => (
            <a key={c.id} href={c.href} className="group relative block">
              <div className="media-portrait">
                <Image
                  src={c.image.src}
                  alt={c.image.alt}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover transition-transform duration-1000 ease-luxe group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />
              </div>
              <div className="absolute inset-x-0 bottom-0 stack gap-3 p-6 text-white md:p-10">
                <p className="text-label">{c.eyebrow}</p>
                <h2>{c.title}</h2>
                <p className="max-w-sm text-sm text-white/85">{c.description}</p>
                <span className="text-label link-reveal mt-1 self-start">Shop the collection</span>
              </div>
            </a>
          ))}
        </section>

        {/* New arrivals */}
        <section id="new-in" aria-labelledby="new-in-title" className="container-site section">
          <div className="mb-8 flex items-end justify-between gap-6 md:mb-12">
            <div className="stack gap-3">
              <p className="text-label text-muted">Just arrived</p>
              <h2 id="new-in-title">New In</h2>
            </div>
            <a href="#" className="text-label link-reveal inline-flex items-center gap-2 whitespace-nowrap">
              View all <ArrowRightIcon width={14} height={14} />
            </a>
          </div>
          <div className="grid-products">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        {/* Editorial band */}
        <section aria-labelledby="editorial-title" className="relative min-h-[34rem] md:min-h-[44rem]">
          <Image
            src={editorial.image.src}
            alt={editorial.image.alt}
            fill
            sizes="100vw"
            className="object-cover object-[50%_25%]"
          />
          <div className="absolute inset-0 bg-overlay" />
          <div className="container-prose relative flex min-h-[34rem] flex-col items-center justify-center gap-5 py-16 text-center text-white md:min-h-[44rem]">
            <p className="text-label">{editorial.eyebrow}</p>
            <h2 id="editorial-title" className="text-display">
              {editorial.title}
            </h2>
            <p className="text-white/85">{editorial.description}</p>
            <a href={editorial.cta.href} className="btn btn-inverse mt-3">
              {editorial.cta.label}
            </a>
          </div>
        </section>

        {/* Shop by category */}
        <section id="categories" aria-labelledby="categories-title" className="container-site section">
          <div className="mb-8 stack items-center gap-3 text-center md:mb-12">
            <p className="text-label text-muted">Explore</p>
            <h2 id="categories-title">Shop by Category</h2>
          </div>
          <ul className="grid grid-cols-2 gap-1 lg:grid-cols-4 md:gap-2">
            {categories.map((cat) => (
              <li key={cat.id}>
                <a href={cat.href} className="group block">
                  <div className="media-portrait">
                    <Image
                      src={cat.image.src}
                      alt={cat.image.alt}
                      fill
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      className="object-cover transition-transform duration-700 ease-luxe group-hover:scale-[1.03]"
                    />
                  </div>
                  <p className="text-label link-reveal mt-4 inline-block">{cat.title}</p>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Services */}
        <section aria-label="Services" className="bg-surface">
          <ul className="container-content grid gap-10 py-14 text-center md:grid-cols-3 md:gap-8">
            {services.map((s) => (
              <li key={s.title} className="stack items-center gap-3">
                <p className="text-label">{s.title}</p>
                <p className="max-w-xs text-sm text-muted">{s.description}</p>
              </li>
            ))}
          </ul>
        </section>
    </>
  );
}
