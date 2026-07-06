from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types
from supabase import create_client, Client
import json
import os
import stripe
import numpy as np
from sklearn.linear_model import LinearRegression
from datetime import datetime
from collections import defaultdict

from middleware.billing import create_pro_guard_middleware
from middleware.security import (
    auth_is_required,
    build_rate_limiter,
    create_auth_middleware,
    create_rate_limit_middleware,
    parse_allow_origin_regex,
    parse_allowed_origins,
)
from middleware.stripe_webhook import handle_stripe_event

# ------------------------------------------------------------
# ENV / CLIENT SETUP
# ------------------------------------------------------------
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
AI_SERVICE_API_KEY = os.getenv("AI_SERVICE_API_KEY", "").strip()
ALLOWED_ORIGINS = parse_allowed_origins(FRONTEND_URL)
ALLOW_ORIGIN_REGEX = parse_allow_origin_regex(FRONTEND_URL)

if not GEMINI_API_KEY:
    print("⚠️ GEMINI_API_KEY bulunamadı. .env dosyanı kontrol et.")
if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print(
        "⚠️ Supabase ayarları eksik. SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY kontrol et."
    )
if auth_is_required() and not AI_SERVICE_API_KEY:
    print(
        "ℹ️ AI servis auth aktif. Frontend Supabase oturum tokeni göndermeli."
    )

stripe.api_key = STRIPE_SECRET_KEY
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
gemini_client = genai.Client(api_key=GEMINI_API_KEY)

app = FastAPI(title="LocalPilot AI API", version="1.0.0-rc.1")

rate_limiter = build_rate_limiter()
app.middleware("http")(create_rate_limit_middleware(rate_limiter))
app.middleware("http")(create_pro_guard_middleware(supabase))
app.middleware("http")(create_auth_middleware(supabase, AI_SERVICE_API_KEY))
cors_kwargs = {
    "allow_origins": ALLOWED_ORIGINS,
    "allow_credentials": True,
    "allow_methods": ["GET", "POST", "OPTIONS"],
    "allow_headers": ["Authorization", "Content-Type", "X-API-Key", "stripe-signature"],
}
if ALLOW_ORIGIN_REGEX:
    cors_kwargs["allow_origin_regex"] = ALLOW_ORIGIN_REGEX

app.add_middleware(CORSMiddleware, **cors_kwargs)


@app.get("/health")
async def health():
    checks = {
        "gemini": bool(GEMINI_API_KEY),
        "supabase": bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY),
        "stripe": bool(STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET),
    }
    degraded = not all(checks.values())
    return {
        "status": "degraded" if degraded else "ok",
        "service": "localpilot-ai",
        "auth_required": auth_is_required(),
        "checks": checks,
    }


# ------------------------------------------------------------
# HELPERS
# ------------------------------------------------------------
def clean_and_parse_json(raw_text: str) -> Dict[str, Any]:
    """Gemini JSON mode açık olsa bile bazen markdown kalıntısı gelebilir."""
    if not raw_text:
        raise ValueError("AI boş cevap döndürdü.")

    text = raw_text.strip()
    if text.startswith("```json"):
        text = text[7:].strip()
    if text.startswith("```"):
        text = text[3:].strip()
    if text.endswith("```"):
        text = text[:-3].strip()

    return json.loads(text)


def generate_ai_json(
    system_instruction: str, user_prompt: str, temperature: float = 0.5
) -> Dict[str, Any]:
    response = gemini_client.models.generate_content(
        model=GEMINI_MODEL,
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            temperature=temperature,
        ),
    )
    return clean_and_parse_json(response.text)


def normalize_color(color_preference: str) -> str:
    if not color_preference or color_preference == "ai":
        return "blue"
    return color_preference


# ------------------------------------------------------------
# MODELS
# ------------------------------------------------------------
class BusinessInput(BaseModel):
    name: str
    sector: str
    city: str
    target_audience: str


class ReviewInput(BaseModel):
    business_name: str
    reviews: List[str]


class CampaignInput(BaseModel):
    business_name: str
    sector: str
    city: str
    target_audience: str


class CheckoutInput(BaseModel):
    user_id: str


