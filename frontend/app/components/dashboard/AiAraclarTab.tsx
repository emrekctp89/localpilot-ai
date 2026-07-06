import React, { useState } from "react";
import type { ReviewAnalysisResult } from "@/lib/ai-client";
import type { Campaign } from "@/lib/domain-types";

interface AiAraclarTabProps {
  campaigns: Campaign[];
  isGeneratingCampaigns: boolean;
  campaignSaveStatus?: "idle" | "saved" | "error";
  handleGenerateCampaigns: () => void;
  handleGenerateCampaignVariant: (index: number) => Promise<void>;
  handleUpdateCampaign: (index: number, campaign: Campaign) => Promise<void>;
  variantIndex?: number | null;
  onSendReviewToDecisionCenter?: () => void;
  isSendingReviewDecision?: boolean;
  reviewsText: string;
  setReviewsText: (text: string) => void;
  isAnalyzing: boolean;
  handleAnalyzeReviews: () => void;
  analysisResult: ReviewAnalysisResult | null;
  copyToClipboard: (text: string) => void;
  isPro?: boolean;
  handleUpgradeToPro?: () => void;
}

export default function AiAraclarTab({
  campaigns,
  isGeneratingCampaigns,
  campaignSaveStatus = "idle",
  handleGenerateCampaigns,
  handleGenerateCampaignVariant,
  handleUpdateCampaign,
  variantIndex = null,
  onSendReviewToDecisionCenter,
  isSendingReviewDecision = false,
  reviewsText,
  setReviewsText,
  isAnalyzing,
  handleAnalyzeReviews,
  analysisResult,
  copyToClipboard,
  isPro = true,
  handleUpgradeToPro,
}: AiAraclarTabProps) {
  const sentiment = analysisResult?.overall_sentiment?.toLowerCase() || "";
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);

  const startEditingCampaign = (campaign: Campaign, index: number) => {
    setEditingIndex(index);
    setEditingCampaign({ ...campaign });
  };

  const cancelEditingCampaign = () => {
    setEditingIndex(null);
    setEditingCampaign(null);
  };

  const saveEditingCampaign = async () => {
    if (editingIndex === null || !editingCampaign) return;
    setIsSavingCampaign(true);
    try {
      await handleUpdateCampaign(editingIndex, editingCampaign);
      cancelEditingCampaign();
    } finally {
      setIsSavingCampaign(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow border-t-4 border-indigo-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Akilli Kampanya Motoru
              <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full uppercase tracking-wide">
                Premium
              </span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Isletmenize ozel kampanya fikirleri ve SMS/WhatsApp sablonlari.
            </p>
          </div>
          <button
            onClick={handleGenerateCampaigns}
            disabled={isGeneratingCampaigns || !isPro}
            className="w-full md:w-auto bg-indigo-600 text-white font-bold py-2 px-4 rounded hover:bg-indigo-700 disabled:bg-gray-400 transition shadow-sm whitespace-nowrap"
          >
            {isGeneratingCampaigns && variantIndex === null
              ? "Üretiliyor..."
              : campaigns.length > 0
                ? "Yeniden Üret"
                : "Fikir Üret"}
          </button>
        </div>

        {campaignSaveStatus === "saved" && (
          <p className="mb-4 text-sm font-medium text-green-700">
            Kampanyalar kaydedildi. Sayfayi yenileseniz de burada gorunecek.
          </p>
        )}

        {campaignSaveStatus === "error" && (
          <p className="mb-4 text-sm font-medium text-red-700">
            Kampanyalar uretildi ancak kaydedilemedi. Lutfen tekrar deneyin.
          </p>
        )}

        {!isPro && handleUpgradeToPro && (
          <div className="bg-gray-50 p-4 rounded-md border border-dashed border-gray-300 text-center mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Bu ozelligi kullanmak icin Pro pakete gecmelisiniz.
            </p>
            <button
              onClick={handleUpgradeToPro}
              className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 font-bold"
            >
              Proya Yukselt
            </button>
          </div>
        )}

        {campaigns.length > 0 && isPro && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 animate-fade-in-up">
            {campaigns.map((camp, index) => (
              <div
                key={`${camp.campaign_name}-${index}`}
                className="bg-indigo-50 rounded-lg p-4 border border-indigo-100 flex flex-col h-full hover:shadow-md transition"
              >
                {editingIndex === index && editingCampaign ? (
                  <div className="space-y-3 mb-4">
                    <input
                      value={editingCampaign.campaign_name}
                      onChange={(event) =>
                        setEditingCampaign({
                          ...editingCampaign,
                          campaign_name: event.target.value,
                        })
                      }
                      className="w-full rounded border border-indigo-200 bg-white px-3 py-2 text-sm font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500"
                      aria-label="Kampanya adi"
                    />
                    <textarea
                      value={editingCampaign.strategy}
                      onChange={(event) =>
                        setEditingCampaign({
                          ...editingCampaign,
                          strategy: event.target.value,
                        })
                      }
                      className="min-h-28 w-full rounded border border-indigo-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      aria-label="Kampanya stratejisi"
                    />
                    <textarea
                      value={editingCampaign.sms_whatsapp_template}
                      onChange={(event) =>
                        setEditingCampaign({
                          ...editingCampaign,
                          sms_whatsapp_template: event.target.value,
                        })
                      }
                      className="min-h-24 w-full rounded border border-indigo-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      aria-label="Mesaj sablonu"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveEditingCampaign}
                        disabled={isSavingCampaign}
                        className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:bg-gray-400"
                      >
                        {isSavingCampaign ? "Kaydediliyor..." : "Kaydet"}
                      </button>
                      <button
                        onClick={cancelEditingCampaign}
                        disabled={isSavingCampaign}
                        className="rounded bg-white px-3 py-1.5 text-xs font-bold text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-60"
                      >
                        Vazgec
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-bold text-indigo-900 text-lg leading-tight">
                        {camp.campaign_name}
                      </h3>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => startEditingCampaign(camp, index)}
                          className="text-xs bg-white hover:bg-indigo-100 text-indigo-700 px-2 py-1 rounded border border-indigo-200 font-bold"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleGenerateCampaignVariant(index)}
                          disabled={isGeneratingCampaigns}
                          className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded font-bold disabled:bg-gray-400"
                        >
                          {isGeneratingCampaigns && variantIndex === index
                            ? "Üretiliyor..."
                            : "Varyant Üret"}
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mb-4 flex-grow">
                      <strong>Strateji:</strong> {camp.strategy}
                    </p>
                  </>
                )}
                {editingIndex !== index && (
                  <div className="bg-white p-3 rounded border border-indigo-200 relative group">
                    <span className="text-xs font-bold text-indigo-400 mb-1 block">
                      Mesaj Sablonu
                    </span>
                    <p className="text-sm text-gray-800 italic">
                      &quot;{camp.sms_whatsapp_template}&quot;
                    </p>
                    <button
                      onClick={() => copyToClipboard(camp.sms_whatsapp_template)}
                      className="absolute top-2 right-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
                    >
                      Kopyala
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow border-t-4 border-purple-500">
        <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
          AI Yorum Analizi
          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full uppercase tracking-wide">
            Premium
          </span>
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Musteri yorumlarini asagiya yapistirin, yapay zeka analiz etsin.
        </p>
        <textarea
          className="w-full border rounded p-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500 h-32"
          placeholder="Yorum 1...&#10;Yorum 2...&#10;Yorum 3..."
          value={reviewsText}
          onChange={(e) => setReviewsText(e.target.value)}
          disabled={!isPro}
        />

        {!isPro && handleUpgradeToPro ? (
          <button
            onClick={handleUpgradeToPro}
            className="w-full bg-gray-400 text-white font-bold py-2 px-4 rounded hover:bg-gray-500 transition flex justify-center items-center gap-2"
          >
            Kilidi Acmak Icin Proya Gecin
          </button>
        ) : (
          <button
            onClick={handleAnalyzeReviews}
            disabled={isAnalyzing || !isPro}
            className="w-full bg-purple-600 text-white font-bold py-2 px-4 rounded hover:bg-purple-700 disabled:bg-gray-400 transition"
          >
            {isAnalyzing ? "Yorumlar Analiz Ediliyor..." : "Yorumlari Analiz Et"}
          </button>
        )}

        {analysisResult && isPro && (
          <div className="mt-6 space-y-4 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-gray-700">Genel Duygu:</span>
              <span
                className={`px-3 py-1 rounded text-sm font-bold ${
                  sentiment.includes("pozitif")
                    ? "bg-green-100 text-green-800"
                    : sentiment.includes("negatif")
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                {analysisResult.overall_sentiment}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded border border-green-200">
                <h3 className="font-bold text-green-800 mb-2">
                  Neleri Sevdiler?
                </h3>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  {(analysisResult.positive_highlights ?? []).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-red-50 p-4 rounded border border-red-200">
                <h3 className="font-bold text-red-800 mb-2">
                  Nelerden Sikayetciler?
                </h3>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  {(analysisResult.negative_highlights ?? []).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded border border-blue-200 mt-4">
              <h3 className="font-bold text-blue-800 mb-2">
                Aksiyon Tavsiyeleri
              </h3>
              <ul className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
                {(analysisResult.actionable_advice ?? []).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            {analysisResult.decision_bridge && onSendReviewToDecisionCenter && (
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-violet-700">
                  Karar Merkezi Köprüsü
                </p>
                <p className="mt-2 text-sm font-bold text-violet-950">
                  {analysisResult.decision_bridge.signal}
                </p>
                <p className="mt-2 text-sm text-violet-900">
                  {analysisResult.decision_bridge.recommendation}
                </p>
                <button
                  type="button"
                  onClick={onSendReviewToDecisionCenter}
                  disabled={isSendingReviewDecision}
                  className="mt-4 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:bg-gray-400"
                >
                  {isSendingReviewDecision
                    ? "Karar Merkezi'ne aktarılıyor..."
                    : "Karar Merkezi'ne Aktar"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
