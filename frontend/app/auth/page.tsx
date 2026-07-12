"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { attributeReferralCode } from "@/lib/repositories/partner-program";
import {
  clearStoredReferralCode,
  readStoredReferralCode,
} from "@/lib/referral-storage";

async function applyPendingReferral() {
  const code = readStoredReferralCode();
  if (!code) return;
  const result = await attributeReferralCode(code);
  if (result.status === "success" || result.status === "ignored") {
    clearStoredReferralCode();
  }
}

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setErrorMessage("");
    if (!isSupabaseConfigured()) {
      setErrorMessage(
        "Supabase yapılandırması eksik veya bozuk (Vercel env). NEXT_PUBLIC_SUPABASE_URL ve ANON_KEY tek satır olmalı.",
      );
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Bilinmeyen hata";
      setErrorMessage(`Google girişi başarısız: ${message}`);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setInfoMessage("");

    if (!isSupabaseConfigured()) {
      setErrorMessage(
        "Supabase yapılandırması eksik veya bozuk. Vercel → Environment Variables: NEXT_PUBLIC_SUPABASE_ANON_KEY tek satır JWT olmalı (kopyala-yapıştır tekrarı / satır sonu olmasın).",
      );
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        await applyPendingReferral();
        router.push("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfoMessage("Kayıt başarılı. Şimdi giriş yapabilirsiniz.");
        setIsLogin(true);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Bilinmeyen hata";
      // Browser: fetch Invalid value → genelde header'da newline (bozuk env key)
      if (/invalid value|failed to execute 'fetch'/i.test(message)) {
        setErrorMessage(
          "Bağlantı hatası: Supabase anahtarı geçersiz karakter içeriyor olabilir. Vercel env'de NEXT_PUBLIC_SUPABASE_ANON_KEY'i tek satır olarak yeniden kaydedin ve Redeploy yapın.",
        );
      } else {
        setErrorMessage(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lp-page relative flex items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-indigo-300/30 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-sky-300/25 blur-[110px]" />

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-black text-white"
              aria-hidden="true"
            >
              L
            </span>
            <span className="text-left">
              <span className="block text-lg font-black tracking-tight text-slate-900">
                LocalPilot
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                AI İşletme OS
              </span>
            </span>
          </Link>
        </div>

        <div className="lp-card p-6 sm:p-8">
          <p className="lp-eyebrow">
            {isLogin ? "Hoş geldiniz" : "Hesap oluştur"}
          </p>
          <h1 className="lp-title mt-2 text-2xl sm:text-3xl">
            {isLogin ? "Panele giriş yap" : "Ücretsiz başla"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {isLogin
              ? "İşletme panelinize e-posta veya Google ile devam edin."
              : "Birkaç saniyede kayıt olun; onboarding AI planınızı hazırlar."}
          </p>

          <form onSubmit={handleAuth} className="mt-6 space-y-4">
            <div>
              <label htmlFor="auth-email" className="lp-label">
                E-posta
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                className="lp-input"
                placeholder="ornek@isletme.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="auth-password" className="lp-label">
                Şifre
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                minLength={6}
                className="lp-input"
                placeholder="En az 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {errorMessage ? (
              <p
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
              >
                {errorMessage}
              </p>
            ) : null}
            {infoMessage ? (
              <p
                role="status"
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
              >
                {infoMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="lp-btn-primary lp-btn-block"
            >
              {loading
                ? "İşleniyor..."
                : isLogin
                  ? "Giriş Yap"
                  : "Kayıt Ol"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs font-bold uppercase tracking-wide">
              <span className="bg-white px-3 text-slate-400">veya</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleGoogleLogin()}
            className="lp-btn-secondary lp-btn-block"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google ile devam et
          </button>

          <p className="mt-6 text-center text-sm text-slate-600">
            {isLogin ? "Hesabın yok mu?" : "Zaten hesabın var mı?"}{" "}
            <button
              type="button"
              className="lp-link"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMessage("");
                setInfoMessage("");
              }}
            >
              {isLogin ? "Kayıt ol" : "Giriş yap"}
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          <Link href="/" className="font-semibold text-slate-600 hover:text-indigo-700">
            ← Ana sayfaya dön
          </Link>
        </p>
      </div>
    </div>
  );
}
