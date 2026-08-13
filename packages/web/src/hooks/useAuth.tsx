import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthState {
  isLoggedIn: boolean;
  username: string | null;
  isChecking: boolean;
}

interface AuthContextType extends AuthState {
  login: (
    password: string,
    captchaCid: string,
    captchaValue: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateToken: (newToken: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  username: null,
  isChecking: true,
  login: async () => ({ success: false, error: 'not initialized' }),
  logout: () => {},
  updateToken: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ isLoggedIn: false, username: null, isChecking: true });

  // Kept temporarily for call-site compatibility. Sessions are rotated and
  // stored exclusively in an HttpOnly cookie, never in Web Storage.
  const updateToken = useCallback((_newToken: string) => {
    setState(prev => ({ ...prev, isLoggedIn: true }));
  }, []);

  useEffect(() => {
    localStorage.removeItem('token');
    let active = true;
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then(response => {
        if (!active) return;
        setState({ isLoggedIn: response.ok, username: response.ok ? 'admin' : null, isChecking: false });
      })
      .catch(() => {
        if (active) setState({ isLoggedIn: false, username: null, isChecking: false });
      });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (
    password: string,
    captchaCid: string,
    captchaValue: string
  ) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, cid: captchaCid, captcha: captchaValue }),
      });
      const json = await res.json();
      if (json.success) {
        setState({ isLoggedIn: true, username: 'admin', isChecking: false });
        return { success: true };
      }
      return { success: false, error: json.error || '密码错误' };
    } catch {
      return { success: false, error: '网络错误，请重试' };
    }
  }, []);

  const logout = useCallback(() => {
    void fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    setState({ isLoggedIn: false, username: null, isChecking: false });
  }, []);

  useEffect(() => {
    const handleUnauthorized = (e: Event) => {
      const detail = (e as CustomEvent).detail || '当前登录会话已失效，请重新登录';
      setState(prev => {
        if (prev.isLoggedIn) alert(detail);
        return { isLoggedIn: false, username: null, isChecking: false };
      });
    };
    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// AuthGuard: redirect to /login if not authenticated
export function AuthGuard({ children }: { children: ReactNode }) {
  const { isLoggedIn, isChecking } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isChecking && !isLoggedIn) {
      navigate('/login', { replace: true });
    }
  }, [isLoggedIn, isChecking, navigate]);

  if (isChecking || !isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-text-primary/50 dark:text-white/30 text-sm animate-pulse">
          请先登录...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
