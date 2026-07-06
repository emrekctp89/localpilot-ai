"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { buildLeadEmailDraft, recordLeadCapture } from "@/lib/mini-site";
import { logAuditEvent } from "@/lib/platform/audit";
import { triggerBusinessWebhooks } from "@/lib/platform/webhooks";

interface LeadFormProps {
  businessId: string;
  businessName?: string;
  themeButtonClass?: string;
}

export default function LeadForm({
  businessId,
  businessName,
  themeButtonClass = "bg-blue-600 hover:bg-blue-700",
}: LeadFormProps) {
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    notes: "",
  });
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [emailDraft, setEmailDraft] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const capturedAt = new Date().toISOString();
    const leadNotes = `[Mini site lead] ${formData.notes.trim()}`;

    const { error } = await supabase.from("customers").insert([
      {
        business_id: businessId,
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        notes: leadNotes,
        status: "Yeni Potansiyel",
        last_visit_date: capturedAt,
      },
    ]);

    if (error) {
      setErrorMessage(error.message);
      setStatus("error");
      return;
    }

    const payload = {
      businessId,
      fullName: formData.full_name.trim(),
      phone: formData.phone.trim(),
      notes: formData.notes.trim(),
      capturedAt,
    };

    recordLeadCapture(payload);
    void logAuditEvent({
      businessId,
      action: "lead.created",
      entityType: "customer",
      metadata: payload,
    });
    void triggerBusinessWebhooks({
      businessId,
      event: "lead.created",
      data: payload,
    });
    setEmailDraft(buildLeadEmailDraft(payload, businessName));
    setStatus("success");
    setFormData({ full_name: "", phone: "", notes: "" });
  };

  if (status === "success") {
    return (
      <div className="space-y-4">
        <div
          className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center text-green-800 animate-fade-in-up"
          role="status"
        >
          <h3 className="text-xl font-bold mb-2">Talebiniz alındı</h3>
          <p>
            İşletme sahibi en kısa sürede sizinle iletişime geçecektir.
          </p>
        </div>
        {emailDraft && (
          <details className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            <summary className="cursor-pointer font-bold text-gray-800">
              İşletme için e-posta taslağı
            </summary>
            <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-xs text-gray-700">
              {emailDraft}
            </pre>
          </details>
        )}
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setEmailDraft("");
          }}
          className={`w-full rounded-2xl px-4 py-3 text-sm font-bold text-white transition ${themeButtonClass}`}
        >
          Yeni talep gönder
        </button>
      </div>
    );
  }

  return (
    <div className="relative z-10">
      {status === "error" && errorMessage && (
        <div
          className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          role="alert"
        >
          Gönderim başarısız: {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="lead-full-name" className="sr-only">
              Adınız Soyadınız
            </label>
            <input
              id="lead-full-name"
              type="text"
              required
              className="w-full bg-white/5 border border-white/10 text-gray-900 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-white/50 focus:bg-white outline-none transition placeholder-gray-500"
              placeholder="Adınız Soyadınız"
              value={formData.full_name}
              onChange={(event) =>
                setFormData({ ...formData, full_name: event.target.value })
              }
            />
          </div>
          <div>
            <label htmlFor="lead-phone" className="sr-only">
              Telefon Numaranız
            </label>
            <input
              id="lead-phone"
              type="tel"
              required
              placeholder="05XX XXX XX XX"
              className="w-full bg-white/5 border border-white/10 text-gray-900 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-white/50 focus:bg-white outline-none transition placeholder-gray-500"
              value={formData.phone}
              onChange={(event) =>
                setFormData({ ...formData, phone: event.target.value })
              }
            />
          </div>
        </div>
        <div>
          <label htmlFor="lead-notes" className="sr-only">
            Talebiniz / İlgilendiğiniz Ürün
          </label>
          <textarea
            id="lead-notes"
            required
            rows={3}
            placeholder="Nasıl yardımcı olabiliriz?"
            className="w-full bg-white/5 border border-white/10 text-gray-900 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-white/50 focus:bg-white outline-none transition placeholder-gray-500 resize-none"
            value={formData.notes}
            onChange={(event) =>
              setFormData({ ...formData, notes: event.target.value })
            }
          />
        </div>
        <button
          type="submit"
          disabled={status === "sending"}
          className={`w-full text-white font-bold py-4 rounded-2xl transition shadow-lg text-lg mt-2 disabled:bg-gray-400 ${themeButtonClass}`}
        >
          {status === "sending" ? "Gönderiliyor..." : "Gönder"}
        </button>
      </form>
    </div>
  );
}