class BusinessSetup(BaseModel):
    owner_id: str
    name: str
    industry: str
    city: str
    address: str = ""
    whatsapp_number: str = ""
    working_hours: str = ""
    business_type: str = ""
    goals: List[str] = Field(default_factory=list)
    top_products: str = ""
    target_audience: str = ""
    contact_points: List[str] = Field(default_factory=list)
    unique_selling_point: str = ""
    brand_tone: str = "samimi"
    color_preference: str = "ai"

    # Yeni AI kalitesini artıran opsiyonel alanlar.
    # Frontend henüz göndermiyorsa sorun çıkarmaz.
    business_description: Optional[str] = ""
    main_problem: Optional[str] = ""
    price_level: Optional[str] = ""
    current_digital_status: List[str] = Field(default_factory=list)
    desired_outputs: List[str] = Field(default_factory=list)


# ------------------------------------------------------------
# AI PROMPTS
# ------------------------------------------------------------
SETUP_SYSTEM_INSTRUCTION = """
Sen LocalPilot AI'ın işletme büyüme danışmanı, dijital pazarlama stratejisti ve panel kurulum motorusun.

Görevin sadece metin yazmak değil:
1. İşletmeyi analiz etmek
2. Hangi panel modüllerinin açılacağını seçmek
3. Her modülün neden açıldığını açıklamak
4. Mini site içeriği üretmek
5. WhatsApp hazır cevap şablonları üretmek
6. 7 günlük sosyal medya planı üretmek
7. 3 kampanya fikri üretmek
8. İşletme sahibine uygulanabilir 7 günlük aksiyon planı vermek

KURALLAR:
- Çıktın kesinlikle valid JSON olmalı. Markdown kullanma.
- Genel, klişe ve her işletmeye uyacak ifadeler kullanma.
- Şehir, sektör, hedef kitle, popüler ürünler, marka dili, fiyat seviyesi ve iletişim kanallarına göre özelleştir.
- Sahte müşteri yorumları oluştururken gerçek kişi gibi tam isim yazma; "Ayşe K." gibi kısaltmalı isim kullan.
- Kampanyalar uygulanabilir olmalı; işletmenin sektörüne ters düşmemeli.
- WhatsApp mesajları Türkçe, kısa, emojili ve kopyalanmaya hazır olmalı.
- social_media_calendar tam 7 gün olmalı.
- whatsapp_templates en az 5 şablon olmalı.
- campaigns tam 3 kampanya olmalı.
- active_modules değerleri sadece şu havuzdan seçilmeli:
  ["ozet", "mini_site", "whatsapp", "sosyal_medya", "kampanya", "crm", "randevu", "menu", "yorum_analizi", "kasa", "gorevler"]

JSON ŞEMASI:
{
  "business_diagnosis": {
    "summary": "İşletmenin 1-2 cümlelik net analizi.",
    "main_growth_opportunity": "En büyük büyüme fırsatı.",
    "biggest_risk": "Dikkat edilmesi gereken ana risk.",
    "ideal_first_focus": "İlk odaklanması gereken konu."
  },
  "active_modules": ["ozet", "mini_site", "whatsapp", "kampanya", "sosyal_medya"],
  "module_reasons": {
    "mini_site": "Bu modül neden açıldı?",
    "whatsapp": "Bu modül neden açıldı?"
  },
  "theme_config": {
    "primaryColor": "blue | green | purple | orange | red | pink | black",
    "template": "service_local | food_menu | appointment_based | retail_showcase | professional_trust"
  },
  "mini_site_data": {
    "hero_slogan": "Vurucu, kısa slogan.",
    "hero_icon": "✨",
    "cta_text": "WhatsApp'tan Bilgi Al",
    "about_us": "Marka diline uygun, güven veren 2-3 cümlelik hakkımızda yazısı.",
    "features": ["Kısa avantaj 1", "Kısa avantaj 2", "Kısa avantaj 3"],
    "testimonials": [
      {"name": "Müşteri 1", "comment": "Doğal ve kısa yorum."},
      {"name": "Müşteri 2", "comment": "Doğal ve kısa yorum."}
    ]
  },
  "social_media_calendar": [
    {
      "day": 1,
      "platform": "Instagram",
      "post_type": "Reels | Post | Story",
      "title": "İçerik başlığı",
      "caption": "Paylaşım metni",
      "visual_idea": "Görsel/video fikri",
      "cta": "Harekete geçirici çağrı"
    }
  ],
  "whatsapp_templates": [
    {
      "scenario": "Fiyat soran müşteri",
      "message": "Kopyalanmaya hazır mesaj"
    }
  ],
  "campaigns": [
    {
      "campaign_name": "Kampanya adı",
      "goal": "Kampanyanın hedefi",
      "offer": "Teklif/indirim/avantaj",
      "strategy": "Neden çalışır ve nasıl uygulanır?",
      "sms_whatsapp_template": "Kampanya duyuru mesajı"
    }
  ],
  "quick_wins": ["Hemen yapılabilecek kısa aksiyon 1", "Aksiyon 2", "Aksiyon 3"],
  "next_7_days_plan": [
    {"day": 1, "task": "Bugünün görevi", "expected_result": "Beklenen sonuç"}
  ]
}
"""

