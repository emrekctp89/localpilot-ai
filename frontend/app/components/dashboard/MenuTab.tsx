"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Business, Product } from "@/lib/domain-types";
import { useToast } from "../Toast";
import EmptyState from "./EmptyState";
import ModuleLoading from "./ModuleLoading";

interface MenuTabProps {
  business: Business;
}

export default function MenuTab({ business }: MenuTabProps) {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!business?.id) {
        setProducts([
          {
            id: "mock-1",
            business_id: "preview",
            name: "Örnek Hizmet (Canvas)",
            description:
              "Bu veri önizleme ortamında otomatik olarak gösterilmektedir.",
            price: 250,
            category: "Hizmetler",
          },
        ]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setProducts(data);
      }
      setLoading(false);
    };

    void fetchProducts();
  }, [business]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase("tr-TR");
    if (!q) return products;
    return products.filter((product) => {
      const haystack = [
        product.name,
        product.description,
        product.category,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR");
      return haystack.includes(q);
    });
  }, [products, searchQuery]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!business?.id) {
      const mockProduct = {
        id: `mock-${Date.now()}`,
        business_id: "preview",
        name: newProduct.name,
        description: newProduct.description,
        price: parseFloat(newProduct.price),
        category: newProduct.category || "Genel",
      };

      setProducts([mockProduct, ...products]);
      setIsModalOpen(false);
      setNewProduct({ name: "", description: "", price: "", category: "" });
      setIsSubmitting(false);
      showToast("Ürün eklendi (önizleme).", "success");
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          business_id: business.id,
          name: newProduct.name,
          description: newProduct.description,
          price: parseFloat(newProduct.price),
          category: newProduct.category || "Genel",
        },
      ])
      .select()
      .single();

    if (!error && data) {
      setProducts([data, ...products]);
      setIsModalOpen(false);
      setNewProduct({ name: "", description: "", price: "", category: "" });
      showToast("Ürün eklendi.", "success");
    } else {
      showToast(
        "Ürün eklenirken hata: " + (error?.message || "Bilinmeyen hata"),
        "error",
      );
    }

    setIsSubmitting(false);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;

    if (!business?.id) {
      setProducts(products.filter((p) => p.id !== productId));
      showToast("Ürün silindi (önizleme).", "success");
      return;
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (!error) {
      setProducts(products.filter((p) => p.id !== productId));
      showToast("Ürün silindi.", "success");
    } else {
      showToast("Ürün silinirken hata oluştu.", "error");
    }
  };

  if (loading) {
    return <ModuleLoading label="Ürünler yükleniyor..." />;
  }

  return (
    <div className="relative space-y-5 animate-fade-in-up sm:space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-rose-600 via-pink-600 to-slate-900 p-5 text-white shadow-lg sm:rounded-3xl sm:p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-100">
            Vitrin
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            Ürün ve menü
          </h2>
          <p className="mt-2 max-w-md text-sm text-rose-50/90">
            Eklediğiniz ürünler mini sitede anında sergilenir.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-rose-700 shadow-md transition hover:bg-rose-50"
        >
          <span className="text-lg" aria-hidden="true">
            +
          </span>
          Yeni ürün
        </button>
      </div>

      {products.length > 0 ? (
        <div className="lp-card p-4 sm:p-5">
          <label htmlFor="menu-search" className="lp-label">
            Ara
          </label>
          <input
            id="menu-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ürün, kategori veya açıklama..."
            className="lp-input"
          />
          <p className="mt-2 text-xs font-medium text-slate-500">
            {filteredProducts.length} / {products.length} ürün
          </p>
        </div>
      ) : null}

      {products.length === 0 ? (
        <div className="lp-card">
          <EmptyState
            icon="🍔"
            title="Menünüz henüz boş"
            description="Müşterilerin ne sunduğunuzu görmesi için ilk ürün veya hizmetinizi ekleyin."
            actionLabel="+ Yeni ürün"
            onAction={() => setIsModalOpen(true)}
          />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="lp-card">
          <EmptyState
            icon="🔎"
            title="Eşleşen ürün yok"
            description="Arama metnini değiştirerek tekrar deneyin."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <article
              key={product.id}
              className="lp-card-interactive overflow-hidden"
            >
              <div className="p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="lp-chip mb-2 bg-rose-50 text-rose-700">
                      {product.category || "Genel"}
                    </span>
                    <h3 className="text-lg font-black leading-tight text-slate-900">
                      {product.name}
                    </h3>
                  </div>
                  <span className="shrink-0 rounded-lg bg-slate-50 px-2 py-1 text-lg font-black text-slate-900">
                    ₺{product.price}
                  </span>
                </div>
                <p className="min-h-10 text-sm text-slate-500 line-clamp-2">
                  {product.description || "Açıklama girilmemiş."}
                </p>
              </div>
              <div className="flex justify-end border-t border-slate-100 bg-slate-50/80 p-3">
                <button
                  type="button"
                  onClick={() => void handleDeleteProduct(product.id)}
                  className="text-sm font-bold text-slate-400 transition hover:text-rose-600"
                >
                  Sil
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in-up">
          <div className="lp-card relative w-full max-w-md p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h3 className="text-xl font-black text-slate-900 sm:text-2xl">
                Yeni ürün ekle
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-3xl font-light leading-none text-slate-400 transition hover:text-rose-500"
                aria-label="Kapat"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label htmlFor="product-name" className="lp-label">
                  Ürün / hizmet adı
                </label>
                <input
                  id="product-name"
                  type="text"
                  required
                  autoFocus
                  placeholder="Örn: Filtre Kahve"
                  className="lp-input"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="product-price" className="lp-label">
                    Fiyat (₺)
                  </label>
                  <input
                    id="product-price"
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="0"
                    className="lp-input"
                    value={newProduct.price}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, price: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label htmlFor="product-category" className="lp-label">
                    Kategori
                  </label>
                  <input
                    id="product-category"
                    type="text"
                    placeholder="Genel"
                    className="lp-input"
                    value={newProduct.category}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        category: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label htmlFor="product-desc" className="lp-label">
                  Açıklama
                </label>
                <textarea
                  id="product-desc"
                  rows={3}
                  placeholder="Kısa açıklama"
                  className="lp-input resize-none"
                  value={newProduct.description}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="lp-btn-primary lp-btn-block bg-rose-600 shadow-rose-600/20 hover:bg-rose-700"
              >
                {isSubmitting ? "Kaydediliyor..." : "Ürünü kaydet"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
