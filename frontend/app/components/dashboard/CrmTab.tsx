/* eslint-disable react/no-unescaped-entities */
import React, { useCallback, useState, useEffect } from "react";

import { analyzeChurn, getAiServiceUrl } from "@/lib/ai-client";
import {
  LEAD_CAPTURE_EVENT,
  LEAD_CAPTURE_STORAGE_KEY,
  type LeadCapturePayload,
} from "@/lib/mini-site";
import { supabase } from "@/lib/supabase";
import { useToast } from "../Toast";
import {
  listCustomerFollowUps,
  saveCustomerFollowUps,
} from "@/lib/repositories/crm-activities";
import type {
  Business,
  Customer,
  CustomerFollowUp,
} from "@/lib/domain-types";

interface CrmTabProps {
  business: Business;
}

interface ChurnData {
  risk_level: string;
  at_risk_count: number;
  at_risk_names?: string[];
  insight: string;
  win_back_message: string;
}

export default function CrmTab({ business }: CrmTabProps) {
  const { showToast } = useToast();
  const reminderStorageKey = `localpilot-crm-reminders-${business?.id || "preview"}`;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [reminders, setReminders] = useState<Record<string, CustomerFollowUp>>(
    {},
  );
  const [reminderSaveStatus, setReminderSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // Modal State'leri
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    full_name: "",
    phone: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Churn (Kayıp) Analizi State'leri
  const [churnData, setChurnData] = useState<ChurnData | null>(null);
  const [isAnalyzingChurn, setIsAnalyzingChurn] = useState(false);

  const statusLabels: Record<string, string> = {
    "Yeni Potansiyel": "Yeni Potansiyel",
    "Ä°letiÅŸime GeÃ§ildi": "İletişime Geçildi",
    "İletişime Geçildi": "İletişime Geçildi",
    "KazanÄ±ldÄ±": "Kazanıldı",
    "Kazanıldı": "Kazanıldı",
    "Ä°ptal / Kaybedildi": "İptal / Kaybedildi",
    "İptal / Kaybedildi": "İptal / Kaybedildi",
  };
  const getStatusLabel = (status?: string) =>
    status ? statusLabels[status] || status : "-";
  const formatDate = (date?: string) =>
    date ? new Date(date).toLocaleDateString("tr-TR") : "-";

  const fetchCustomers = useCallback(async () => {
    if (!business?.id) {
      const mockData = await supabase
        .from("customers")
        .select("*")
        .eq("business_id", "123")
        .order("created_at", { ascending: false });
      setCustomers(mockData.data || []);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCustomers(data);
    }
    setLoading(false);
  }, [business?.id]);

  useEffect(() => {
    void fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    if (!business?.id) return;

    const notifyLeadCapture = (payload: LeadCapturePayload) => {
      if (payload.businessId !== business.id) return;
      void fetchCustomers();
      showToast(
        `Yeni mini site lead: ${payload.fullName}. CRM listesi güncellendi; e-posta taslağı hazır.`,
        "success",
      );
    };

    const handleLeadEvent = (event: Event) => {
      const detail = (event as CustomEvent<LeadCapturePayload>).detail;
      if (detail) notifyLeadCapture(detail);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LEAD_CAPTURE_STORAGE_KEY || !event.newValue) return;
      try {
        notifyLeadCapture(JSON.parse(event.newValue) as LeadCapturePayload);
      } catch {
        // ignore malformed payloads
      }
    };

    window.addEventListener(LEAD_CAPTURE_EVENT, handleLeadEvent);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(LEAD_CAPTURE_EVENT, handleLeadEvent);
      window.removeEventListener("storage", handleStorage);
    };
  }, [business?.id, fetchCustomers, showToast]);

  useEffect(() => {
    const loadReminders = async () => {
      let localReminders: Record<string, CustomerFollowUp> = {};
      try {
        const storedReminders = window.localStorage.getItem(reminderStorageKey);
        localReminders = storedReminders ? JSON.parse(storedReminders) : {};
      } catch {
        window.localStorage.removeItem(reminderStorageKey);
      }

      if (!business?.id) {
        setReminders(localReminders);
        return;
      }

      const cloudReminders = await listCustomerFollowUps(business.id);
      const mergedReminders = {
        ...localReminders,
        ...cloudReminders,
      };

      setReminders(mergedReminders);

      const hasUnsyncedLocal = Object.keys(localReminders).some(
        (customerId) =>
          JSON.stringify(localReminders[customerId]) !==
          JSON.stringify(cloudReminders[customerId]),
      );

      if (hasUnsyncedLocal) {
        const saved = await saveCustomerFollowUps(business.id, mergedReminders);
        if (saved) window.localStorage.removeItem(reminderStorageKey);
      } else if (Object.keys(cloudReminders).length > 0) {
        window.localStorage.removeItem(reminderStorageKey);
      }
    };

    loadReminders();
  }, [business?.id, reminderStorageKey]);

  const persistReminders = async (
    nextReminders: Record<string, CustomerFollowUp>,
  ) => {
    setReminders(nextReminders);
    setReminderSaveStatus("saving");

    if (!business?.id) {
      window.localStorage.setItem(
        reminderStorageKey,
        JSON.stringify(nextReminders),
      );
      setReminderSaveStatus("saved");
      return true;
    }

    const saved = await saveCustomerFollowUps(business.id, nextReminders);
    if (!saved) {
      setReminderSaveStatus("error");
      return false;
    }

    window.localStorage.removeItem(reminderStorageKey);
    setReminderSaveStatus("saved");
    window.setTimeout(() => setReminderSaveStatus("idle"), 2000);
    return true;
  };

  const updateFollowUpDate = async (
    customerId: string,
    followUpDate: string,
  ) => {
    const previousReminders = reminders;
    const nextReminders = {
      ...reminders,
      [customerId]: {
        ...(reminders[customerId] || {}),
        followUpDate,
      },
    };
    const saved = await persistReminders(nextReminders);
    if (!saved) setReminders(previousReminders);
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const targetId = business?.id || "preview";

    const { data, error } = await supabase
      .from("customers")
      .insert([
        {
          business_id: targetId,
          full_name: newCustomer.full_name,
          phone: newCustomer.phone,
          notes: newCustomer.notes,
          status: "İletişime Geçildi",
        },
      ])
      .select()
      .single();

    if (!error && data) {
      setCustomers([data, ...customers]);
      setIsModalOpen(false);
      setNewCustomer({ full_name: "", phone: "", notes: "" });
    } else {
      alert("Kayıt eklenirken bir hata oluştu: " + (error?.message || ""));
    }
    setIsSubmitting(false);
  };

  const updateStatus = async (customerId: string, newStatus: string) => {
    const currentCustomer = customers.find((customer) => customer.id === customerId);
    const previousCustomers = customers;
    const previousSelectedCustomer = selectedCustomer;
    const { error } = await supabase
      .from("customers")
      .update({ status: newStatus })
      .eq("id", customerId);
    if (!error) {
      setSelectedCustomer((current) =>
        current?.id === customerId ? { ...current, status: newStatus } : current,
      );
      setCustomers(
        customers.map((c) =>
          c.id === customerId ? { ...c, status: newStatus } : c,
        ),
      );

      if (currentCustomer?.status !== newStatus) {
        const currentReminder = reminders[customerId] || {};
        const saved = await persistReminders({
          ...reminders,
          [customerId]: {
            ...currentReminder,
            statusHistory: [
              {
                from: currentCustomer?.status,
                to: newStatus,
                changedAt: new Date().toISOString(),
              },
              ...(currentReminder.statusHistory || []),
            ].slice(0, 10),
          },
        });
        if (!saved) {
          setCustomers(previousCustomers);
          setSelectedCustomer(previousSelectedCustomer);
          await supabase
            .from("customers")
            .update({ status: currentCustomer?.status })
            .eq("id", customerId);
        }
      }
    }
  };

  // 🚀 YAPAY ZEKA CHURN ANALİZİNİ TETİKLEYEN FONKSİYON
  const handleAnalyzeChurn = async () => {
    if (!getAiServiceUrl()) {
      setIsAnalyzingChurn(true);
      setTimeout(() => {
        setChurnData({
          risk_level: "Orta",
          at_risk_count: 3,
          at_risk_names: ["Ahmet Yılmaz", "Mehmet Kaya", "Zeynep Çelik"],
          insight:
            "Son 30 gündür iletişime geçilmeyen 'Yeni Potansiyel' müşterileriniz soğumak üzere.",
          win_back_message:
            "Merhaba! 👋 Sizden uzun zamandır haber alamadık. Sizi tekrar aramızda görmek için bu haftaya özel %15 indirim tanımladık. Detaylar için bize yazın! 🎁",
        });
        setIsAnalyzingChurn(false);
      }, 1500);
      return;
    }

    setIsAnalyzingChurn(true);
    try {
      const data = await analyzeChurn({
        business_name: business?.name || "Test İşletmesi",
        customers: customers.map((c) => ({
          full_name: c.full_name,
          status: c.status,
          created_at: c.created_at,
        })),
      });

      setChurnData(data as ChurnData);
    } catch (error) {
      alert("AI Hatası: " + (error instanceof Error ? error.message : "Bilinmeyen hata"));
    } finally {
      setIsAnalyzingChurn(false);
    }
  };

  if (loading)
    return (
      <div className="p-12 text-center text-gray-500 animate-pulse font-medium">
        Müşteriler yükleniyor...
      </div>
    );

  const totalCustomers = customers.length;
  const newLeads = customers.filter(
    (c) => c.status === "Yeni Potansiyel",
  ).length;
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("tr-TR");
  const statusOptions = Array.from(
    new Set(customers.map((customer) => customer.status).filter(Boolean)),
  ) as string[];
  const filteredCustomers = customers.filter((customer) => {
    const matchesStatus =
      statusFilter === "all" || customer.status === statusFilter;
    const searchableText = [
      customer.full_name,
      customer.phone || "",
      customer.notes || "",
      getStatusLabel(customer.status),
    ]
      .join(" ")
      .toLocaleLowerCase("tr-TR");

    return matchesStatus && searchableText.includes(normalizedSearch);
  });
  const selectedReminder = selectedCustomer
    ? reminders[selectedCustomer.id] || {}
    : {};

  return (
    <div className="space-y-6 animate-fade-in-up relative">
      {/* ÜST BİLGİ KARTLARI VE AI BUTONU */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl">
            👥
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase">
              Toplam Müşteri
            </p>
            <p className="text-2xl font-black text-gray-800">
              {totalCustomers}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-2xl">
            🔥
          </div>
          <div>
            <p className="text-sm font-bold text-orange-400 uppercase">
              Yeni Potansiyel
            </p>
            <p className="text-2xl font-black text-gray-800">{newLeads}</p>
          </div>
        </div>

        {/* YAPAY ZEKA TETİKLEME KARTI */}
        <div className="bg-gradient-to-br from-rose-500 to-red-600 p-6 rounded-xl shadow-md text-white flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
          <p className="text-sm font-bold text-rose-100 uppercase mb-2">
            Gizli Tehlikeyi Gör
          </p>
          <button
            onClick={handleAnalyzeChurn}
            disabled={isAnalyzingChurn || customers.length === 0}
            className="w-full bg-white text-red-600 font-bold py-2 rounded-lg shadow-sm hover:bg-rose-50 transition disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isAnalyzingChurn
              ? "Analiz Ediliyor..."
              : "🚨 Risk (Churn) Analizi Yap"}
          </button>
        </div>
      </div>

      {/* 🔮 YAPAY ZEKA CHURN SONUÇ EKRANI */}
      {churnData && (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-6 md:p-8 animate-fade-in-up">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🤖</span>
                <h3 className="text-xl font-bold text-gray-900">
                  AI Müşteri Kayıp Analizi
                </h3>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
                    churnData.risk_level === "Yüksek"
                      ? "bg-red-600"
                      : churnData.risk_level === "Orta"
                        ? "bg-orange-500"
                        : "bg-emerald-500"
                  }`}
                >
                  Risk: {churnData.risk_level}
                </span>
              </div>
              <p className="text-gray-700 font-medium mb-4">
                "{churnData.insight}"
              </p>
              <div className="bg-white p-4 rounded-xl border border-rose-100 mb-4">
                <p className="text-sm text-gray-500 font-bold uppercase mb-2">
                  Kaybedilme Riski Taşıyan Müşteriler ({churnData.at_risk_count}
                  )
                </p>
                <div className="flex flex-wrap gap-2">
                  {churnData.at_risk_names?.map((name: string, i: number) => (
                    <span
                      key={i}
                      className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-1 rounded-md"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 bg-white p-5 rounded-2xl border border-rose-200 shadow-sm relative">
              <div className="absolute -top-3 -right-3 text-3xl">🎁</div>
              <p className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-2">
                Geri Kazanım (Win-Back) Mesajı
              </p>
              <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap italic mb-4">
                "{churnData.win_back_message}"
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(churnData.win_back_message);
                  alert(
                    "Mesaj kopyalandı! WhatsApp'tan hemen gönderebilirsiniz.",
                  );
                }}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg transition text-sm flex items-center justify-center gap-2"
              >
                <span>💬</span> Kopyala ve WhatsApp'a Git
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MÜŞTERİ LİSTESİ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Müşteri Rehberi</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition"
          >
            + Yeni Ekle
          </button>
        </div>

        <div className="p-4 md:p-6 border-b border-gray-100 grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3 bg-white">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Müşteri adı, telefon veya not ara..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">Tüm durumlar</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
          </select>
          <p className="md:col-span-2 text-xs font-medium text-gray-500">
            {filteredCustomers.length} / {customers.length} müşteri gösteriliyor.
          </p>
        </div>

        {customers.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-5xl mb-4 block">📭</span>
            <h3 className="text-lg font-bold text-gray-800">
              Henüz müşteri kaydınız yok.
            </h3>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-5xl mb-4 block">🔎</span>
            <h3 className="text-lg font-bold text-gray-800">
              Eşleşen müşteri bulunamadı.
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Arama metnini veya durum filtresini değiştirerek tekrar deneyin.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100 text-xs uppercase text-gray-400">
                  <th className="p-4 font-bold">Müşteri / İletişim</th>
                  <th className="p-4 font-bold">Not / Talep</th>
                  <th className="p-4 font-bold">Tarih</th>
                  <th className="p-4 font-bold">Durum</th>
                  <th className="p-4 font-bold text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className="hover:bg-gray-50 transition cursor-pointer"
                  >
                    <td className="p-4">
                      <p className="font-bold text-gray-900">
                        {customer.full_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {customer.phone || "-"}
                      </p>
                    </td>
                    <td
                      className="p-4 max-w-xs truncate text-sm text-gray-600"
                      title={customer.notes}
                    >
                      {customer.notes || "-"}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {customer.created_at
                        ? new Date(customer.created_at).toLocaleDateString(
                            "tr-TR",
                          )
                        : "-"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          customer.status === "Yeni Potansiyel"
                            ? "bg-orange-100 text-orange-700"
                            : customer.status === "İletişime Geçildi"
                              ? "bg-blue-100 text-blue-700"
                              : customer.status === "Kazanıldı"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {getStatusLabel(customer.status)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <select
                        className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-blue-500"
                        value={customer.status}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(e) =>
                          updateStatus(customer.id, e.target.value)
                        }
                      >
                        <option value="Yeni Potansiyel">Yeni Potansiyel</option>
                        <option value="İletişime Geçildi">
                          İletişime Geçildi
                        </option>
                        <option value="Kazanıldı">Kazanıldı</option>
                        <option value="İptal / Kaybedildi">
                          İptal / Kaybedildi
                        </option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm md:items-center">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl animate-fade-in-up">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-blue-500">
                  Müşteri Detayı
                </p>
                <h3 className="mt-1 text-2xl font-black text-gray-900">
                  {selectedCustomer.full_name}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedCustomer.phone || "Telefon bilgisi yok"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="rounded-full bg-gray-100 px-3 py-1 text-xl font-bold text-gray-500 hover:bg-gray-200"
                aria-label="Detay panelini kapat"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase text-gray-400">
                  Durum
                </p>
                <p className="mt-1 font-bold text-gray-900">
                  {getStatusLabel(selectedCustomer.status)}
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase text-gray-400">
                  Kayıt Tarihi
                </p>
                <p className="mt-1 font-bold text-gray-900">
                  {formatDate(selectedCustomer.created_at)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-xs font-bold uppercase text-gray-400">
                Not / Talep
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                {selectedCustomer.notes || "Not girilmemiş."}
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-bold uppercase text-blue-500">
                  Sonraki Takip Tarihi
                </label>
                <span
                  className={`text-xs font-bold ${
                    reminderSaveStatus === "error"
                      ? "text-red-600"
                      : reminderSaveStatus === "saved"
                        ? "text-emerald-600"
                        : "text-blue-400"
                  }`}
                >
                  {reminderSaveStatus === "saving" && "Kaydediliyor..."}
                  {reminderSaveStatus === "saved" && "Buluta kaydedildi"}
                  {reminderSaveStatus === "error" && "Kaydedilemedi"}
                </span>
              </div>
              <div className="mt-2 flex flex-col sm:flex-row gap-3 sm:items-center">
                <input
                  type="date"
                  value={selectedReminder.followUpDate || ""}
                  onChange={(event) =>
                    updateFollowUpDate(
                      selectedCustomer.id,
                      event.target.value,
                    )
                  }
                  disabled={reminderSaveStatus === "saving"}
                  className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-200"
                />
                <p className="text-sm text-blue-700">
                  {selectedReminder.followUpDate
                    ? `${formatDate(selectedReminder.followUpDate)} tarihinde takip et.`
                    : "Bu müşteri için takip tarihi seçilmedi."}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase text-gray-400">
                Durum Geçmişi
              </p>
              {selectedReminder.statusHistory?.length ? (
                <div className="mt-3 space-y-2">
                  {selectedReminder.statusHistory.map((item, index) => (
                    <div
                      key={`${item.changedAt}-${index}`}
                      className="rounded-xl bg-white px-3 py-2 text-sm text-gray-700 border border-gray-100"
                    >
                      <span className="font-bold">
                        {getStatusLabel(item.from)}
                      </span>{" "}
                      →{" "}
                      <span className="font-bold">
                        {getStatusLabel(item.to)}
                      </span>
                      <span className="block text-xs text-gray-400 mt-1">
                        {formatDate(item.changedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">
                  Henüz durum değişikliği kaydı yok.
                </p>
              )}
            </div>

            <div className="hidden">
              <p className="text-sm font-bold text-blue-900">
                Takip hatırlatmaları sıradaki geliştirme alanı.
              </p>
              <p className="mt-1 text-sm text-blue-700">
                Bu panel, bir sonraki adımda takip tarihi ve durum geçmişi için
                kullanılacak.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* YENİ MÜŞTERİ EKLEME MODALI */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-up">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Manuel Kayıt Ekle
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-red-500 text-2xl font-bold transition"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Müşteri Adı Soyadı
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newCustomer.full_name}
                  onChange={(e) =>
                    setNewCustomer({
                      ...newCustomer,
                      full_name: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Telefon Numarası
                </label>
                <input
                  type="tel"
                  required
                  className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Not / Talebi
                </label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  value={newCustomer.notes}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, notes: e.target.value })
                  }
                ></textarea>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
