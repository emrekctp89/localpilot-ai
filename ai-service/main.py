from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
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

from middleware.ai_usage import (
    build_pro_usage_snapshot,
    get_usage_snapshot,
)
from middleware.billing import create_pro_guard_middleware, fetch_user_is_pro
from middleware.config import (
    is_development,
    is_origin_allowed,
    resolve_stripe_mode,
)
from middleware.platform_api import (
    fetch_business_summary,
    verify_business_api_key,
)
from middleware.security import (
    auth_is_required,
    build_rate_limiter,
    create_auth_middleware,
    create_rate_limit_middleware,
    parse_allow_origin_regex,
    parse_allowed_origins,
)
from middleware.stripe_checkout import confirm_pro_checkout
from middleware.stripe_webhook import handle_stripe_event
from ai_cache import (
    build_cache_key,
    get_cache_stats,
    get_cached_response,
    set_cached_response,
)
from prompt_context import (
    build_business_profile_block,
    build_campaign_mode_instruction,
)
from integrations.ai_feedback import save_ai_feedback
from integrations.business_access import require_business_write_access
from integrations.google_business_oauth import (
    apply_profile_field_with_refresh,
    build_google_oauth_url,
    build_google_status,
    build_oauth_state,
    discover_primary_location,
    exchange_code_for_tokens,
    google_env_configured,
    parse_oauth_state,
)
from integrations.store import get_integration, upsert_integration
from integrations.whatsapp_cloud import (
    build_whatsapp_status,
    send_whatsapp_text_message,
    whatsapp_env_configured,
)

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
    "allow_headers": ["*"],
}
if ALLOW_ORIGIN_REGEX:
    cors_kwargs["allow_origin_regex"] = ALLOW_ORIGIN_REGEX

app.add_middleware(CORSMiddleware, **cors_kwargs)


def _cors_preflight_response(origin: str) -> Response:
    return Response(
        status_code=204,
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Authorization, Content-Type, X-API-Key, stripe-signature",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "600",
        },
    )


@app.get("/")
async def root():
    return {
        "service": "localpilot-ai",
        "status": "running",
        "health": "/health",
        "docs": "/docs",
    }


@app.options("/health")
async def health_preflight(request: Request):
    origin = request.headers.get("origin", "")
    if is_origin_allowed(origin, ALLOWED_ORIGINS, ALLOW_ORIGIN_REGEX):
        return _cors_preflight_response(origin)
    return Response(status_code=400)


@app.get("/health")
async def health():
    checks = {
        "gemini": bool(GEMINI_API_KEY),
        "supabase": bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY),
        "stripe": bool(STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET),
        "whatsapp_cloud": whatsapp_env_configured(),
        "google_oauth": google_env_configured(),
    }
    degraded = not all(checks.values())
    return {
        "status": "degraded" if degraded else "ok",
        "service": "localpilot-ai",
        "auth_required": auth_is_required(),
        "checks": checks,
        "stripe_mode": resolve_stripe_mode(STRIPE_SECRET_KEY),
        "ai_cache": get_cache_stats(),
        "cors": {
            "frontend_url": FRONTEND_URL,
            "allowed_origins": ALLOWED_ORIGINS,
            "allow_origin_regex": ALLOW_ORIGIN_REGEX,
        },
    }


@app.get("/ai-usage")
async def ai_usage(request: Request):
    subject = getattr(request.state, "auth_subject", "")
    if not subject.startswith("user:"):
        raise HTTPException(
            status_code=401,
            detail="AI kullanım bilgisi için oturum açmanız gerekir.",
        )

    user_id = subject.split(":", 1)[1]
    is_pro = fetch_user_is_pro(supabase, user_id)
    if is_pro is None:
        raise HTTPException(
            status_code=503,
            detail="Üyelik durumu doğrulanamadı. Tekrar deneyin.",
        )
    if is_pro:
        return build_pro_usage_snapshot()
    return get_usage_snapshot(supabase, user_id)


