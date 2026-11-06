import Image from "next/image";
import Link from "next/link";
import { formatPrice, getStockState, type Product } from "@/lib/catalog";
import { HeartIcon } from "./icons";

const sizes = "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw";

export function ProductCard({ product }: { product: Product }) {
  const stock = getStockState(product.stock);
  const soldOut = stock.status === "sold_out";
  const hoverImage = product.gallery[1];
  const lowStock = stock.status === "low_stock";
  // Availability outranks the merchandising badge (e.g. "New").
  const badge = soldOut || lowStock ? stock.label : product.badge;

  return (
    <article className="group relative">
      <Link href={product.href} className="block">
        <div className="media-product">
          <Image
            src={product.image.src}
            alt={product.image.alt}
            fill
            sizes={sizes}
            className={`object-cover transition-[opacity,transform] duration-700 ease-luxe group-hover:scale-[1.03] ${soldOut ? "opacity-60" : ""}`}
          />
          {hoverImage && !soldOut && (
            <Image
              src={hoverImage.src}
              alt=""
              fill
              sizes={sizes}
              className="object-cover opacity-0 transition-opacity duration-700 ease-luxe group-hover:opacity-100"
            />
          )}
          {badge && (
            <span
              className={`text-label absolute top-3 left-3 bg-background px-2 py-1 ${lowStock ? "text-error" : ""}`}
            >
              {badge}
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-col gap-1 px-1 md:px-0">
          <p className="text-label text-muted">{product.category}</p>
          <h3 className="font-sans text-product">{product.name}</h3>
          <p className={`text-product ${soldOut ? "text-muted" : ""}`}>
            {formatPrice(product.price)}
          </p>
        </div>
      </Link>
      <button
        type="button"
        className="btn-icon absolute top-2 right-2 size-9 bg-background/90"
        aria-label={`Save ${product.name} to wishlist`}
      >
        <HeartIcon width={18} height={18} />
      </button>
    </article>
  );
}
