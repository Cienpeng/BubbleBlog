import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { IconBubble } from '../components/Icons';

function getFingerprint(): string {
  const nav = window.navigator;
  return `${nav.userAgent}-${screen.width}x${screen.height}`;
}

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [captchaCid, setCaptchaCid] = useState('');
  const [captchaValue, setCaptchaValue] = useState('');
  const [captchaUrl, setCaptchaUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isLoggedIn } = useAuth();

  const refreshCaptcha = useCallback(() => {
    const newCid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setCaptchaCid(newCid);
    setCaptchaValue('');
    setCaptchaUrl(`/api/auth/captcha?cid=${newCid}&t=${Date.now()}`);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      refreshCaptcha();
    }
  }, [isLoggedIn, refreshCaptcha]);

  // Already logged in — redirect to admin
  if (isLoggedIn) {
    navigate('/admin', { replace: true });
  }

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { setError('请输入密码'); return; }
    if (!captchaValue) { setError('请输入验证码'); return; }
    setLoading(true);
    setError('');

    const result = await login(password, captchaCid, captchaValue, getFingerprint());
    if (result.success) {
      navigate('/admin');
    } else {
      setError(result.error || '登录失败');
      refreshCaptcha();
    }
    setLoading(false);
  }, [password, captchaCid, captchaValue, login, navigate, refreshCaptcha]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="w-full max-w-sm glass rounded-3xl p-8 text-center animate-fade-in">
        <IconBubble size={48} className="text-brand mx-auto mb-4" />
        <h1 className="text-[21px] font-black text-text-primary dark:text-white mb-6">BubbleBlog</h1>

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
          <div className="flex gap-3">
            <input
              type="text"
              value={captchaValue}
              onChange={e => setCaptchaValue(e.target.value)}
              placeholder="验证码"
              maxLength={6}
              className="flex-1 min-w-0 px-4 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 outline-none text-sm text-text-primary dark:text-white placeholder-gray-400 focus:border-brand transition-colors duration-200"
            />
            {captchaUrl && (
              <img
                src={captchaUrl}
                alt="验证码"
                onClick={refreshCaptcha}
                title="点击刷新"
                className="w-[120px] h-[40px] rounded-2xl cursor-pointer hover:opacity-80 border border-black/5 dark:border-white/5 transition-opacity flex-shrink-0"
              />
            )}
          </div>
          {error && <p className="text-xs text-like text-center font-medium leading-relaxed px-1">{error}</p>}
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
