import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthState {
  isLoggedIn: boolean;
  token: string | null;
  username: string | null;
}

interface AuthContextType extends AuthState {
  login: (password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateToken: (newToken: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  token: null,
  username: null,
  login: async () => ({ success: false, error: 'not initialized' }),
  logout: () => {},
  updateToken: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem('token');
    if (token) {
      return { isLoggedIn: true, token, username: 'admin' };
    }
    return { isLoggedIn: false, token: null, username: null };
  });

  const updateToken = useCallback((newToken: string) => {
    localStorage.setItem('token', newToken);
    setState(prev => ({ ...prev, token: newToken, isLoggedIn: true }));
  }, []);

  const login = useCallback(async (password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (json.success) {
        localStorage.setItem('token', json.data.token);
        setState({ isLoggedIn: true, token: json.data.token, username: 'admin' });
        return { success: true };
      }
      return { success: false, error: json.error || '密码错误' };
    } catch {
      return { success: false, error: '网络错误，请重试' };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setState({ isLoggedIn: false, token: null, username: null });
  }, []);

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
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login', { replace: true });
    }
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) {
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
