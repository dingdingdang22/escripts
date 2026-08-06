'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Lock } from 'lucide-react';

export default function LoginForm({ nextUrl }: { nextUrl: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  const router = useRouter();
  const supabase = createClient();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        // Auto sign-in or check email depending on supabase settings
        alert('注册成功，请登录！(如果在 Supabase 中开启了邮件确认，请前往邮箱确认)');
        setMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(nextUrl);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || '发生错误');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${nextUrl}`,
      },
    });
    if (error) {
      setError(error.message);
    }
  };

  const handleWechatLogin = () => {
    // 微信登录通常需要自定义 Provider 或扫码页面集成
    alert('微信登录尚未配置完整的后端凭证，暂不可用。');
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      <form onSubmit={handleEmailAuth} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">邮箱</label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full pl-10 sm:text-sm border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 py-3 border outline-none"
              placeholder="your@email.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">密码</label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full pl-10 sm:text-sm border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 py-3 border outline-none"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'login' ? '登录' : '注册新账号')}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="text-sm text-blue-600 hover:text-blue-500 font-medium"
        >
          {mode === 'login' ? '没有账号？点击注册' : '已有账号？点击登录'}
        </button>
      </div>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">或使用以下方式登录</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={handleWechatLogin}
            className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="sr-only">Sign in with WeChat</span>
            <svg viewBox="0 0 1024 1024" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M685.227 348.885c-15.019 0-29.696 1.408-43.989 4.096-17.621-72.192-82.688-126.891-160.725-126.891-90.837 0-164.565 73.685-164.565 164.48s73.728 164.48 164.565 164.48c14.208 0 27.947-1.877 41.003-5.248a149.077 149.077 0 0 0 163.712 90.795c69.845 0 126.549-56.747 126.549-126.635 0-91.136-73.131-165.077-126.549-165.077zm-204.715 220.501c-60.672 0-109.824-49.195-109.824-109.824 0-60.715 49.152-109.824 109.824-109.824 60.587 0 109.824 49.109 109.824 109.824 0 60.629-49.237 109.824-109.824 109.824zm204.715-11.477c-39.04 0-70.827-31.787-70.827-70.869s31.787-70.869 70.827-70.869 70.827 31.787 70.827 70.869-31.787 70.869-70.827 70.869z" fill="#07C160" />
            </svg>
            <span className="ml-2">WeChat</span>
          </button>
          
          <button
            onClick={() => handleOAuth('google')}
            className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="sr-only">Sign in with Google</span>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            <span className="ml-2">Google</span>
          </button>
        </div>
      </div>
    </div>
  );
}
