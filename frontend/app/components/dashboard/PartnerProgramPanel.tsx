"use client";

import { useEffect, useState } from "react";
import type { BusinessAccess } from "@/lib/platform/access";
import {
  buildPartnerDashboardStats,
  buildReferralLink,
  commissionRateLabel,
  formatTryAmount,
  type CommissionLedgerEntry,
  type PartnerProfile,
  type ReferralAttribution,
  resolvePartnerType,
} from "@/lib/partner-program";
import {
  ensurePartnerProfile,
  fetchPartnerProfile,
  listPartnerAttributions,
  listPartnerCommissionLedger,
} from "@/lib/repositories/partner-program";

interface PartnerProgramPanelProps {
  userId: string;
  access: BusinessAccess;
}

export default function PartnerProgramPanel({
  userId,
  access,
}: PartnerProgramPanelProps) {
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [attributions, setAttributions] = useState<ReferralAttribution[]>([]);
  const [ledger, setLedger] = useState<CommissionLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const partnerType = resolvePartnerType(access.profileRole);
  const isAgency = access.isAgencyAccount;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const loadPartnerData = async () => {
      setLoading(true);
      const nextProfile = await fetchPartnerProfile(userId);
      if (cancelled) return;

      if (nextProfile) {
        const [nextAttributions, nextLedger] = await Promise.all([
          listPartnerAttributions(userId),
          listPartnerCommissionLedger(userId),
        ]);
        if (cancelled) return;
        setProfile(nextProfile);
        setAttributions(nextAttributions);
        setLedger(nextLedger);
      } else {
        setProfile(null);
        setAttributions([]);
        setLedger([]);
      }
      setLoading(false);
    };

    void loadPartnerData();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleEnroll = async () => {
    if (!userId) return;
    setEnrolling(true);
    setStatusMessage("");
    try {
      const created = await ensurePartnerProfile({
        userId,
        partnerType,
      });
      if (!created) {
        setStatusMessage(
          "Partner programı tabloları henüz yüklenmemiş. Supabase migration 010 uygulayın.",
        );
        return;
      }
      setProfile(created);
      setStatusMessage(
        isAgency
          ? "Ajans partner profiliniz oluşturuldu."
          : "Referans partner profiliniz oluşturuldu.",
      );
    } catch {
      setStatusMessage("Partner profili oluşturulamadı.");
    } finally {
      setEnrolling(false);
    }
  };

  const handleCopyLink = async () => {
    if (!profile) return;
    const link = buildReferralLink(profile.referral_code);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setStatusMessage("Link kopyalanamadı.");
    }
  };

  const stats = buildPartnerDashboardStats(attributions, ledger);

  return (
    <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-widest text-indigo-600">
        Partner Programı
      </p>
      <h3 className="mt-1 text-lg font-black text-gray-900">
        {isAgency ? "Ajans komisyon modeli" : "Referans programı"}
      </h3>
      <p className="mt-2 text-sm text-gray-600">
        {isAgency
          ? "Yönlendirdiğiniz işletmeler Pro'ya geçtiğinde komisyon kazanın. Ajans hesaplarında varsayılan oran %20."
          : "Referans linkinizle kayıt olan işletmeler Pro'ya geçtiğinde %10 komisyon oluşur. Ödemeler manuel onaylanır."}
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">Yükleniyor...</p>
      ) : !profile ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={handleEnroll}
            disabled={enrolling}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {enrolling
              ? "Oluşturuluyor..."
              : isAgency
                ? "Ajans partner kodu oluştur"
                : "Referans kodu oluştur"}
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Referans" value={String(stats.totalReferrals)} />
            <StatCard
              label="Pro dönüşümü"
              value={String(stats.convertedReferrals)}
            />
            <StatCard
              label="Bekleyen komisyon"
              value={formatTryAmount(stats.pendingCommissionTry)}
            />
            <StatCard
              label="Ödenen komisyon"
              value={formatTryAmount(stats.paidCommissionTry)}
            />
          </div>

          <div className="rounded-2xl border border-white bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
              Referans kodunuz
            </p>
            <p className="mt-2 font-mono text-2xl font-black text-gray-900">
              {profile.referral_code}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Komisyon oranı:{" "}
              {commissionRateLabel(profile.commission_rate_bps)} · Tip:{" "}
              {profile.partner_type === "agency" ? "Ajans" : "Referans"}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                value={buildReferralLink(profile.referral_code)}
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-bold text-indigo-700"
              >
                {copied ? "Kopyalandı" : "Linki kopyala"}
              </button>
            </div>
          </div>

          {attributions.length > 0 && (
            <div>
              <h4 className="text-sm font-black text-gray-900">
                Yönlendirdiğiniz kayıtlar
              </h4>
              <ul className="mt-3 space-y-2">
                {attributions.slice(0, 5).map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm"
                  >
                    <span className="font-mono text-xs text-gray-600">
                      {item.referral_code}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        item.status === "converted"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.status === "converted"
                        ? "Pro dönüştü"
                        : "Pro bekliyor"}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-gray-500">
                Komisyon yalnızca Pro ödemesi tamamlandığında oluşur; bekleyen
                kayıtlarda henüz tutar yansımaz.
              </p>
            </div>
          )}

          {ledger.length > 0 && (
            <div>
              <h4 className="text-sm font-black text-gray-900">
                Son komisyon kayıtları
              </h4>
              <ul className="mt-3 space-y-2">
                {ledger.slice(0, 5).map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm"
                  >
                    <span>
                      {entry.event_type === "pro_activation"
                        ? "Pro aktivasyonu"
                        : "Abonelik ödemesi"}
                    </span>
                    <span className="font-bold text-gray-900">
                      {formatTryAmount(Number(entry.commission_amount_try))}
                      <span className="ml-2 text-xs font-medium text-gray-500">
                        ({entry.status})
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {statusMessage && (
        <p className="mt-4 text-sm font-medium text-indigo-800">{statusMessage}</p>
      )}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white bg-white px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-gray-900">{value}</p>
    </div>
  );
}