@app.get("/platform/business-summary")
async def platform_business_summary(request: Request, business_id: str):
    api_key = request.headers.get("X-Business-API-Key", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="X-Business-API-Key başlığı gerekli.",
        )
    if not verify_business_api_key(supabase, api_key, business_id):
        raise HTTPException(
            status_code=403,
            detail="Geçersiz veya iptal edilmiş API anahtarı.",
        )

    summary = fetch_business_summary(supabase, business_id)
    if summary is None:
        raise HTTPException(status_code=404, detail="İşletme bulunamadı.")

    return {"status": "success", **summary}


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
    system_instruction: str,
    user_prompt: str,
    temperature: float = 0.5,
    *,
    use_cache: bool = True,
) -> Dict[str, Any]:
    cache_key = None
    if use_cache:
        cache_key = build_cache_key(system_instruction, user_prompt, temperature)
        cached = get_cached_response(cache_key)
        if cached is not None:
            return cached

    response = gemini_client.models.generate_content(
        model=GEMINI_MODEL,
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            temperature=temperature,
        ),
    )
    result = clean_and_parse_json(response.text)

    if cache_key is not None:
        set_cached_response(cache_key, result)

    return result


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
    sector: str = ""
    industry: str = ""
    city: str = ""


class CampaignInput(BaseModel):
    business_name: str
    sector: str
    city: str
    target_audience: str = ""
    industry: str = ""
    goals: List[str] = Field(default_factory=list)
    top_products: str = ""
    unique_selling_point: str = ""
    brand_tone: str = ""
    mode: str = "fresh"
    existing_campaigns: List[Dict[str, Any]] = Field(default_factory=list)
    variant_index: Optional[int] = None


class CheckoutInput(BaseModel):
    user_id: str


class ConfirmCheckoutInput(BaseModel):
    session_id: Optional[str] = None


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


class GoogleProfileSuggestionsRequest(BaseModel):
    business_name: str
    industry: str = ""
    sector: str = ""
    city: str = ""
    address: str = ""
    whatsapp_number: str = ""
    working_hours: str = ""
    about_us: str = ""
    pending_checklist_ids: List[str] = Field(default_factory=list)


class IntegrationBusinessRequest(BaseModel):
    business_id: str


class WhatsAppSendRequest(BaseModel):
    business_id: str
    recipient_phone: str
    message: str


class GoogleApplySuggestionRequest(BaseModel):
    business_id: str
    checklist_item_id: str
    suggested_text: str


