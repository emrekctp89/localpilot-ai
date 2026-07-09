"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatTryAmount,
  type CommissionLedgerEntry,
} from "@/lib/partner-program";
import {
  listAdminCommissionQueue,
  updateCommissionStatus,
  type AdminCommissionRow,
} from "@/lib/repositories/partner-program";

const STATUS_LABELS: Record<CommissionLedgerEntry["status"], string> = {
  pending: "Bekliyor",
  approved: "Onaylandı",
  paid: "Ödendi",
  cancelled: "İptal",
};

export default function CommissionAdminPanel() {
  const [rows, setRows] = useState<AdminCommissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const loadQueue = useCallback(async () => {
    setLoading(true);
    const nextRows = await listAdminCommissionQueue();
    setRows(nextRows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const handleStatusChange = async (
    row: AdminCommissionRow,
    nextStatus: "approved" | "paid" | "cancelled",
  ) => {
    setUpdatingId(row.id);
    setStatusMessage("");
    const result = await updateCommissionStatus(row.id, row.status, nextStatus);
    if (!result.ok) {
      setStatusMessage(result.detail || "Komisyon güncellenemedi.");
      setUpdatingId(null);
      return;
    }
    setStatusMessage("Komisyon durumu güncellendi.");
    await loadQueue();
    setUpdatingId(null);
  };

  const activeRows = rows.filter((row) => row.status !== "cancelled");

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-widest text-amber-700">
        Komisyon Yönetimi
      </p>
      <h3 className="mt-1 text-lg font-black text-gray-900">
        Partner ödemeleri
      </h3>
      <p className="mt-2 text-sm text-gray-600">
        Bekleyen partner komisyonlarını panelden onaylayın veya ödendi olarak
        işaretleyin.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">Yükleniyor...</p>
      ) : activeRows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          İşlem bekleyen komisyon kaydı yok.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {activeRows.map((row) => (
            <li
              key={row.id}
              className="rounded-2xl border border-white bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-mono text-sm font-bold text-gray-900">
                    {row.partner_referral_code}
                    <span className="ml-2 text-xs font-medium text-gray-500">
                      ({row.partner_type === "agency" ? "Ajans" : "Referans"})
                    </span>
                  </p>
                  <p className="mt-1 text-lg font-black text-gray-900">
                    {formatTryAmount(Number(row.commission_amount_try))}
                    <span className="ml-2 text-sm font-medium text-gray-500">
                      / {formatTryAmount(Number(row.gross_amount_try))} brüt
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {row.event_type === "pro_activation"
                      ? "Pro aktivasyonu"
                      : "Abonelik ödemesi"}
                    {" · "}
                    {STATUS_LABELS[row.status]}
                    {row.referred_user_id
                      ? ` · Referral: ${row.referred_user_id.slice(0, 8)}…`
                      : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {row.status === "pending" && (
                    <>
                      <ActionButton
                        label="Onayla"
                        tone="indigo"
                        disabled={updatingId === row.id}
                        onClick={() => handleStatusChange(row, "approved")}
                      />
                      <ActionButton
                        label="Ödendi"
                        tone="emerald"
                        disabled={updatingId === row.id}
                        onClick={() => handleStatusChange(row, "paid")}
                      />
                      <ActionButton
                        label="İptal"
                        tone="gray"
                        disabled={updatingId === row.id}
                        onClick={() => handleStatusChange(row, "cancelled")}
                      />
                    </>
                  )}
                  {row.status === "approved" && (
                    <>
                      <ActionButton
                        label="Ödendi işaretle"
                        tone="emerald"
                        disabled={updatingId === row.id}
                        onClick={() => handleStatusChange(row, "paid")}
                      />
                      <ActionButton
                        label="İptal"
                        tone="gray"
                        disabled={updatingId === row.id}
                        onClick={() => handleStatusChange(row, "cancelled")}
                      />
                    </>
                  )}
                  {row.status === "paid" && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                      Tamamlandı
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {statusMessage && (
        <p className="mt-4 text-sm font-medium text-amber-900">{statusMessage}</p>
      )}
    </section>
  );
}

function ActionButton({
  label,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  tone: "indigo" | "emerald" | "gray";
  disabled: boolean;
  onClick: () => void;
}) {
  const toneClass =
    tone === "indigo"
      ? "bg-indigo-600 text-white hover:bg-indigo-700"
      : tone === "emerald"
        ? "bg-emerald-600 text-white hover:bg-emerald-700"
        : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-xs font-bold transition disabled:opacity-50 ${toneClass}`}
    >
      {label}
    </button>
  );
}