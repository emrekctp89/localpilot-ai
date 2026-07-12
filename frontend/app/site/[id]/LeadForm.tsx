"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  buildLeadEmailDraft,
  isValidLeadPhone,
  normalizeWhatsAppNumber,
  recordLeadCapture,
} from "@/lib/mini-site";
import { logAuditEvent } from "@/lib/platform/audit";
import { triggerBusinessWebhooks } from "@/lib/platform/webhooks";
import { notifyBusinessLead } from "@/lib/repositories/business-notifications";

const PRODUCT_INTEREST_KEY = "localpilot:product-interest";

interface LeadFormProps {
  businessId: string;
  businessName?: string;
  themeButtonClass?: string;
}

function readProductInterest(): string {
  if (typeof window === "undefined") return "";
  try {
    const stored = sessionStorage.getItem(PRODUCT_INTEREST_KEY)?.trim() || "";
    if (stored) {
      sessionStorage.removeItem(PRODUCT_INTEREST_KEY);
      return stored;
    }
  } catch {
    // ignore storage errors
  }
  return "";
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

  useEffect(() => {
    const applyInterest = () => {
      const interest = readProductInterest();
      if (!interest) return;
      setFormData((current) => {
        if (current.notes.trim()) return current;
        return { ...current, notes: interest };
      });
    };

    applyInterest();
    window.addEventListener("hashchange", applyInterest);
    return () => window.removeEventListener("hashchange", applyInterest);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const fullName = formData.full_name.trim();
    const phone = formData.phone.trim();
    const notes = formData.notes.trim();

    if (fullName.length < 2) {
      setErrorMessage("Lütfen adınızı soyadınızı girin.");
      setStatus("error");
      return;
    }

    if (!isValidLeadPhone(phone)) {
      setErrorMessage(
        "Geçerli bir Türkiye cep telefonu girin (örn. 05XX XXX XX XX).",
      );
      setStatus("error");
      return;
    }

    const capturedAt = new Date().toISOString();
    const leadNotes = notes
      ? `[Mini site lead] ${notes}`
      : "[Mini site lead]";
    const normalizedPhone =
      normalizeWhatsAppNumber(phone).replace(/^90/, "0") || phone;

    const { error } = await supabase.from("customers").insert([
      {
        business_id: businessId,
        full_name: fullName,
        phone: normalizedPhone,
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
      fullName,
      phone: normalizedPhone,
      notes,
      capturedAt,
    };

    recordLeadCapture(payload);
    void notifyBusinessLead({
      businessId,
      fullName,
      phone: normalizedPhone,
      notes,
    });
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
              autoComplete="name"
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
              name="phone"
              autoComplete="tel"
              inputMode="tel"
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
            rows={3}
            placeholder="Nasıl yardımcı olabiliriz? (opsiyonel)"
            className="w-full bg-white/5 border border-white/10 text-gray-900 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-white/50 focus:bg-white outline-none transition placeholder-gray-500 resize-none"
            value={formData.notes}
            onChange={(event) =>
              setFormData({ ...formData, notes: event.target.value })
            }
          />
        </div>
        <p className="text-center text-xs text-white/50">
          Göndererek işletmenin sizinle iletişime geçmesine izin vermiş
          olursunuz.
        </p>
        <button
          type="submit"
          disabled={status === "sending"}
          className={`w-full text-white font-bold py-4 rounded-2xl transition shadow-lg text-lg mt-1 disabled:bg-gray-400 disabled:cursor-not-allowed ${themeButtonClass}`}
        >
          {status === "sending" ? "Gönderiliyor..." : "Gönder"}
        </button>
      </form>
    </div>
  );
}