class AiFeedbackRequest(BaseModel):
    business_id: str
    feature: str
    rating: int
    context: Dict[str, Any] = Field(default_factory=dict)


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
        user_prompt = build_business_profile_block(
            business_name=business.name,
            sector=business.sector,
            city=business.city,
            target_audience=business.target_audience,
        )
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
        Sektör ve şehir bağlamına göre önerileri özelleştir.
        Çıktın kesinlikle JSON olmalı.
        {
          "positive_highlights": ["...", "..."],
          "negative_highlights": ["...", "..."],
          "actionable_advice": ["...", "..."],
          "overall_sentiment": "Pozitif | Nötr | Negatif",
          "reply_templates": [
            {"type": "positive_review", "message": "..."},
            {"type": "negative_review", "message": "..."}
          ],
          "decision_bridge": {
            "signal": "Yorumlardan çıkan en kritik sinyal (1 cümle).",
            "analysis": "Neden önemli olduğunu açıkla (1-2 cümle).",
            "recommendation": "Karar Merkezi'nde onaylanacak net aksiyon.",
            "expected_result": "Beklenen iş sonucu.",
            "metric": "Ölçülecek metrik adı.",
            "priority": "high | medium | low"
          }
        }
        """
        reviews_text = "\n".join([f"- {r}" for r in data.reviews])
        profile = build_business_profile_block(
            business_name=data.business_name,
            sector=data.sector,
            industry=data.industry,
            city=data.city,
        )
        user_prompt = f"""
        {profile}

        Müşteri Yorumları:
        {reviews_text}
        """
        return generate_ai_json(system_instruction, user_prompt, temperature=0.3)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analiz Hatası: {str(e)}")


@app.post("/generate-campaigns")
async def generate_campaigns(data: CampaignInput):
    try:
        mode_instruction = build_campaign_mode_instruction(
            data.mode,
            data.existing_campaigns,
            data.variant_index,
        )
        system_instruction = f"""
        Sen LocalPilot AI'sın. İşletmelerin satışlarını artıracak yaratıcı ve yerel pazarlama kampanyaları üretirsin.
        Verilen işletme profiline, sektör notlarına ve hedef kitleye uygun kampanyalar oluştur.
        {mode_instruction}
        Çıktın kesinlikle JSON olmalı.
        {{
          "campaigns": [
            {{
              "campaign_name": "...",
              "goal": "...",
              "offer": "...",
              "strategy": "...",
              "sms_whatsapp_template": "..."
            }}
          ]
        }}
        """
        user_prompt = build_business_profile_block(
            business_name=data.business_name,
            sector=data.sector,
            industry=data.industry or data.sector,
            city=data.city,
            target_audience=data.target_audience,
            goals=data.goals,
            top_products=data.top_products,
            unique_selling_point=data.unique_selling_point,
            brand_tone=data.brand_tone,
        )
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
            success_url=(
                f"{FRONTEND_URL}/dashboard"
                "?payment=success&session_id={CHECKOUT_SESSION_ID}"
            ),
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


@app.post("/confirm-pro-checkout")
async def confirm_pro_checkout_endpoint(
    request: Request, data: ConfirmCheckoutInput
):
    subject = getattr(request.state, "auth_subject", "")
    user_id = subject.split(":", 1)[1] if subject.startswith("user:") else None

    if not user_id:
        if not (is_development() and data.session_id):
            raise HTTPException(
                status_code=401,
                detail="Pro onayı için oturum açmanız gerekir.",
            )

    result, status_code = confirm_pro_checkout(
        stripe,
        supabase,
        user_id,
        data.session_id,
    )
    if status_code >= 400:
        raise HTTPException(status_code=status_code, detail=result.get("detail"))

    return result


@app.post("/forecast-finance")
async def forecast_finance(data: FinanceForecastRequest):
    try:
        incomes = [t for t in data.transactions if t.type == "gelir"]

        monthly_revenue = defaultdict(float)
        for tx in incomes:
            month_key = tx.date.split("T")[0][:7]
            monthly_revenue[month_key] += tx.amount

        months_covered = len(monthly_revenue)
        if months_covered < 3:
            return {
                "status": "insufficient_data",
                "months_covered": months_covered,
                "months_required": 3,
                "message": (
                    "Sağlıklı bir yapay zeka tahmini için en az 3 farklı aya ait gelir "
                    "işlemi gerekiyor. Şu an "
                    f"{months_covered} ay veri var."
                ),
            }

        sorted_months = sorted(monthly_revenue.keys())
        start_month = datetime.strptime(f"{sorted_months[0]}-01", "%Y-%m-%d")

        X = []
        y = []

        for month_key in sorted_months:
            month_start = datetime.strptime(f"{month_key}-01", "%Y-%m-%d")
            delta_months = (
                (month_start.year - start_month.year) * 12
                + (month_start.month - start_month.month)
            )
            X.append([delta_months])
            y.append(monthly_revenue[month_key])
            
        X = np.array(X)
        y = np.array(y)
        
        # 4. ADIM: Doğrusal Regresyon (Linear Regression) Modelini Eğit
        model = LinearRegression()
        model.fit(X, y)
        
        last_month_index = X[-1][0]
        future_X = np.array([[last_month_index + i] for i in range(1, 2)])
        future_predictions = model.predict(future_X)
        future_predictions = np.maximum(future_predictions, 0)

        predicted_next_month_total = float(np.sum(future_predictions))
        recent_month_total = float(y[-1]) if y else 0.0
        trailing_three_month_total = float(np.sum(y[-3:]))

        trend_percentage = 0.0
        if recent_month_total > 0:
            trend_percentage = (
                (predicted_next_month_total - recent_month_total) / recent_month_total
            ) * 100
            
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
        Kapsanan Ay Sayısı: {months_covered}
        Son Ay Cirosu: {recent_month_total:.2f} TL
        Son 3 Ay Toplamı: {trailing_three_month_total:.2f} TL
        Gelecek Ay Tahmini: {predicted_next_month_total:.2f} TL
        Trend: %{trend_percentage:.2f}
        """
        
        ai_commentary = generate_ai_json(system_instruction, user_prompt, temperature=0.6)
            
        return {
            "status": "success",
            "months_covered": months_covered,
            "current_revenue": round(recent_month_total, 2),
            "predicted_revenue": round(predicted_next_month_total, 2),
            "trend_percentage": round(trend_percentage, 1),
            "ai_insight": ai_commentary.get("ai_insight"),
            "action_recommendation": ai_commentary.get("action_recommendation"),
        }

    except Exception as e:
        print(f"🚨 TAHMİNLEME HATASI: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Finansal analiz oluşturulamadı: {str(e)}")
    
    
    
