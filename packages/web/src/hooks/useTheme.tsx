import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;          // The currently ACTIVE theme (either public or admin)
  publicTheme: Theme;
  adminTheme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  publicTheme: 'light',
  adminTheme: 'light',
  toggle: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  const [publicTheme, setPublicTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('public_theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return 'light'; // Default to light for public
  });

  const [adminTheme, setAdminTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('admin_theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return 'light'; // Default to light for admin
  });

  // Calculate active theme based on current location route
  const activeTheme = isAdmin ? adminTheme : publicTheme;

  // Apply root CSS class whenever the active theme switches
  useEffect(() => {
    const root = document.documentElement;
    if (activeTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [activeTheme]);

  // Sync state changes back to localStorage
  useEffect(() => {
    localStorage.setItem('public_theme', publicTheme);
  }, [publicTheme]);

  useEffect(() => {
    localStorage.setItem('admin_theme', adminTheme);
  }, [adminTheme]);

  const toggle = () => {
    if (isAdmin) {
      setAdminTheme(t => t === 'light' ? 'dark' : 'light');
    } else {
      setPublicTheme(t => t === 'light' ? 'dark' : 'light');
    }
  };

  const setTheme = (t: Theme) => {
    if (isAdmin) {
      setAdminTheme(t);
    } else {
      setPublicTheme(t);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme: activeTheme, publicTheme, adminTheme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
