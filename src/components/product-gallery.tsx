"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { ImageRef } from "@/lib/sample-data";

/**
 * Mobile/tablet: full-width swipeable carousel with position indicator.
 * Desktop (lg+): editorial grid, lead image full width, close-ups in pairs.
 */
export function ProductGallery({ images }: { images: ImageRef[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const lastIsSolo = (images.length - 1) % 2 === 1;

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  const goTo = (i: number) => {
    const el = trackRef.current;
    el?.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <ul
        ref={trackRef}
        onScroll={onScroll}
        aria-label="Product images"
        className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto lg:grid lg:grid-cols-2 lg:gap-1 lg:overflow-visible"
      >
        {images.map((img, i) => (
          <li
            key={img.src}
            className={`w-full shrink-0 snap-start lg:w-auto ${
              i === 0 || (lastIsSolo && i === images.length - 1) ? "lg:col-span-2" : ""
            }`}
          >
            <div className="media-product">
              <Image
                src={img.src}
                alt={img.alt}
                fill
                preload={i === 0}
                sizes={i === 0 ? "(min-width: 1024px) 58vw, 100vw" : "(min-width: 1024px) 29vw, 100vw"}
                className="object-cover"
              />
            </div>
          </li>
        ))}
      </ul>

      {images.length > 1 && (
        <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2 lg:hidden">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show image ${i + 1} of ${images.length}`}
              aria-current={i === active}
              className={`h-px w-6 transition-colors ${i === active ? "bg-foreground" : "bg-foreground/25"}`}
            >
              <span className="block h-4 -translate-y-2" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
