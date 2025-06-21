'use client';
import React, { createContext, useContext, useState } from 'react';

type ThemeType = 'default' | 'research' | 'academic' | 'minimal';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  fontSize: 'small' | 'medium' | 'large';
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useMarkdownTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useMarkdownTheme must be used within a MarkdownTheme provider');
  }
  return context;
}

interface MarkdownThemeProps {
  theme?: ThemeType;
  children: React.ReactNode;
}

export function MarkdownTheme({ theme: initialTheme = 'research', children }: MarkdownThemeProps) {
  const [theme, setTheme] = useState<ThemeType>(initialTheme);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [darkMode, setDarkMode] = useState(false);

  const themeClasses = {
    default: 'markdown-theme-default',
    research: 'markdown-theme-research',
    academic: 'markdown-theme-academic',
    minimal: 'markdown-theme-minimal'
  };

  const fontSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      fontSize,
      setFontSize,
      darkMode,
      setDarkMode
    }}>
      <div
        className={`
          markdown-theme
          ${themeClasses[theme]}
          ${fontSizeClasses[fontSize]}
          ${darkMode ? 'dark' : 'light'}
        `}
        style={{
          // Dynamic CSS variables that change based on theme/dark mode
          '--color-accent': theme === 'research' ? '#3b82f6' : theme === 'academic' ? '#7c3aed' : '#059669',
          '--color-accent-light': theme === 'research' ? '#dbeafe' : theme === 'academic' ? '#ede9fe' : '#d1fae5',
        } as React.CSSProperties}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

// Theme selector component
export function ThemeSelector() {
  const { theme, setTheme, fontSize, setFontSize, darkMode, setDarkMode } = useMarkdownTheme();

  return (
    <div className="theme-selector">
      <div className="theme-controls">
        <label>
          Theme:
          <select value={theme} onChange={(e) => setTheme(e.target.value as ThemeType)}>
            <option value="research">Research</option>
            <option value="academic">Academic</option>
            <option value="minimal">Minimal</option>
            <option value="default">Default</option>
          </select>
        </label>
        
        <label>
          Font Size:
          <select value={fontSize} onChange={(e) => setFontSize(e.target.value as 'small' | 'medium' | 'large')}>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </label>
        
        <label>
          <input
            type="checkbox"
            checked={darkMode}
            onChange={(e) => setDarkMode(e.target.checked)}
          />
          Dark Mode
        </label>
      </div>
    </div>
  );
}