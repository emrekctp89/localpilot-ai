"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatTryAmount,
  type CommissionLedgerEntry,
} from "@/lib/partner-program";
import {
  listAdminCommissionQueue,
  triggerManualProCommission,
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
  const [manualUserId, setManualUserId] = useState("");
  const [manualInterval, setManualInterval] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [manualBusy, setManualBusy] = useState(false);
  const [manualMessage, setManualMessage] = useState("");

  const loadQueue = useCallback(async () => {
    setLoading(true);
    const nextRows = await listAdminCommissionQueue();
    setRows(nextRows);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadInitialQueue = async () => {
      const nextRows = await listAdminCommissionQueue();
      if (cancelled) return;
      setRows(nextRows);
      setLoading(false);
    };

    void loadInitialQueue();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleManualCommission = async (event: React.FormEvent) => {
    event.preventDefault();
    setManualBusy(true);
    setManualMessage("");
    const result = await triggerManualProCommission(
      manualUserId,
      manualInterval,
    );
    if (result.status === "success") {
      setManualMessage(
        result.detail ||
          (result.commission_amount_try != null
            ? `Komisyon eklendi: ₺${result.commission_amount_try}`
            : "Komisyon eklendi."),
      );
      setManualUserId("");
      await loadQueue();
    } else if (result.status === "ignored") {
      setManualMessage(result.detail || "İşlem atlandı.");
    } else {
      setManualMessage(result.detail || "Komisyon tetiklenemedi.");
    }
    setManualBusy(false);
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

      <form
        onSubmit={(e) => void handleManualCommission(e)}
        className="mt-5 rounded-xl border border-amber-100 bg-white p-4"
      >
        <p className="text-sm font-bold text-gray-900">
          Manuel Pro → komisyon
        </p>
        <p className="mt-1 text-xs text-gray-500">
          SQL ile <code className="font-mono">is_pro=true</code> yaptıktan
          sonra, referanslı kullanıcının UUID&apos;sini girin (migration 014).
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={manualUserId}
            onChange={(e) => setManualUserId(e.target.value)}
            placeholder="referred user UUID"
            className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm"
            required
            autoComplete="off"
            spellCheck={false}
          />
          <select
            value={manualInterval}
            onChange={(e) =>
              setManualInterval(e.target.value as "monthly" | "yearly")
            }
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700"
          >
            <option value="monthly">Aylık (₺299)</option>
            <option value="yearly">Yıllık (₺2.990)</option>
          </select>
          <button
            type="submit"
            disabled={manualBusy || !manualUserId.trim()}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-bold text-white hover:bg-amber-800 disabled:bg-gray-400"
          >
            {manualBusy ? "İşleniyor..." : "Komisyon yaz"}
          </button>
        </div>
        {manualMessage ? (
          <p className="mt-2 text-xs font-medium text-amber-900">
            {manualMessage}
          </p>
        ) : null}
      </form>

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
