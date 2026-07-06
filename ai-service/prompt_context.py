from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional


SECTOR_HINTS: Dict[str, str] = {
    "kuaför": "Randevu doluluğu, müşteri sadakati ve görsel portföy önemli.",
    "güzellik": "Randevu doluluğu, tekrar ziyaret ve Instagram dönüşümü kritik.",
    "restoran": "Masa doluluğu, paket servis ve mevsimsel menü kampanyaları önemli.",
    "kafe": "Sadık müşteri kartı, sabah/öğle yoğunluğu ve sosyal medya görünürlüğü önemli.",
    "emlak": "Portföy güncelliği, gösterim sonrası takip ve güven inşası kritik.",
    "klinik": "Randevu hatırlatma, güven veren iletişim ve kontrol randevusu akışı önemli.",
    "otomotiv": "Stok devir hızı, test sürüşü takibi ve finansman mesajları önemli.",
    "perakende": "Sepet ortalaması, stok dönüşü ve kampanya dönemleri kritik.",
    "tesisat": "Acil çağrı hızı, usta atama ve müşteri bilgilendirme önemli.",
    "üretim": "Kapasite kullanımı, B2B tekrar sipariş ve teslimat güveni kritik.",
}


def normalize_sector_text(value: str) -> str:
    return (value or "").strip().lower()


def get_sector_hints(sector: str = "", industry: str = "") -> str:
    combined = normalize_sector_text(f"{industry} {sector}")
    matches = [
        hint
        for keyword, hint in SECTOR_HINTS.items()
        if keyword in combined
    ]
    if not matches:
        return "Yerel güven, hızlı geri dönüş ve tekrar eden müşteri ilişkisi önemli."
    return " ".join(dict.fromkeys(matches))


def build_business_profile_block(
    *,
    business_name: str,
    sector: str = "",
    industry: str = "",
    city: str = "",
    target_audience: str = "",
    goals: Optional[Iterable[str]] = None,
    top_products: str = "",
    unique_selling_point: str = "",
    brand_tone: str = "",
) -> str:
    goal_text = ", ".join(goals) if goals else "Belirtilmedi"
    sector_hint = get_sector_hints(sector, industry)

    return f"""
İşletme Adı: {business_name or "Belirtilmedi"}
Sektör: {sector or industry or "Belirtilmedi"}
Alt Sektör / Endüstri: {industry or "Belirtilmedi"}
Şehir: {city or "Belirtilmedi"}
Hedef Kitle: {target_audience or "Belirtilmedi"}
Hedefler: {goal_text}
Öne Çıkan Ürün/Hizmetler: {top_products or "Belirtilmedi"}
Farklılaştırıcı Değer: {unique_selling_point or "Belirtilmedi"}
Marka Tonu: {brand_tone or "samimi"}
Sektör Odak Notu: {sector_hint}
""".strip()


def build_campaign_mode_instruction(
    mode: str,
    existing_campaigns: Optional[List[Dict[str, Any]]] = None,
    variant_index: Optional[int] = None,
) -> str:
    campaigns = existing_campaigns or []

    if mode == "variant" and variant_index is not None and campaigns:
        base = campaigns[variant_index] if 0 <= variant_index < len(campaigns) else {}
        return f"""
KAMPANYA MODU: VARYANT
Mevcut kampanyayı referans alarak aynı hedefe hizmet eden farklı bir varyant üret.
Referans kampanya: {base.get("campaign_name", "Belirtilmedi")}
Referans strateji: {base.get("strategy", "Belirtilmedi")}
Çıktıda tam 1 kampanya döndür (campaigns dizisinde tek eleman).
"""

    if mode == "regenerate" and campaigns:
        names = ", ".join(
            str(item.get("campaign_name", "")) for item in campaigns if item
        )
        return f"""
KAMPANYA MODU: YENİDEN ÜRET
Önceki kampanyalar: {names or "Yok"}
Önceki kampanyalardan farklı, taze ve daha uygulanabilir 3 yeni kampanya üret.
"""

    return """
KAMPANYA MODU: YENİ
İşletme profiline göre 3 uygulanabilir kampanya üret.
"""