def _integration_subject(request: Request) -> str:
    subject = getattr(request.state, "auth_subject", "")
    if not subject.startswith("user:"):
        raise HTTPException(
            status_code=401,
            detail="Entegrasyon işlemleri için oturum açmanız gerekir.",
        )
    return subject


@app.get("/integration/status")
async def integration_status(request: Request, business_id: str):
    _integration_subject(request)
    google_row = get_integration(supabase, business_id, "google_business")
    return {
        "whatsapp": build_whatsapp_status(),
        "google": build_google_status(google_row),
    }


@app.post("/integration/whatsapp/send")
async def integration_whatsapp_send(request: Request, data: WhatsAppSendRequest):
    subject = _integration_subject(request)
    try:
        require_business_write_access(supabase, subject, data.business_id)
        result = send_whatsapp_text_message(
            data.recipient_phone,
            data.message,
        )
        return result
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        print(f"🚨 WHATSAPP SEND HATASI: {str(error)}")
        raise HTTPException(
            status_code=500,
            detail="WhatsApp mesajı gönderilemedi.",
        ) from error


@app.get("/integration/google/oauth/start")
async def integration_google_oauth_start(
    request: Request, business_id: str
):
    subject = _integration_subject(request)
    try:
        user_id = require_business_write_access(supabase, subject, business_id)
        state = build_oauth_state(business_id, user_id)
        return {"auth_url": build_google_oauth_url(state)}
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.get("/integration/google/oauth/callback")
async def integration_google_oauth_callback(
    code: str = "",
    state: str = "",
    error: str = "",
):
    from fastapi.responses import RedirectResponse

    frontend_base = FRONTEND_URL.rstrip("/")
    if error:
        return RedirectResponse(
            f"{frontend_base}/dashboard?google_oauth=error&reason={error}"
        )
    if not code or not state:
        return RedirectResponse(
            f"{frontend_base}/dashboard?google_oauth=error&reason=missing_code"
        )

    try:
        business_id, user_id = parse_oauth_state(state)
        tokens = exchange_code_for_tokens(code)
        access_token = tokens.get("access_token", "")
        refresh_token = tokens.get("refresh_token", "")
        if not access_token:
            raise ValueError("Google access token alınamadı.")

        location = discover_primary_location(access_token)
        config = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": tokens.get("expires_in"),
            "location_id": location["location_id"],
            "account_name": location["account_name"],
            "location_title": location.get("location_title", ""),
        }
        upsert_integration(
            supabase,
            business_id,
            "google_business",
            "connected",
            config,
        )
        return RedirectResponse(
            f"{frontend_base}/dashboard?google_oauth=connected&business_id={business_id}"
        )
    except Exception as callback_error:
        print(f"🚨 GOOGLE OAUTH CALLBACK HATASI: {str(callback_error)}")
        return RedirectResponse(
            f"{frontend_base}/dashboard?google_oauth=error&reason=callback_failed"
        )