class TransactionInput(BaseModel):
    date: str  # Örn: '2026-06-07T14:30:00' veya '2026-06-07'
    amount: float
    type: str  # 'gelir' veya 'gider'

class FinanceForecastRequest(BaseModel):
    business_name: str
    transactions: List[TransactionInput]
    

class CustomerInput(BaseModel):
    full_name: str
    status: Optional[str] = None
    created_at: Optional[str] = None

class ChurnRequest(BaseModel):
    business_name: str
    customers: List[CustomerInput]
    
# ------------------------------------------------------------
# ENDPOINTS
# ------------------------------------------------------------
@app.post("/generate-plan")
async def generate_plan(business: BusinessInput):
    try:
        system_instruction = """
        Sen LocalPilot AI platformunun akıllı mimarısın.
        Verilen işletmeye göre aktif modülleri, tema ayarını ve mini site içeriğini üret.
        Çıktın kesinlikle JSON olmalı.
        {
          "active_modules": ["ozet", "mini_site", "whatsapp", "kampanya"],
          "theme_config": {"primaryColor": "blue", "template": "service_local"},
          "mini_site_data": {
            "hero_slogan": "...",
            "hero_icon": "✨",
            "cta_text": "Bize Ulaşın",
            "about_us": "...",
            "features": ["...", "...", "..."],
            "testimonials": [{"name": "Ayşe K.", "comment": "..."}]
          }
        }
        """
        user_prompt = f"""
        İşletme Adı: {business.name}
        Sektör: {business.sector}
        Şehir: {business.city}
        Hedef Kitle: {business.target_audience}
        """
        return generate_ai_json(system_instruction, user_prompt, temperature=0.6)
    except Exception as e:
        print(f"🚨 GENERATE PLAN HATASI: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI Hatası: {str(e)}")


@app.post("/analyze-reviews")
async def analyze_reviews(data: ReviewInput):
    try:
        system_instruction = """
        Sen LocalPilot AI'sın. Sana bir işletmenin müşteri yorumları verilecek.
        Bu yorumları analiz et ve işletme sahibi için yapıcı bir özet çıkar.
        Çıktın kesinlikle JSON olmalı.
        {
          "positive_highlights": ["...", "..."],
          "negative_highlights": ["...", "..."],
          "actionable_advice": ["...", "..."],
          "overall_sentiment": "Pozitif | Nötr | Negatif",
          "reply_templates": [
            {"type": "positive_review", "message": "..."},
            {"type": "negative_review", "message": "..."}
          ]
        }
        """
        reviews_text = "\n".join([f"- {r}" for r in data.reviews])
        user_prompt = f"""
        İşletme Adı: {data.business_name}
        Müşteri Yorumları:
        {reviews_text}
        """
        return generate_ai_json(system_instruction, user_prompt, temperature=0.3)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analiz Hatası: {str(e)}")


@app.post("/generate-campaigns")
async def generate_campaigns(data: CampaignInput):
    try:
        system_instruction = """
        Sen LocalPilot AI'sın. İşletmelerin satışlarını artıracak yaratıcı ve yerel pazarlama kampanyaları üretirsin.
        Verilen işletme bilgileri ve hedef kitleye uygun 3 adet uygulanabilir kampanya fikri oluştur.
        Çıktın kesinlikle JSON olmalı.
        {
          "campaigns": [
            {
              "campaign_name": "...",
              "goal": "...",
              "offer": "...",
              "strategy": "...",
              "sms_whatsapp_template": "..."
            }
          ]
        }
        """
        user_prompt = f"""
        İşletme Adı: {data.business_name}
        Sektör: {data.sector}
        Şehir: {data.city}
        Hedef Kitle: {data.target_audience}
        """
        return generate_ai_json(system_instruction, user_prompt, temperature=0.8)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kampanya Hatası: {str(e)}")


