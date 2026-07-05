"use client";

import { useState } from "react";

// Kendi yerel projenize (VS Code vb.) kopyalarken aşağıdaki yorum satırını kaldırıp (aktif edip)
// altındaki "const supabase = { ... }" sahte objesini SİLİNİZ.
import { supabase } from "@/lib/supabase";

export default function LeadForm({ businessId }: { businessId: string }) {
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    notes: "",
  });
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");

    // Veriyi Supabase'deki 'customers' (CRM) tablosuna DOĞRU SÜTUNLARLA gönderiyoruz
    const { error } = await supabase.from("customers").insert([
      {
        business_id: businessId,
        full_name: formData.full_name,
        phone: formData.phone,
        notes: formData.notes,
        status: "Yeni Potansiyel", // CRM'e düşecek varsayılan durum
      },
    ]);

    if (error) {
      alert("Bir hata oluştu: " + error.message);
      setStatus("error");
    } else {
      setStatus("success");
      setFormData({ full_name: "", phone: "", notes: "" });
    }
  };

  if (status === "success") {
    return (
      <div className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-lg text-center animate-fade-in-up">
        <h3 className="text-xl font-bold mb-2">🎉 Talebiniz Alındı!</h3>
        <p>İşletme sahibi en kısa sürede sizinle iletişime geçecektir.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border border-gray-100 mt-12">
      <h2 className="text-2xl font-bold text-center mb-6">
        Bize Ulaşın / Randevu Alın
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="lead-full-name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Adınız Soyadınız
          </label>
          <input
            id="lead-full-name"
            type="text"
            required
            className="w-full border rounded-md p-3 focus:ring-2 focus:ring-blue-500 outline-none transition"
            value={formData.full_name}
            onChange={(e) =>
              setFormData({ ...formData, full_name: e.target.value })
            }
          />
        </div>
        <div>
          <label
            htmlFor="lead-phone"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Telefon Numaranız
          </label>
          <input
            id="lead-phone"
            type="tel"
            required
            placeholder="05XX XXX XX XX"
            className="w-full border rounded-md p-3 focus:ring-2 focus:ring-blue-500 outline-none transition"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
          />
        </div>
        <div>
          <label
            htmlFor="lead-notes"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Talebiniz / İlgilendiğiniz Ürün
          </label>
          <textarea
            id="lead-notes"
            required
            rows={3}
            placeholder="Sipariş, randevu veya sorunuzu yazabilirsiniz..."
            className="w-full border rounded-md p-3 focus:ring-2 focus:ring-blue-500 outline-none transition resize-none"
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
          ></textarea>
        </div>
        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {status === "sending" ? "Gönderiliyor..." : "Gönder"}
        </button>
      </form>
    </div>
  );
}