@app.post("/integration/google/apply-suggestion")
async def integration_google_apply_suggestion(
    request: Request, data: GoogleApplySuggestionRequest
):
    subject = _integration_subject(request)
    try:
        require_business_write_access(supabase, subject, data.business_id)
        integration = get_integration(supabase, data.business_id, "google_business")
        if not integration or integration.get("status") != "connected":
            raise ValueError("Önce Google İşletme Profilinizi bağlayın.")

        config = integration.get("config") or {}
        if not config.get("access_token"):
            raise ValueError("Google erişim anahtarı eksik.")

        result, next_config = apply_profile_field_with_refresh(
            config,
            data.checklist_item_id,
            data.suggested_text,
        )
        if next_config != config:
            upsert_integration(
                supabase,
                data.business_id,
                "google_business",
                "connected",
                next_config,
            )

        return result
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        print(f"🚨 GOOGLE APPLY HATASI: {str(error)}")
        raise HTTPException(
            status_code=500,
            detail="Google profil güncellemesi uygulanamadı.",
        ) from error


@app.post("/integration/ai-feedback")
async def integration_ai_feedback(request: Request, data: AiFeedbackRequest):
    subject = _integration_subject(request)
    try:
        user_id = require_business_write_access(supabase, subject, data.business_id)
        saved = save_ai_feedback(
            supabase,
            business_id=data.business_id,
            user_id=user_id,
            feature=data.feature,
            rating=data.rating,
            context=data.context,
        )
        if not saved:
            raise ValueError("Geri bildirim kaydedilemedi.")
        return {"status": "saved"}
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.post("/integration/google-profile-suggestions")
async def google_profile_suggestions(data: GoogleProfileSuggestionsRequest):
    try:
        if not data.pending_checklist_ids:
            return {"suggestions": []}

        profile = build_business_profile_block(
            business_name=data.business_name,
            sector=data.sector,
            industry=data.industry,
            city=data.city,
            target_audience="",
            top_products="",
            unique_selling_point=data.about_us,
            brand_tone="",
        )
        pending_items = ", ".join(data.pending_checklist_ids)

        system_instruction = """
        Sen LocalPilot AI'ın Google İşletme Profili danışmanısın.
        Eksik checklist maddeleri için işletmeye özel, kopyalanabilir profil önerileri üret.
        Çıktın kesinlikle JSON olmalı:
        {
          "suggestions": [
            {
              "checklistItemId": "description-written",
              "title": "Madde başlığı",
              "suggestedText": "Google profiline yapıştırılabilir metin",
              "actionLabel": "Kopyalanacak aksiyon etiketi",
              "priority": "high | medium | low"
            }
          ]
        }
        """
        user_prompt = f"""
        {profile}
        Adres: {data.address or 'Belirtilmedi'}
        WhatsApp: {data.whatsapp_number or 'Belirtilmedi'}
        Çalışma Saatleri: {data.working_hours or 'Belirtilmedi'}
        Eksik Checklist Maddeleri: {pending_items}
        """
        result = generate_ai_json(system_instruction, user_prompt, temperature=0.5)
        suggestions = result.get("suggestions", [])
        if not isinstance(suggestions, list):
            suggestions = []
        return {"suggestions": suggestions}
    except Exception as e:
        print(f"🚨 GOOGLE PROFILE SUGGESTION HATASI: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Google profil önerileri oluşturulamadı: {str(e)}",
        )


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
            SETUP_SYSTEM_INSTRUCTION,
            user_prompt,
            temperature=0.5,
            use_cache=False,
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