@app.post("/create-checkout-session")
async def create_checkout_session(data: CheckoutInput):
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "try",
                        "product_data": {
                            "name": "LocalPilot AI - Pro Paket",
                            "description": "WhatsApp Asistanı ve Akıllı Kampanya Motoru erişimi.",
                        },
                        "unit_amount": 29900,
                    },
                    "quantity": 1,
                }
            ],
            mode="payment",
            success_url=f"{FRONTEND_URL}/dashboard?payment=success",
            cancel_url=f"{FRONTEND_URL}/dashboard?payment=cancel",
            metadata={"user_id": data.user_id},
        )
        return {"url": session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/stripe-webhook")
async def stripe_webhook(request: Request):
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Stripe webhook yapılandırılmamış.",
        )

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        print(f"stripe_webhook_verify_failed error={e}")
        raise HTTPException(status_code=400, detail=f"Webhook Hatası: {str(e)}")

    result, status_code = handle_stripe_event(event, supabase)
    if status_code >= 500:
        print(f"stripe_webhook_handler_failed detail={result.get('detail')}")
        raise HTTPException(status_code=status_code, detail=result.get("detail"))

    return result


@app.post("/forecast-finance")
async def forecast_finance(data: FinanceForecastRequest):
    try:
        # 1. ADIM: Sadece gelir işlemlerini filtrele (Ciro Tahmini için)
        incomes = [t for t in data.transactions if t.type == "gelir"]
        
        # En az 3 veri noktası yoksa tahmin yapmak istatistiksel olarak yanıltıcı olur
        if len(incomes) < 3:
             return {
                 "status": "insufficient_data",
                 "message": "Sağlıklı bir yapay zeka tahmini yapabilmemiz için sistemde en az 3 gelir işlemine ihtiyacımız var."
             }
             
        # 2. ADIM: Verileri tarihe göre grupla ve günlük toplam ciroyu bul
        daily_revenue = defaultdict(float)
        for t in incomes:
            date_str = t.date.split("T")[0] # Sadece YYYY-MM-DD kısmını al
            daily_revenue[date_str] += t.amount
            
        sorted_dates = sorted(daily_revenue.keys())
        
        # 3. ADIM: Makine Öğrenmesi için X (Günler) ve y (Ciro) matrislerini hazırla
        start_date = datetime.strptime(sorted_dates[0], "%Y-%m-%d")
        
        X = []
        y = []
        
        for d_str in sorted_dates:
            d_obj = datetime.strptime(d_str, "%Y-%m-%d")
            delta_days = (d_obj - start_date).days
            X.append([delta_days])
            y.append(daily_revenue[d_str])
            
        X = np.array(X)
        y = np.array(y)
        
        # 4. ADIM: Doğrusal Regresyon (Linear Regression) Modelini Eğit
        model = LinearRegression()
        model.fit(X, y)
        
        # Gelecek 30 günü tahmin et
        last_day = X[-1][0]
        future_X = np.array([[last_day + i] for i in range(1, 31)])
        future_predictions = model.predict(future_X)
        
        # İstatistiksel sapmaları (negatif ciro ihtimalini) 0'a sabitle
        future_predictions = np.maximum(future_predictions, 0)
        
        predicted_next_30_days_total = float(np.sum(future_predictions))
        current_total = float(np.sum(y))
        
        # Yüzdelik büyüme/küçülme trendi
        trend_percentage = 0.0
        if current_total > 0:
            trend_percentage = ((predicted_next_30_days_total - current_total) / current_total) * 100
            
        # 5. ADIM: LLM (Generative AI) ile sonuçları işletme sahibi için yorumla
        system_instruction = """
        Sen LocalPilot'un uzman finansal analisti ve veri bilimcisisin. 
        Sana Makine Öğrenmesi (Regresyon) modelinin bir işletme için ürettiği istatistiksel ciro tahminleri verilecek.
        Görevin, bu matematiği işletme sahibinin anlayacağı, onu motive edecek ve ne yapması gerektiğini söyleyen 
        "CEO özetine" çevirmek. "Regresyon, model, algoritma" gibi teknik kelimeler KULLANMA.
        
        Çıktın kesinlikle JSON olmalı. Format:
        {
          "ai_insight": "Trend durumunu özetleyen 1 cümle.",
          "action_recommendation": "Ciroyu artırmak veya korumak için 1 pratik tavsiye."
        }
        """
        
        user_prompt = f"""
        İşletme: {data.business_name}
        Mevcut Toplam Ciro: {current_total} TL
        Gelecek 30 Gün Tahmini: {predicted_next_30_days_total:.2f} TL
        Trend: %{trend_percentage:.2f}
        """
        
        ai_commentary = generate_ai_json(system_instruction, user_prompt, temperature=0.6)
            
        return {
            "status": "success",
            "current_revenue": current_total,
            "predicted_revenue": round(predicted_next_30_days_total, 2),
            "trend_percentage": round(trend_percentage, 1),
            "ai_insight": ai_commentary.get("ai_insight"),
            "action_recommendation": ai_commentary.get("action_recommendation")
        }

    except Exception as e:
        print(f"🚨 TAHMİNLEME HATASI: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Finansal analiz oluşturulamadı: {str(e)}")
    
    
    
