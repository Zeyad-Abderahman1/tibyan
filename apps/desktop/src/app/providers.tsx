import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, DirectionProvider, useTheme } from '@tibyan/design-system';
import { useSettings } from '../hooks/useSettings.js';

export interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Global Theme Hydration Bridge:
 * Authoritatively applies the persisted SQLite system theme on startup
 * without requiring the user to navigate to SettingsPage.
 */
function ThemeHydrator() {
  const { setTheme, theme } = useTheme();
  const { data: settings } = useSettings();

  useEffect(() => {
    if (settings?.theme && settings.theme !== theme) {
      setTheme(settings.theme);
    }
  }, [settings?.theme, setTheme, theme]);

  return null;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60, // 1 minute
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        <ThemeHydrator />
        <DirectionProvider defaultDirection="rtl">
          {children}
        </DirectionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
