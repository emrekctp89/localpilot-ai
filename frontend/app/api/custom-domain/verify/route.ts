import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  normalizeCustomDomain,
  resolveCustomDomainStatus,
} from "@/lib/mini-site-domain";
import {
  getVercelDomainConfig,
  isVercelDomainsConfigured,
  mapVercelResultToDomainStatus,
  verifyProjectDomain,
} from "@/lib/vercel-domains";

export const runtime = "nodejs";

interface VerifyBody {
  businessId?: string;
}

function getBearer(request: Request): string | null {
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() || null;
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json(
      { ok: false, error: "Supabase yapılandırması eksik." },
      { status: 500 },
    );
  }

  const token = getBearer(request);
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Oturum gerekli." },
      { status: 401 },
    );
  }

  let body: VerifyBody;
  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Geçersiz istek gövdesi." },
      { status: 400 },
    );
  }

  const businessId = body.businessId?.trim();
  if (!businessId) {
    return NextResponse.json(
      { ok: false, error: "businessId gerekli." },
      { status: 400 },
    );
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json(
      { ok: false, error: "Oturum geçersiz." },
      { status: 401 },
    );
  }

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select(
      "id, owner_id, custom_domain, custom_domain_status, custom_domain_error",
    )
    .eq("id", businessId)
    .maybeSingle();

  if (businessError || !business) {
    return NextResponse.json(
      { ok: false, error: "İşletme bulunamadı veya erişim yok." },
      { status: 404 },
    );
  }

  if (business.owner_id !== user.id) {
    return NextResponse.json(
      { ok: false, error: "Sadece işletme sahibi domain doğrulayabilir." },
      { status: 403 },
    );
  }

  const domain = normalizeCustomDomain(business.custom_domain || "");
  if (!domain) {
    return NextResponse.json(
      {
        ok: false,
        error: "Önce Ayarlar’dan bir özel domain kaydedin.",
      },
      { status: 400 },
    );
  }

  if (!isVercelDomainsConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Vercel Domains API yapılandırılmamış. Vercel env: VERCEL_TOKEN, VERCEL_PROJECT_ID (opsiyonel VERCEL_TEAM_ID).",
        status: resolveCustomDomainStatus(business.custom_domain_status),
        domain,
        vercelConfigured: false,
      },
      { status: 503 },
    );
  }

  const config = getVercelDomainConfig()!;
  const vercelResult = await verifyProjectDomain(domain, config);
  const mapped = mapVercelResultToDomainStatus(vercelResult);

  const { data: updated, error: updateError } = await supabase
    .from("businesses")
    .update({
      custom_domain_status: mapped.custom_domain_status,
      custom_domain_error: mapped.custom_domain_error,
    })
    .eq("id", businessId)
    .select(
      "id, custom_domain, custom_domain_status, custom_domain_error",
    )
    .maybeSingle();

  if (updateError) {
    return NextResponse.json(
      {
        ok: false,
        error: updateError.message || "Domain durumu kaydedilemedi.",
      },
      { status: 500 },
    );
  }

  const ok = mapped.custom_domain_status === "active";
  return NextResponse.json({
    ok,
    domain,
    vercelConfigured: true,
    verified: vercelResult.verified,
    status: mapped.custom_domain_status,
    error: ok
      ? null
      : mapped.custom_domain_error ||
        "DNS henüz doğrulanmadı. CNAME kaydını kontrol edip tekrar deneyin.",
    business: updated,
  });
}