@app.post("/analyze-churn")
async def analyze_churn(data: ChurnRequest):
    try:
        if len(data.customers) == 0:
            return {"status": "error", "message": "Analiz edilecek müşteri bulunamadı."}

        # Sadece son 50 müşteriyi analiz et (Token tasarrufu için)
        customers_data = [{"isim": c.full_name, "durum": c.status, "kayit_tarihi": c.created_at} for c in data.customers[:50]]
        
        system_instruction = """
        Sen LocalPilot'un uzman Müşteri Sadakati (Retention) ve CRM yöneticisisin.
        Sana bir işletmenin müşteri listesi verilecek. 
        Görevin:
        1. Listeye bakarak "Yeni Potansiyel" olup uzun süredir "Kazanıldı"ya dönmeyenleri veya genel olarak riskli gördüğün müşterileri tespit et.
        2. Bu müşterileri geri kazanmak (Win-back) için reddedemeyecekleri, samimi ve emojili 1 adet WhatsApp kampanya mesajı yaz.
        
        Çıktın KESİNLİKLE JSON formatında olmalı:
        {
          "risk_level": "Yüksek | Orta | Düşük",
          "at_risk_count": 5,
          "at_risk_names": ["Müşteri 1", "Müşteri 2"],
          "insight": "Müşterilerin genel durumunu özetleyen 1 cümlelik analiz.",
          "win_back_message": "Riskli müşterilere atılacak Sizi Özledik temalı WhatsApp mesajı."
        }
        """
        
        user_prompt = f"""
        İşletme Adı: {data.business_name}
        Müşteri Listesi (Son 50): {json.dumps(customers_data, ensure_ascii=False)}
        """
        
        ai_analysis = generate_ai_json(system_instruction, user_prompt, temperature=0.5)
        ai_analysis["status"] = "success"
        
        return ai_analysis

    except Exception as e:
        print(f"🚨 CHURN ANALİZ HATASI: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Churn analizi oluşturulamadı: {str(e)}")

 
