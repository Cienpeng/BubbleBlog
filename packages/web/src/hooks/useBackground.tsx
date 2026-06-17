import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { api } from '@/lib/api';

interface BackgroundContextType {
  backgroundImage: string | null;
  loading: boolean;
  refresh: () => void;
}

const BackgroundContext = createContext<BackgroundContextType>({
  backgroundImage: null,
  loading: true,
  refresh: () => {},
});

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(() => {
    setLoading(true);
    api.get<Record<string, string>>('/api/settings')
      .then(settings => {
        if (settings.background_image) {
          setBackgroundImage(settings.background_image);
        } else {
          setBackgroundImage(null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <BackgroundContext.Provider value={{ backgroundImage, loading, refresh: fetch }}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  return useContext(BackgroundContext);
}
