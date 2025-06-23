'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// Define your theme types
export type ThemeMode = 'light' | 'dark';

// Define theme colors and values
export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  c_background: string;
  a_background: string;
  text: string;
  accent: string;
  hover: string;
}

export interface ThemeValues {
  borderRadius: string;
  fontSizes: {
    small: string;
    medium: string;
    large: string;
  };
  spacing: {
    small: string;
    medium: string;
    large: string;
  };
}

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  values: ThemeValues;
}

// Define your theme configurations
const themes: Record<ThemeMode, Theme> = {
  light: {
    mode: 'light',
    colors: {
      primary: '#0070f3',
      secondary: '#0ea5e9',
      c_background: 'from-gray-50 to-gray-100',
      a_background: 'from-orange-50 to-gray-100',
      background: '#ffffff',
      text: '#1f2937',
      accent: '#8b5cf6',
      hover: 'hover:bg-gray-100'
    },
    values: {
      borderRadius: '0.5rem',
      fontSizes: {
        small: '0.875rem',
        medium: '1rem',
        large: '1.25rem',
      },
      spacing: {
        small: '0.5rem',
        medium: '1rem',
        large: '2rem',
      },
    },
  },
  dark: {
    mode: 'dark',
    colors: {
      primary: '#3b82f6',
      secondary: '#0ea5e9',
      c_background: 'from-gray-900 to-gray-800',
      a_background: 'from-gray-900 to-orange-800',
      background: '#111827',
      text: '#f9fafb',
      accent: '#a78bfa',
      hover: 'hover:bg-gray-700'
    },
    values: {
      borderRadius: '0.5rem',
      fontSizes: {
        small: '0.875rem',
        medium: '1rem',
        large: '1.25rem',
      },
      spacing: {
        small: '0.5rem',
        medium: '1rem',
        large: '2rem',
      },
    },
  },
};

// Create context
interface ThemeContextType {
  theme: Theme;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Create a provider component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read initial theme from <html data-theme>
  const getInitialTheme = (): ThemeMode => {
    if (typeof window === 'undefined') return 'light'; // SSR fallback
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark' || attr === 'light') return attr;
    return 'light';
  };

  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    // Apply theme CSS variables to document root when theme changes
    const root = document.documentElement;
    const currentTheme = themes[themeMode];
    // Apply color variables
    Object.entries(currentTheme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    // Apply other theme values
    root.style.setProperty('--border-radius', currentTheme.values.borderRadius);
    // Apply font sizes
    Object.entries(currentTheme.values.fontSizes).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value);
    });
    // Apply spacing
    Object.entries(currentTheme.values.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value);
    });
    // Set data attribute for CSS selectors
    document.documentElement.setAttribute('data-theme', themeMode);
    // Save to localStorage
    localStorage.setItem('theme', themeMode);
  }, [themeMode]);

  const setTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  const toggleTheme = () => {
    setThemeMode(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme: themes[themeMode], setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};