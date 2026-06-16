import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';

interface BackgroundContextType {
  backgroundImage: string | null;
  loading: boolean;
}

const BackgroundContext = createContext<BackgroundContextType>({ backgroundImage: null, loading: true });

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Record<string, string>>('/api/settings')
      .then(settings => {
        if (settings.background_image) {
          setBackgroundImage(settings.background_image);
        }
      })
      .catch(() => {
        // Settings not available — use default
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <BackgroundContext.Provider value={{ backgroundImage, loading }}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  return useContext(BackgroundContext);
}
