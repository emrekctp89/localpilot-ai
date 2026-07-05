'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();


  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Bilinmeyen hata";
      alert(`Google girişi başarısız: ${message}`);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // GİRİŞ YAP
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/'); // Başarılıysa ana sayfaya yönlendir
      } else {
        // KAYIT OL
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Kayıt başarılı! Lütfen giriş yapın.');
        setIsLogin(true);
      }
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-black">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {isLogin ? 'LocalPilot Giriş' : 'Yeni Hesap Oluştur'}
        </h1>
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label htmlFor="auth-email" className="block text-sm font-medium">
              E-posta
            </label>
            <input
              id="auth-email"
              type="email"
              required
              className="mt-1 block w-full rounded border p-2 bg-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="block text-sm font-medium">
              Şifre
            </label>
            <input
              id="auth-password"
              type="password"
              required
              className="mt-1 block w-full rounded border p-2 bg-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
            {loading ? 'İşleniyor...' : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
          </button>
        </form>
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Veya</span>
            </div>
          </div>

          <button 
            type="button"
            className="mt-4 w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 p-2 rounded hover:bg-gray-50 transition shadow-sm font-medium"
            onClick={handleGoogleLogin}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google ile Devam Et
          </button>
        </div>
        <p className="mt-4 text-sm text-center cursor-pointer text-blue-600 hover:underline" 
           onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Hesabın yok mu? Kayıt ol.' : 'Zaten hesabın var mı? Giriş yap.'}
        </p>
      </div>
    </div>
  );
}