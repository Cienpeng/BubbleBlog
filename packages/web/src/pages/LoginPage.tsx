import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '@/components/Footer';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const login = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { setError('请输入密码'); return; }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (json.success) {
        localStorage.setItem('token', json.data.token);
        navigate('/');
      } else {
        setError(json.error || '密码错误');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }, [password, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="w-full max-w-sm glass rounded-3xl p-8 text-center animate-fade-in">
        <div className="text-4xl mb-4">🫧</div>
        <h1 className="text-xl font-extrabold text-text-primary dark:text-white mb-6">BubbleBlog</h1>

        <form onSubmit={login} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full px-4 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 outline-none text-sm text-text-primary dark:text-white placeholder-gray-400 focus:border-brand transition-colors duration-200"
            />
          </div>
          {error && <p className="text-xs text-like">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-2xl bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors duration-200 disabled:opacity-50"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
      <Footer />
    </div>
  );
}
