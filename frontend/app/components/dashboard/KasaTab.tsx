"use client";

import React, { useEffect, useMemo, useState } from "react";
import { forecastFinance } from "@/lib/ai-client";
import { supabase } from "@/lib/supabase";
import type { Business, Transaction } from "@/lib/domain-types";

interface Forecast {
  status: "success" | "insufficient_data";
  current_revenue?: number;
  predicted_revenue?: number;
  trend_percentage?: number;
  ai_insight?: string;
  action_recommendation?: string;
  message?: string;
}

interface KasaTabProps {
  business: Business;
}

export default function KasaTab({ business }: KasaTabProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [newTx, setNewTx] = useState({
    type: "gelir" as Transaction["type"],
    amount: "",
    description: "",
    category: "Genel",
  });
  const [isAdding, setIsAdding] = useState(false);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [isForecasting, setIsForecasting] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const expenseCategories = [
    "Genel",
    "Kira",
    "Personel",
    "Fatura",
    "Stok",
    "Pazarlama",
    "Bakım",
    "Vergi",
  ];

  const getTransactionCategory = (tx: Transaction) => {
    const match = tx.description.match(/^\[([^\]]+)\]\s*(.+)$/);
    return {
      category: tx.type === "gider" ? match?.[1] || "Genel" : "Gelir",
      description: match?.[2] || tx.description,
    };
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      const targetId = business?.id || "preview";
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("business_id", targetId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setTransactions(data as Transaction[]);
      }
    };

    fetchTransactions();
  }, [business?.id]);

  const incomeMonthCount = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.type !== "gelir" || !tx.created_at) return;
      months.add(tx.created_at.slice(0, 7));
    });
    return months.size;
  }, [transactions]);

  const totalBalance = useMemo(
    () =>
      transactions.reduce((acc, tx) => {
        const amount = Number(tx.amount);
        return tx.type === "gelir" ? acc + amount : acc - amount;
      }, 0),
    [transactions],
  );

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now);

    if (dateFilter === "7d") startDate.setDate(now.getDate() - 7);
    if (dateFilter === "30d") startDate.setDate(now.getDate() - 30);
    if (dateFilter === "90d") startDate.setDate(now.getDate() - 90);

    if (dateFilter === "all") return transactions;

    return transactions.filter(
      (tx) => new Date(tx.created_at).getTime() >= startDate.getTime(),
    );
  }, [dateFilter, transactions]);

  const filteredBalance = useMemo(
    () =>
      filteredTransactions.reduce((acc, tx) => {
        const amount = Number(tx.amount);
        return tx.type === "gelir" ? acc + amount : acc - amount;
      }, 0),
    [filteredTransactions],
  );

  const monthlySummary = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthTransactions = transactions.filter((tx) => {
      const txDate = new Date(tx.created_at);
      return (
        txDate.getMonth() === currentMonth &&
        txDate.getFullYear() === currentYear
      );
    });
    const income = monthTransactions
      .filter((tx) => tx.type === "gelir")
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    const expense = monthTransactions
      .filter((tx) => tx.type === "gider")
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    const expenseByCategory = monthTransactions
      .filter((tx) => tx.type === "gider")
      .reduce<Record<string, number>>((acc, tx) => {
        const category = getTransactionCategory(tx).category;
        acc[category] = (acc[category] || 0) + Number(tx.amount);
        return acc;
      }, {});
    const topExpenseCategory =
      Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "Yok";

    return {
      income,
      expense,
      net: income - expense,
      topExpenseCategory,
    };
  }, [transactions]);

  const monthlyTrend = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString("tr-TR", { month: "short" }),
        income: 0,
        expense: 0,
      };
    });

    transactions.forEach((tx) => {
      const txDate = new Date(tx.created_at);
      const key = `${txDate.getFullYear()}-${txDate.getMonth()}`;
      const month = months.find((item) => item.key === key);
      if (!month) return;
      if (tx.type === "gelir") month.income += Number(tx.amount);
      if (tx.type === "gider") month.expense += Number(tx.amount);
    });

    const maxAmount = Math.max(
      1,
      ...months.map((month) => Math.max(month.income, month.expense)),
    );

    return months.map((month) => ({
      ...month,
      incomeHeight: Math.max(6, (month.income / maxAmount) * 80),
      expenseHeight: Math.max(6, (month.expense / maxAmount) * 80),
    }));
  }, [transactions]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.amount || !newTx.description) return;

    setIsAdding(true);
    const targetId = business?.id || "preview";
    const cleanDescription = newTx.description.trim();
    const storedDescription =
      newTx.type === "gider"
        ? `[${newTx.category || "Genel"}] ${cleanDescription}`
        : cleanDescription;

    const { data, error } = await supabase
      .from("transactions")
      .insert([
        {
          business_id: targetId,
          type: newTx.type,
          amount: Number(newTx.amount),
          description: storedDescription,
        },
      ])
      .select()
      .single();

    if (!error && data) {
      setTransactions([data as Transaction, ...transactions]);
      setNewTx({
        type: "gelir",
        amount: "",
        description: "",
        category: "Genel",
      });
      setForecast(null);
    } else {
      alert("İşlem kaydedilemedi: " + (error?.message || "Bilinmeyen hata"));
    }

    setIsAdding(false);
  };

  const handleGetForecast = async () => {
    setIsForecasting(true);
    try {
      const data = await forecastFinance({
        business_name: business?.name || "Test İşletmesi",
        transactions: transactions.map((tx) => ({
          date: tx.created_at,
          amount: tx.amount,
          type: tx.type,
        })),
      });

      if (data.status === "insufficient_data") {
        alert(data.message || "Tahmin için daha fazla gelir işlemi gerekiyor.");
      } else {
        setForecast(data as Forecast);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Tahmin hesaplanamadı.");
    } finally {
      setIsForecasting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in-up sm:space-y-6">
      <div className="bg-gradient-to-br from-gray-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-700/50 pb-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold">AI Gelecek Projeksiyonu</h2>
            <p className="text-gray-400 text-sm mt-1">
              En az 3 aylık gelir verisiyle gelecek ay cirosunu analiz edin.
            </p>
          </div>
          <button
            onClick={handleGetForecast}
            disabled={isForecasting || incomeMonthCount < 3}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl transition disabled:bg-gray-700 disabled:cursor-not-allowed shadow-lg"
            title={
              incomeMonthCount < 3
                ? "Tahminleme için en az 3 farklı aya ait gelir işlemi gereklidir."
                : ""
            }
          >
            {isForecasting ? "Hesaplanıyor..." : "Trendi Analiz Et"}
          </button>
        </div>

        {forecast?.status === "success" && (
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
            <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
              <span className="text-gray-400 text-sm font-semibold">
                Gelecek Ay Ciro Tahmini (3+ ay veri)
              </span>
              <div className="text-3xl font-black mt-1 text-emerald-400">
                {Number(forecast.predicted_revenue || 0).toLocaleString(
                  "tr-TR",
                  { style: "currency", currency: "TRY" },
                )}
              </div>
              <div
                className={`text-sm font-bold mt-2 ${
                  Number(forecast.trend_percentage || 0) >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {Number(forecast.trend_percentage || 0) >= 0 ? "+" : ""}
                {forecast.trend_percentage}% büyüme trendi
              </div>
            </div>

            <div className="md:col-span-2 space-y-3">
              <div className="bg-indigo-900/50 p-4 rounded-xl border border-indigo-500/30">
                <h4 className="text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
                  AI Finansal Analiz
                </h4>
                <p className="text-sm leading-relaxed">{forecast.ai_insight}</p>
              </div>
              <div className="bg-emerald-900/30 p-4 rounded-xl border border-emerald-500/30">
                <h4 className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
                  Aksiyon Önerisi
                </h4>
                <p className="text-sm leading-relaxed text-emerald-50">
                  {forecast.action_recommendation}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm">
          <p className="text-xs font-black uppercase text-emerald-500">
            Bu Ay Gelir
          </p>
          <p className="mt-2 text-2xl font-black text-gray-900">
            {monthlySummary.income.toLocaleString("tr-TR", {
              style: "currency",
              currency: "TRY",
            })}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm">
          <p className="text-xs font-black uppercase text-red-500">
            Bu Ay Gider
          </p>
          <p className="mt-2 text-2xl font-black text-gray-900">
            {monthlySummary.expense.toLocaleString("tr-TR", {
              style: "currency",
              currency: "TRY",
            })}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-black uppercase text-gray-500">
            Bu Ay Net
          </p>
          <p
            className={`mt-2 text-2xl font-black ${
              monthlySummary.net >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {monthlySummary.net.toLocaleString("tr-TR", {
              style: "currency",
              currency: "TRY",
            })}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm">
          <p className="text-xs font-black uppercase text-indigo-500">
            En Yüksek Gider
          </p>
          <p className="mt-2 text-2xl font-black text-gray-900">
            {monthlySummary.topExpenseCategory}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">
              6 Aylık Trend
            </h3>
            <p className="text-sm text-gray-500">
              Gelir ve gider hareketlerinin aylık karşılaştırması.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              Gelir
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              Gider
            </span>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-3 items-end min-h-32">
          {monthlyTrend.map((month) => (
            <div key={month.key} className="flex flex-col items-center gap-2">
              <div className="flex items-end gap-1 h-24">
                <div
                  className="w-4 rounded-t bg-emerald-500"
                  style={{ height: `${month.incomeHeight}px` }}
                  title={`Gelir: ${month.income.toLocaleString("tr-TR", {
                    style: "currency",
                    currency: "TRY",
                  })}`}
                />
                <div
                  className="w-4 rounded-t bg-red-500"
                  style={{ height: `${month.expenseHeight}px` }}
                  title={`Gider: ${month.expense.toLocaleString("tr-TR", {
                    style: "currency",
                    currency: "TRY",
                  })}`}
                />
              </div>
              <span className="text-xs font-bold text-gray-500">
                {month.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 text-lg">
            Yeni İşlem Ekle
          </h3>
          <form onSubmit={handleAddTransaction} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                İşlem Tipi
              </label>
              <select
                className="w-full border rounded-xl p-3 bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500"
                value={newTx.type}
                onChange={(e) =>
                  setNewTx({
                    ...newTx,
                    type: e.target.value as Transaction["type"],
                    category:
                      e.target.value === "gider" ? newTx.category : "Genel",
                  })
                }
              >
                <option value="gelir">Gelir / Satış</option>
                <option value="gider">Gider / Harcama</option>
              </select>
            </div>
            {newTx.type === "gider" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Gider Kategorisi
                </label>
                <select
                  className="w-full border rounded-xl p-3 bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newTx.category}
                  onChange={(e) =>
                    setNewTx({ ...newTx, category: e.target.value })
                  }
                >
                  {expenseCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Tutar
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                placeholder="Örn: 1500"
                className="w-full border rounded-xl p-3 bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500"
                value={newTx.amount}
                onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Açıklama
              </label>
              <input
                type="text"
                required
                placeholder="Örn: Nakit satış, elektrik faturası..."
                className="w-full border rounded-xl p-3 bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500"
                value={newTx.description}
                onChange={(e) =>
                  setNewTx({ ...newTx, description: e.target.value })
                }
              />
            </div>
            <button
              type="submit"
              disabled={isAdding}
              className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 disabled:bg-gray-400 transition"
            >
              {isAdding ? "Kaydediliyor..." : "İşlemi Kaydet"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col gap-4 mb-6 border-b pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">
                Son Hareketler
              </h3>
              <p className="mt-1 text-xs font-medium text-gray-500">
                {filteredTransactions.length} / {transactions.length} işlem
                gösteriliyor.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              >
                <option value="all">Tüm zamanlar</option>
                <option value="7d">Son 7 gün</option>
                <option value="30d">Son 30 gün</option>
                <option value="90d">Son 90 gün</option>
              </select>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-semibold uppercase">
                  Filtre Bakiyesi
                </p>
                <p
                  className={`text-2xl font-black ${
                    filteredBalance >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {filteredBalance.toLocaleString("tr-TR", {
                    style: "currency",
                    currency: "TRY",
                  })}
                </p>
                {dateFilter !== "all" && (
                  <p className="text-[11px] text-gray-400">
                    Genel bakiye:{" "}
                    {totalBalance.toLocaleString("tr-TR", {
                      style: "currency",
                      currency: "TRY",
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-gray-500 mt-2 font-medium">
                Henüz bir finansal işlem girmediniz.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Tahminleme motorunu çalıştırmak için en az 3 gelir işlemi
                ekleyin.
              </p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-gray-600 font-bold">
                Seçilen dönemde işlem yok.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Farklı bir tarih filtresi seçerek tekrar deneyin.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {filteredTransactions.map((tx) => {
                const txDetails = getTransactionCategory(tx);

                return (
                  <div
                    key={tx.id}
                    className="flex justify-between items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition border border-transparent hover:border-gray-200"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-sm ${
                          tx.type === "gelir"
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {tx.type === "gelir" ? "+" : "-"}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-gray-900">
                            {txDetails.description}
                          </p>
                          {tx.type === "gider" && (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">
                              {txDetails.category}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(tx.created_at).toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "long",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`font-black text-lg ${
                        tx.type === "gelir"
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {Number(tx.amount).toLocaleString("tr-TR", {
                        style: "currency",
                        currency: "TRY",
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
