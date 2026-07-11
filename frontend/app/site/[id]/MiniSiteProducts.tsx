"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/domain-types";

interface MiniSiteProductsProps {
  products: Product[];
  theme: {
    bg: string;
    text: string;
    light: string;
    shadow: string;
  };
  formatPrice: (price?: number | null) => string;
  whatsappHref?: string;
}

export default function MiniSiteProducts({
  products,
  theme,
  formatPrice,
  whatsappHref,
}: MiniSiteProductsProps) {
  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((product) => product.category?.trim())
            .filter((category): category is string => Boolean(category)),
        ),
      ),
    [products],
  );

  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    if (activeCategory === "all") return products;
    return products.filter(
      (product) => (product.category?.trim() || "") === activeCategory,
    );
  }, [products, activeCategory]);

  const featured = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  return (
    <section id="menu" className="scroll-mt-24 pt-12">
      <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span
            className={`mb-4 inline-flex rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest ${theme.light} ${theme.text}`}
          >
            {filtered.length} seçenek
            {activeCategory !== "all" ? ` · ${activeCategory}` : " yayında"}
          </span>
          <h2 className="text-4xl font-black tracking-tight text-gray-900 md:text-5xl">
            Ürünler ve Hizmetler
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-gray-500">
            En çok tercih edilen ürün ve hizmetleri tek yerde inceleyin. Detay
            için iletişim formundan ya da WhatsApp hattından ulaşabilirsiniz.
          </p>
        </div>

        {categories.length > 0 && (
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Ürün kategorileri"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === "all"}
              onClick={() => setActiveCategory("all")}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                activeCategory === "all"
                  ? `${theme.bg} border-transparent text-white shadow-sm`
                  : "border-gray-200 bg-white/70 text-gray-600 hover:border-gray-300"
              }`}
            >
              Tümü ({products.length})
            </button>
            {categories.map((category) => {
              const count = products.filter(
                (p) => (p.category?.trim() || "") === category,
              ).length;
              const selected = activeCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    selected
                      ? `${theme.bg} border-transparent text-white shadow-sm`
                      : "border-gray-200 bg-white/70 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {category} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="glass-panel rounded-3xl p-8 text-center md:p-10">
          <h3 className="text-xl font-black text-gray-900">
            Bu kategoride ürün yok
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Tümü&apos;ne dönün veya başka bir kategori seçin.
          </p>
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`mt-5 inline-flex rounded-xl px-5 py-2.5 text-sm font-bold text-white ${theme.bg}`}
          >
            Tümünü göster
          </button>
        </div>
      ) : (
        <>
          {featured.length > 0 && (
            <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
              {featured.map((product, index) => (
                <article
                  key={product.id}
                  className={`glass-panel relative flex min-h-64 flex-col justify-between overflow-hidden rounded-3xl p-6 ${
                    index === 0 ? "md:col-span-2" : ""
                  }`}
                >
                  <div
                    className={`absolute -right-12 -top-12 h-36 w-36 rounded-full ${theme.light}`}
                  />
                  <div className="relative">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${theme.light} ${theme.text}`}
                      >
                        {product.category || "Genel"}
                      </span>
                      <span className={`text-xl font-black ${theme.text}`}>
                        {formatPrice(product.price)}
                      </span>
                    </div>

                    <h3 className="text-2xl font-black leading-tight text-gray-900">
                      {product.name}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-gray-500">
                      {product.description ||
                        "Bu ürün hakkında detaylı bilgi almak için bize ulaşın."}
                    </p>
                  </div>

                  <div className="relative mt-6 flex flex-wrap gap-2">
                    <a
                      href="#iletisim"
                      className={`inline-flex w-fit rounded-xl px-4 py-2 text-sm font-bold text-white shadow-lg ${theme.bg} ${theme.shadow}`}
                    >
                      Detay Al
                    </a>
                    {whatsappHref ? (
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-fit rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800"
                      >
                        WhatsApp
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}

          {rest.length > 0 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {rest.map((product) => (
                <article
                  key={product.id}
                  className="group glass-panel flex items-start gap-4 rounded-2xl p-5 transition-colors hover:border-gray-300"
                >
                  <div
                    className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-black ${theme.light} ${theme.text}`}
                  >
                    {product.name.slice(0, 1).toLocaleUpperCase("tr-TR")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-gray-400">
                          {product.category || "Genel"}
                        </p>
                        <h3 className="text-lg font-bold text-gray-900 transition-colors group-hover:text-gray-600">
                          {product.name}
                        </h3>
                      </div>
                      <span
                        className={`whitespace-nowrap text-lg font-black ${theme.text}`}
                      >
                        {formatPrice(product.price)}
                      </span>
                    </div>

                    {product.description ? (
                      <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                        {product.description}
                      </p>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
