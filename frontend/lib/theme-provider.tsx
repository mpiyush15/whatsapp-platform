import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Load saved theme - default to 'light'
    const savedTheme = (localStorage.getItem('theme') as Theme) || 'light';
    setThemeState(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (themeMode: Theme) => {
    const html = document.documentElement;
    // Only apply dark if explicitly set to 'dark' - ignore 'system' preference
    const isDarkMode = themeMode === 'dark';

    if (isDarkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }

    setIsDark(isDarkMode);
  };

  const setTheme = (newTheme: Theme) => {
    // Convert 'system' to 'light' - we don't use system theme
    const finalTheme = newTheme === 'system' ? 'light' : newTheme;
    setThemeState(finalTheme);
    localStorage.setItem('theme', finalTheme);
    applyTheme(finalTheme);
  };

  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme: theme === 'system' ? 'light' : theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
