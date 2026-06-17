import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { IconBubble } from '../components/Icons';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isLoggedIn } = useAuth();

  // Already logged in — redirect to admin
  if (isLoggedIn) {
    navigate('/admin', { replace: true });
  }

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { setError('请输入密码'); return; }
    setLoading(true);
    setError('');

    const result = await login(password);
    if (result.success) {
      navigate('/admin');
    } else {
      setError(result.error || '密码错误');
    }
    setLoading(false);
  }, [password, login, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="w-full max-w-sm glass rounded-3xl p-8 text-center animate-fade-in">
        <IconBubble size={48} className="text-brand mx-auto mb-4" />
        <h1 className="text-xl font-extrabold text-text-primary dark:text-white mb-6">BubbleBlog</h1>

        <form onSubmit={handleLogin} className="space-y-4">
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
    </div>
  );
}
