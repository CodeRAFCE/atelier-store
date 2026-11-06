"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createProduct, updateProduct } from "@/app/admin/actions";
import { FormStatus, type Status } from "@/components/account/form-status";
import { slugify } from "@/lib/slug";
import { AdminField } from "./admin-field";

export type ProductFormValues = {
  slug: string;
  name: string;
  categorySlug: string;
  /** Rupees as typed, e.g. "1499" or "1499.50". */
  price: string;
  color: string;
  badge: string;
  description: string;
  /** One detail per line. */
  details: string;
  images: { src: string; alt: string }[];
};

const EMPTY: ProductFormValues = {
  slug: "",
  name: "",
  categorySlug: "",
  price: "",
  color: "",
  badge: "",
  description: "",
  details: "",
  images: [{ src: "", alt: "" }],
};

type StockRow = { size: string; quantity: string };

/** Create (no `product`) or edit. Slug is fixed after creation so URLs stay stable. */
export function ProductForm({
  categories,
  product,
}: {
  categories: { slug: string; name: string }[];
  product?: ProductFormValues;
}) {
  const router = useRouter();
  const editing = Boolean(product);
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const [values, setValues] = useState<ProductFormValues>(product ?? EMPTY);
  const [stock, setStock] = useState<StockRow[]>([{ size: "", quantity: "0" }]);
  const [slugEdited, setSlugEdited] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState(false);

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  function setName(name: string) {
    setValues((v) => ({
      ...v,
      name,
      slug: editing || slugEdited ? v.slug : slugify(name),
    }));
  }

  function setImage(i: number, patch: Partial<{ src: string; alt: string }>) {
    setValues((v) => ({
      ...v,
      images: v.images.map((img, n) => (n === i ? { ...img, ...patch } : img)),
    }));
  }

  function focusField(field: string | undefined) {
    if (!field) return;
    requestAnimationFrame(() =>
      formRef.current?.querySelector<HTMLElement>(`[data-field="${field}"]`)?.focus(),
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setErrors({});
    setStatus(null);

    const payload = {
      ...values,
      details: values.details.split("\n"),
      ...(editing ? {} : { stock }),
    };

    try {
      const res = editing
        ? await updateProduct(values.slug, payload)
        : await createProduct(payload);

      if (!res.ok) {
        if (res.field) setErrors({ [res.field]: res.message });
        setStatus({ tone: "error", message: res.message });
        focusField(res.field);
        setPending(false);
        return;
      }
      if (editing) {
        setStatus({ tone: "success", message: "Product saved." });
        setPending(false);
        router.refresh();
        requestAnimationFrame(() => statusRef.current?.focus());
      } else {
        router.push(`/admin/products/${"slug" in res ? res.slug : values.slug}`);
      }
    } catch {
      setStatus({ tone: "error", message: "We couldn't reach the server. Try again." });
      setPending(false);
      requestAnimationFrame(() => statusRef.current?.focus());
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      aria-busy={pending}
      className="stack gap-8"
    >
      <FormStatus status={status} ref={statusRef} />

      <fieldset disabled={pending} className="stack gap-8">
        <AdminField label="Name" error={errors.name}>
          {(p) => (
            <input
              {...p}
              data-field="name"
              className="field"
              value={values.name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </AdminField>

        <AdminField
          label="Slug"
          error={errors.slug}
          hint={editing ? "The slug can't change after creation." : "Used in the product URL."}
        >
          {(p) => (
            <input
              {...p}
              data-field="slug"
              className="field disabled:text-muted"
              value={values.slug}
              maxLength={80}
              disabled={editing}
              spellCheck={false}
              autoCapitalize="none"
              onChange={(e) => {
                setSlugEdited(true);
                set("slug", e.target.value);
              }}
            />
          )}
        </AdminField>

        <AdminField label="Category" error={errors.categorySlug}>
          {(p) => (
            <select
              {...p}
              data-field="categorySlug"
              className="field-select"
              value={values.categorySlug}
              onChange={(e) => set("categorySlug", e.target.value)}
            >
              <option value="">Choose a category</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </AdminField>

        <div className="grid gap-8 sm:grid-cols-2">
          <AdminField label="Price (₹)" error={errors.price}>
            {(p) => (
              <input
                {...p}
                data-field="price"
                className="field"
                inputMode="decimal"
                value={values.price}
                onChange={(e) => set("price", e.target.value)}
              />
            )}
          </AdminField>
          <AdminField label="Colour" error={errors.color}>
            {(p) => (
              <input
                {...p}
                data-field="color"
                className="field"
                value={values.color}
                maxLength={40}
                onChange={(e) => set("color", e.target.value)}
              />
            )}
          </AdminField>
        </div>

        <AdminField label="Badge (optional)" error={errors.badge} hint="For example “New”.">
          {(p) => (
            <input
              {...p}
              data-field="badge"
              className="field"
              value={values.badge}
              maxLength={24}
              onChange={(e) => set("badge", e.target.value)}
            />
          )}
        </AdminField>

        <AdminField label="Description" error={errors.description}>
          {(p) => (
            <textarea
              {...p}
              data-field="description"
              className="field-area"
              value={values.description}
              maxLength={2000}
              onChange={(e) => set("description", e.target.value)}
            />
          )}
        </AdminField>

        <AdminField
          label="Details (optional)"
          error={errors.details}
          hint="One per line, for example “100% cotton”."
        >
          {(p) => (
            <textarea
              {...p}
              data-field="details"
              className="field-area"
              value={values.details}
              onChange={(e) => set("details", e.target.value)}
            />
          )}
        </AdminField>

        <div className="stack gap-4">
          <p className="text-label">Images</p>
          <p className="text-xs text-muted">
            The first image is the card image. Only images.unsplash.com links are allowed.
          </p>
          {errors.images && <p className="text-xs text-error">{errors.images}</p>}
          {values.images.map((img, i) => (
            <div key={i} className="grid gap-4 hairline-b pb-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <AdminField label={`Image ${i + 1} URL`}>
                {(p) => (
                  <input
                    {...p}
                    data-field={i === 0 ? "images" : undefined}
                    className="field"
                    value={img.src}
                    inputMode="url"
                    spellCheck={false}
                    onChange={(e) => setImage(i, { src: e.target.value })}
                  />
                )}
              </AdminField>
              <AdminField label="Alt text">
                {(p) => (
                  <input
                    {...p}
                    className="field"
                    value={img.alt}
                    maxLength={200}
                    onChange={(e) => setImage(i, { alt: e.target.value })}
                  />
                )}
              </AdminField>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={values.images.length === 1}
                onClick={() =>
                  set(
                    "images",
                    values.images.filter((_, n) => n !== i),
                  )
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-secondary self-start"
            disabled={values.images.length >= 10}
            onClick={() => set("images", [...values.images, { src: "", alt: "" }])}
          >
            Add image
          </button>
        </div>

        {!editing && (
          <div className="stack gap-4">
            <p className="text-label">Starting stock</p>
            <p className="text-xs text-muted">
              Leave the size blank for a one-size item (a single row). Otherwise give every row a size.
            </p>
            {errors.stock && <p className="text-xs text-error">{errors.stock}</p>}
            {stock.map((row, i) => (
              <div key={i} className="grid gap-4 hairline-b pb-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <AdminField label="Size">
                  {(p) => (
                    <input
                      {...p}
                      data-field={i === 0 ? "stock" : undefined}
                      className="field"
                      value={row.size}
                      maxLength={20}
                      onChange={(e) =>
                        setStock((s) => s.map((r, n) => (n === i ? { ...r, size: e.target.value } : r)))
                      }
                    />
                  )}
                </AdminField>
                <AdminField label="Quantity">
                  {(p) => (
                    <input
                      {...p}
                      className="field"
                      inputMode="numeric"
                      value={row.quantity}
                      onChange={(e) =>
                        setStock((s) => s.map((r, n) => (n === i ? { ...r, quantity: e.target.value } : r)))
                      }
                    />
                  )}
                </AdminField>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={stock.length === 1}
                  onClick={() => setStock((s) => s.filter((_, n) => n !== i))}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary self-start"
              disabled={stock.length >= 30}
              onClick={() => setStock((s) => [...s, { size: "", quantity: "0" }])}
            >
              Add size
            </button>
          </div>
        )}
      </fieldset>

      <button type="submit" className="btn btn-primary self-start" disabled={pending}>
        {pending ? "Saving…" : editing ? "Save product" : "Create product"}
      </button>
    </form>
  );
}
