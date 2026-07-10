"use client";

import { useEffect, useMemo, useState } from "react";
import type { Business, Order } from "@/lib/domain-types";
import { listOrders, saveOrders } from "@/lib/repositories";
import EmptyState from "./EmptyState";
import ModuleLoading from "./ModuleLoading";

interface SiparisTabProps {
  business: Business;
}

const EMPTY_FORM = {
  customerName: "",
  phone: "",
  summary: "",
  total: "",
  channel: "whatsapp" as Order["channel"],
  paymentStatus: "bekliyor" as Order["paymentStatus"],
};

const orderStatusLabels: Record<Order["status"], string> = {
  yeni: "Yeni",
  hazirlaniyor: "Hazırlanıyor",
  hazir: "Hazır",
  teslim_edildi: "Teslim Edildi",
  iptal: "İptal",
};

const channelLabels: Record<Order["channel"], string> = {
  magaza: "Mağaza",
  telefon: "Telefon",
  whatsapp: "WhatsApp",
  web: "Web",
};

export default function SiparisTab({ business }: SiparisTabProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filter, setFilter] = useState<"acik" | "tum" | "tamamlanan">("acik");
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  useEffect(() => {
    const loadOrders = async () => {
      if (!business.id) {
        setLoading(false);
        return;
      }

      const storedOrders = await listOrders(business.id);
      setOrders(
        storedOrders.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
        ),
      );
      setLoading(false);
    };

    loadOrders();
  }, [business.id]);

  const persistOrders = async (nextOrders: Order[]) => {
    if (!business.id) return false;
    setSaveStatus("saving");

    const saved = await saveOrders(business.id, nextOrders);
    if (!saved) {
      setSaveStatus("error");
      return false;
    }

    setSaveStatus("saved");
    window.setTimeout(() => setSaveStatus("idle"), 2000);
    return true;
  };

  const updateOrders = async (nextOrders: Order[]) => {
    const previousOrders = orders;
    const sortedOrders = [...nextOrders].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    setOrders(sortedOrders);

    const saved = await persistOrders(sortedOrders);
    if (!saved) setOrders(previousOrders);
    return saved;
  };

  const handleAddOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.customerName || !form.summary || !form.total) return;

    const order: Order = {
      id: crypto.randomUUID(),
      customerName: form.customerName.trim(),
      phone: form.phone.trim() || undefined,
      summary: form.summary.trim(),
      total: Number(form.total),
      channel: form.channel,
      status: "yeni",
      paymentStatus: form.paymentStatus,
      createdAt: new Date().toISOString(),
    };

    const saved = await updateOrders([order, ...orders]);
    if (saved) setForm(EMPTY_FORM);
  };

  const handleOrderUpdate = (
    orderId: string,
    updates: Partial<Pick<Order, "status" | "paymentStatus">>,
  ) =>
    updateOrders(
      orders.map((order) =>
        order.id === orderId ? { ...order, ...updates } : order,
      ),
    );

  const handleDelete = (orderId: string) =>
    updateOrders(orders.filter((order) => order.id !== orderId));

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (filter === "tum") return true;
        if (filter === "tamamlanan") {
          return order.status === "teslim_edildi";
        }
        return !["teslim_edildi", "iptal"].includes(order.status);
      }),
    [filter, orders],
  );
  const openCount = orders.filter(
    (order) => !["teslim_edildi", "iptal"].includes(order.status),
  ).length;
  const pendingPayment = orders
    .filter(
      (order) =>
        order.paymentStatus === "bekliyor" && order.status !== "iptal",
    )
    .reduce((sum, order) => sum + Number(order.total), 0);
  const completedRevenue = orders
    .filter(
      (order) =>
        order.status === "teslim_edildi" &&
        order.paymentStatus === "odendi",
    )
    .reduce((sum, order) => sum + Number(order.total), 0);

  if (loading) {
    return <ModuleLoading label="Siparişler yükleniyor..." />;
  }

  return (
    <div className="space-y-5 animate-fade-in-up sm:space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-700 via-blue-700 to-slate-900 p-5 text-white shadow-lg sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-indigo-100">
              Operasyon Merkezi
            </p>
            <h2 className="mt-2 text-3xl font-black">Sipariş Yönetimi</h2>
            <p className="mt-2 text-sm text-indigo-100">
              Siparişleri hazırlıktan teslimata, ödemeden toplam ciroya kadar
              takip edin.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/15 px-4 py-3 text-center">
              <p className="text-2xl font-black">{openCount}</p>
              <p className="text-xs font-bold text-indigo-100">Açık</p>
            </div>
            <div className="rounded-xl bg-white/15 px-4 py-3 text-center">
              <p className="text-lg font-black">
                {pendingPayment.toLocaleString("tr-TR", {
                  style: "currency",
                  currency: "TRY",
                  maximumFractionDigits: 0,
                })}
              </p>
              <p className="text-xs font-bold text-indigo-100">Bekleyen</p>
            </div>
            <div className="rounded-xl bg-white/15 px-4 py-3 text-center">
              <p className="text-lg font-black">
                {completedRevenue.toLocaleString("tr-TR", {
                  style: "currency",
                  currency: "TRY",
                  maximumFractionDigits: 0,
                })}
              </p>
              <p className="text-xs font-bold text-indigo-100">Tamamlanan</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form
          onSubmit={handleAddOrder}
          className="lp-card space-y-3 p-5 sm:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-gray-900">Yeni Sipariş</h3>
            <span className="text-xs font-bold text-gray-400">
              {saveStatus === "saving" && "Kaydediliyor..."}
              {saveStatus === "saved" && "Kaydedildi"}
              {saveStatus === "error" && "Kaydedilemedi"}
            </span>
          </div>
          <input
            required
            value={form.customerName}
            onChange={(event) =>
              setForm({ ...form, customerName: event.target.value })
            }
            placeholder="Müşteri adı"
            className="lp-input"
          />
          <input
            value={form.phone}
            onChange={(event) =>
              setForm({ ...form, phone: event.target.value })
            }
            placeholder="Telefon"
            className="lp-input"
          />
          <textarea
            required
            rows={3}
            value={form.summary}
            onChange={(event) =>
              setForm({ ...form, summary: event.target.value })
            }
            placeholder="Sipariş özeti"
            className="lp-input resize-none"
          />
          <input
            required
            min="0"
            step="0.01"
            type="number"
            value={form.total}
            onChange={(event) =>
              setForm({ ...form, total: event.target.value })
            }
            placeholder="Toplam tutar"
            className="lp-input"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.channel}
              onChange={(event) =>
                setForm({
                  ...form,
                  channel: event.target.value as Order["channel"],
                })
              }
              className="lp-input text-sm font-bold"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="telefon">Telefon</option>
              <option value="magaza">Mağaza</option>
              <option value="web">Web</option>
            </select>
            <select
              value={form.paymentStatus}
              onChange={(event) =>
                setForm({
                  ...form,
                  paymentStatus: event.target
                    .value as Order["paymentStatus"],
                })
              }
              className="lp-input text-sm font-bold"
            >
              <option value="bekliyor">Ödeme Bekliyor</option>
              <option value="odendi">Ödendi</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={saveStatus === "saving"}
            className="lp-btn-primary lp-btn-block"
          >
            Siparişi Kaydet
          </button>
        </form>

        <div className="lp-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-black text-gray-900">
                Sipariş Listesi
              </h3>
              <p className="text-sm text-gray-500">
                {filteredOrders.length} sipariş gösteriliyor.
              </p>
            </div>
            <div className="flex rounded-xl bg-gray-100 p-1">
              {[
                ["acik", "Açık"],
                ["tum", "Tümü"],
                ["tamamlanan", "Teslim Edildi"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setFilter(value as "acik" | "tum" | "tamamlanan")
                  }
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                    filter === value
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <EmptyState
              icon="📦"
              title="Bu görünümde sipariş yok"
              description={
                filter === "tamamlanan"
                  ? "Burada yalnızca durumu Teslim Edildi olan siparişler görünür. Ödeme durumu tek başına yetmez — kart menüsünden Teslim Edildi seçin."
                  : "Yeni siparişi soldaki formdan ekleyebilirsiniz."
              }
            />
          ) : (
            <div className="mt-4 space-y-3">
              {filteredOrders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-black text-gray-900">
                          {order.customerName}
                        </h4>
                        <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-bold text-indigo-700">
                          {orderStatusLabels[order.status]}
                        </span>
                        <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-gray-500">
                          {channelLabels[order.channel]}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        {order.summary}
                      </p>
                      <p className="mt-2 text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleString("tr-TR")}
                        {order.phone ? ` · ${order.phone}` : ""}
                      </p>
                    </div>
                    <p className="text-xl font-black text-gray-900">
                      {Number(order.total).toLocaleString("tr-TR", {
                        style: "currency",
                        currency: "TRY",
                      })}
                    </p>
                  </div>
                  <div className="mt-4 grid gap-2 border-t border-gray-200 pt-3 sm:grid-cols-[1fr_1fr_auto]">
                    <select
                      value={order.status}
                      onChange={(event) =>
                        handleOrderUpdate(order.id, {
                          status: event.target.value as Order["status"],
                        })
                      }
                      disabled={saveStatus === "saving"}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700"
                    >
                      <option value="yeni">Yeni</option>
                      <option value="hazirlaniyor">Hazırlanıyor</option>
                      <option value="hazir">Hazır</option>
                      <option value="teslim_edildi">Teslim Edildi</option>
                      <option value="iptal">İptal</option>
                    </select>
                    <select
                      value={order.paymentStatus}
                      onChange={(event) =>
                        handleOrderUpdate(order.id, {
                          paymentStatus: event.target
                            .value as Order["paymentStatus"],
                        })
                      }
                      disabled={saveStatus === "saving"}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700"
                    >
                      <option value="bekliyor">Ödeme Bekliyor</option>
                      <option value="odendi">Ödendi</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleDelete(order.id)}
                      disabled={saveStatus === "saving"}
                      className="rounded-xl border border-red-100 bg-white px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50"
                    >
                      Sil
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
