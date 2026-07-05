import React, { useState, useEffect } from "react";

// 🚀 ÖNEMLİ DİKKAT:
// Kendi yerel projenize kopyalarken aşağıdaki yorum satırını kaldırıp
// altındaki "const supabase = { ... }" sahte objesini SİLİNİZ.
import { supabase } from "@/lib/supabase";
import type { Business, Product } from "@/lib/domain-types";

interface MenuTabProps {
  business: Business;
}

export default function MenuTab({ business }: MenuTabProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State'leri
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
      // Önizleme ortamı kontrolü
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

    fetchProducts();
  }, [business]);

  // Yeni Ürün Ekle
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // EĞER ÖNİZLEME ORTAMINDA İSEK SADECE EKRANDA SİMÜLE ET
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
      return;
    }

    // GERÇEK ORTAM - SUPABASE KAYDI
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
    } else {
      alert("Ürün eklenirken hata oluştu: " + (error?.message || ""));
    }

    setIsSubmitting(false);
  };

  // Ürün Sil
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;

    // Önizleme kontrolü
    if (!business?.id) {
      setProducts(products.filter((p) => p.id !== productId));
      return;
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (!error) {
      setProducts(products.filter((p) => p.id !== productId));
    } else {
      alert("Ürün silinirken hata oluştu.");
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 animate-pulse font-medium">
        Ürünler yükleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up relative">
      {/* ÜST BAR & YENİ EKLE BUTONU */}
      <div className="bg-gradient-to-r from-rose-600 to-pink-600 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">📦 Ürün ve Menü Yönetimi</h2>
          <p className="text-rose-100 text-sm">
            Buraya eklediğiniz her ürün, anında Mini Sitenizde sergilenir.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-white text-rose-600 px-6 py-3 rounded-xl font-bold shadow-md hover:bg-rose-50 transition flex items-center gap-2 whitespace-nowrap"
        >
          <span className="text-xl">+</span> Yeni Ürün Ekle
        </button>
      </div>

      {/* ÜRÜNLER LİSTESİ (GRID) */}
      {products.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-gray-100 shadow-sm">
          <span className="text-5xl mb-4 block">🍔</span>
          <h3 className="text-xl font-bold text-gray-800">
            Menünüz henüz boş.
          </h3>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            Müşterilerinizin ne sunduğunuzu görebilmesi için ilk ürününüzü veya
            hizmetinizi hemen ekleyin.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition group"
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md mb-2 inline-block">
                      {product.category || "Genel"}
                    </span>
                    <h3 className="font-bold text-lg text-gray-900 leading-tight">
                      {product.name}
                    </h3>
                  </div>

                  <span className="font-black text-xl text-gray-900 bg-gray-50 px-2 py-1 rounded-lg">
                    ₺{product.price}
                  </span>
                </div>

                <p className="text-gray-500 text-sm line-clamp-2 min-h-[40px]">
                  {product.description || "Açıklama girilmemiş."}
                </p>
              </div>

              <div className="bg-gray-50 p-3 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => handleDeleteProduct(product.id)}
                  className="text-gray-400 hover:text-red-600 text-sm font-bold flex items-center gap-1 transition"
                >
                  <span>🗑️</span> Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* YENİ ÜRÜN EKLEME MODALI */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-up">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 md:p-8 shadow-2xl relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                Yeni Ürün Ekle
              </h3>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-red-500 text-3xl font-light transition leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Ürün / Hizmet Adı
                </label>

                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Örn: Filtre Kahve"
                  className="w-full border border-gray-300 rounded-xl p-3 bg-white text-black placeholder:text-gray-400 focus:ring-2 focus:ring-rose-500 outline-none"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Fiyat (₺)
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="150"
                    className="w-full border border-gray-300 rounded-xl p-3 bg-white text-black placeholder:text-gray-400 focus:ring-2 focus:ring-rose-500 outline-none"
                    value={newProduct.price}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, price: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Kategori
                  </label>

                  <input
                    type="text"
                    placeholder="Örn: İçecekler"
                    className="w-full border border-gray-300 rounded-xl p-3 bg-white text-black placeholder:text-gray-400 focus:ring-2 focus:ring-rose-500 outline-none"
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
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Açıklama{" "}
                  <span className="text-gray-400 font-normal">
                    (İsteğe bağlı)
                  </span>
                </label>

                <textarea
                  rows={3}
                  placeholder="Ürün içerik bilgisi vb..."
                  className="w-full border border-gray-300 rounded-xl p-3 bg-white text-black placeholder:text-gray-400 focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                  value={newProduct.description}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      description: e.target.value,
                    })
                  }
                ></textarea>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition"
                >
                  İptal
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-rose-600 text-white font-bold py-3.5 rounded-xl hover:bg-rose-700 disabled:bg-gray-400 transition"
                >
                  {isSubmitting ? "Ekleniyor..." : "Ekle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