@app.post("/setup-business")
async def setup_business(data: BusinessSetup):
    user_prompt = f"""
    İşletme Adı: {data.name}
    Şehir: {data.city}
    Sektör: {data.industry}
    Kısa Açıklama: {data.business_description or 'Belirtilmedi'}
    Adres: {data.address or 'Belirtilmedi'}
    WhatsApp No: {data.whatsapp_number or 'Belirtilmedi'}
    Çalışma Saatleri: {data.working_hours or 'Belirtilmedi'}
    İşletme Modeli: {data.business_type or 'Belirtilmedi'}
    Ana Hedefleri: {', '.join(data.goals) if data.goals else 'Belirtilmedi'}
    Ana Problem: {data.main_problem or 'Belirtilmedi'}
    En Popüler Ürün/Hizmetler: {data.top_products or 'Belirtilmedi'}
    Müşteri Kitlesi: {data.target_audience or 'Belirtilmedi'}
    Fiyat Seviyesi: {data.price_level or 'Belirtilmedi'}
    İşletmeyi Özel Yapan Şey: {data.unique_selling_point or 'Belirtilmedi'}
    Aktif İletişim Kanalları: {', '.join(data.contact_points) if data.contact_points else 'Belirtilmedi'}
    Mevcut Dijital Durum: {', '.join(data.current_digital_status) if data.current_digital_status else 'Belirtilmedi'}
    İstenen AI Çıktıları: {', '.join(data.desired_outputs) if data.desired_outputs else 'Belirtilmedi'}
    Marka Dili: {data.brand_tone}
    İstenen Renk: {data.color_preference}
    """

    # 🚀 ADIM 1: AI BUSINESS OS KURULUMU
    try:
        ai_decision = generate_ai_json(
            SETUP_SYSTEM_INSTRUCTION, user_prompt, temperature=0.5
        )
    except Exception as e:
        print(f"🚨 SETUP AI HATASI: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Kurulum Hatası: {str(e)}")

    # AI bazen eksik alan döndürürse güvenli fallbackler
    active_modules = ai_decision.get("active_modules") or [
        "ozet",
        "mini_site",
        "whatsapp",
        "kampanya",
        "sosyal_medya",
    ]
    theme_config = ai_decision.get("theme_config") or {
        "primaryColor": normalize_color(data.color_preference),
        "template": "service_local",
    }

    # 🚀 ADIM 2: SUPABASE'E İŞLETMEYİ KAYDET
    try:
        new_biz = (
            supabase.table("businesses")
            .insert(
                {
                    "owner_id": data.owner_id,
                    "name": data.name,
                    "sector": data.industry,
                    "industry": data.industry,
                    "city": data.city,
                    "address": data.address,
                    "whatsapp_number": data.whatsapp_number,
                    "working_hours": data.working_hours,
                    "business_type": data.business_type,
                    "goals": data.goals,
                    "top_products": data.top_products,
                    "target_audience": data.target_audience,
                    "contact_points": data.contact_points,
                    "unique_selling_point": data.unique_selling_point,
                    "brand_tone": data.brand_tone,
                    "color_preference": data.color_preference,
                    "active_modules": active_modules,
                    "theme_config": theme_config,
                }
            )
            .execute()
        )

        business_id = new_biz.data[0]["id"]

        # Mevcut generated_plans şeması dar olabilir. Önce gelişmiş kayıt dener,
        # kolon yoksa minimum şemaya geri düşer.
        advanced_plan_payload = {
            "business_id": business_id,
            "mini_site_data": ai_decision.get("mini_site_data", {}),
            "social_media_calendar": ai_decision.get("social_media_calendar", []),
            "whatsapp_templates": ai_decision.get("whatsapp_templates", []),
            "campaigns": ai_decision.get("campaigns", []),
            "business_diagnosis": ai_decision.get("business_diagnosis", {}),
            "module_reasons": ai_decision.get("module_reasons", {}),
            "quick_wins": ai_decision.get("quick_wins", []),
            "next_7_days_plan": ai_decision.get("next_7_days_plan", []),
        }

        try:
            supabase.table("generated_plans").insert(advanced_plan_payload).execute()
        except Exception as plan_error:
            print(f"⚠️ Gelişmiş plan kolonları eksik olabilir: {str(plan_error)}")
            # Şema migration yapmadıysan bu fallback sayesinde uygulama patlamaz.
            compact_mini_site_data = ai_decision.get("mini_site_data", {})
            compact_mini_site_data["business_diagnosis"] = ai_decision.get(
                "business_diagnosis", {}
            )
            compact_mini_site_data["module_reasons"] = ai_decision.get(
                "module_reasons", {}
            )
            compact_mini_site_data["quick_wins"] = ai_decision.get("quick_wins", [])
            compact_mini_site_data["next_7_days_plan"] = ai_decision.get(
                "next_7_days_plan", []
            )
            compact_mini_site_data["campaigns"] = ai_decision.get("campaigns", [])

            supabase.table("generated_plans").insert(
                {
                    "business_id": business_id,
                    "mini_site_data": compact_mini_site_data,
                    "social_media_calendar": ai_decision.get(
                        "social_media_calendar", []
                    ),
                    "whatsapp_templates": ai_decision.get("whatsapp_templates", []),
                }
            ).execute()

        return {
            "status": "success",
            "business": new_biz.data[0],
            "ai_decision": ai_decision,
            "setup_summary": {
                "active_modules": active_modules,
                "created_outputs": {
                    "mini_site": bool(ai_decision.get("mini_site_data")),
                    "social_media_posts": len(
                        ai_decision.get("social_media_calendar", [])
                    ),
                    "whatsapp_templates": len(
                        ai_decision.get("whatsapp_templates", [])
                    ),
                    "campaigns": len(ai_decision.get("campaigns", [])),
                    "quick_wins": len(ai_decision.get("quick_wins", [])),
                },
            },
        }



    except Exception as e:
        print(f"🚨 SUPABASE KAYIT HATASI: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Veritabanı kayıt hatası: {str(e)}"
        )
