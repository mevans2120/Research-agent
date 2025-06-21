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
      >
        {children}
        <style jsx>{`
          .markdown-theme {
            --color-text: ${darkMode ? '#f8fafc' : '#1f2937'};
            --color-text-secondary: ${darkMode ? '#cbd5e1' : '#6b7280'};
            --color-background: ${darkMode ? '#0f172a' : '#ffffff'};
            --color-background-secondary: ${darkMode ? '#1e293b' : '#f8fafc'};
            --color-border: ${darkMode ? '#334155' : '#e5e7eb'};
            --color-accent: ${theme === 'research' ? '#3b82f6' : theme === 'academic' ? '#7c3aed' : '#059669'};
            --color-accent-light: ${theme === 'research' ? '#dbeafe' : theme === 'academic' ? '#ede9fe' : '#d1fae5'};
          }

          /* Research Theme */
          .markdown-theme-research {
            --heading-color: #1e40af;
            --code-background: #f1f5f9;
            --table-header-bg: #eff6ff;
            --blockquote-border: #3b82f6;
          }

          /* Academic Theme */
          .markdown-theme-academic {
            --heading-color: #6b21a8;
            --code-background: #faf5ff;
            --table-header-bg: #f3e8ff;
            --blockquote-border: #7c3aed;
            font-family: 'Georgia', 'Times New Roman', serif;
          }

          /* Minimal Theme */
          .markdown-theme-minimal {
            --heading-color: #374151;
            --code-background: #f9fafb;
            --table-header-bg: #f9fafb;
            --blockquote-border: #9ca3af;
          }

          /* Dark mode adjustments */
          .dark {
            --color-text: #f8fafc;
            --color-text-secondary: #cbd5e1;
            --color-background: #0f172a;
            --color-background-secondary: #1e293b;
            --color-border: #334155;
            --code-background: #1e293b;
            --table-header-bg: #334155;
          }

          .dark.markdown-theme-research {
            --heading-color: #60a5fa;
            --blockquote-border: #60a5fa;
          }

          .dark.markdown-theme-academic {
            --heading-color: #a78bfa;
            --blockquote-border: #a78bfa;
          }

          .dark.markdown-theme-minimal {
            --heading-color: #d1d5db;
            --blockquote-border: #6b7280;
          }

          /* Base styles */
          .markdown-container {
            color: var(--color-text);
            background-color: var(--color-background);
            line-height: 1.7;
          }

          .markdown-content {
            max-width: none;
          }

          /* Headings */
          .heading-1, .heading-2, .heading-3, .heading-4, .heading-5, .heading-6 {
            color: var(--heading-color);
            font-weight: 600;
            margin-top: 2rem;
            margin-bottom: 1rem;
            scroll-margin-top: 5rem;
          }

          .heading-1 { font-size: 2.25rem; }
          .heading-2 { font-size: 1.875rem; }
          .heading-3 { font-size: 1.5rem; }
          .heading-4 { font-size: 1.25rem; }
          .heading-5 { font-size: 1.125rem; }
          .heading-6 { font-size: 1rem; }

          .heading-anchor {
            color: inherit;
            text-decoration: none;
            position: relative;
          }

          .heading-anchor:hover::before {
            content: '#';
            position: absolute;
            left: -1.5rem;
            color: var(--color-accent);
            font-weight: normal;
          }

          /* Tables */
          .table-container {
            overflow-x: auto;
            margin: 1.5rem 0;
            border-radius: 0.5rem;
            border: 1px solid var(--color-border);
          }

          .enhanced-table {
            width: 100%;
            border-collapse: collapse;
            background-color: var(--color-background);
          }

          .enhanced-table th {
            background-color: var(--table-header-bg);
            padding: 0.75rem;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid var(--color-border);
          }

          .enhanced-table td {
            padding: 0.75rem;
            border-bottom: 1px solid var(--color-border);
          }

          .enhanced-table tr:hover {
            background-color: var(--color-background-secondary);
          }

          /* Code blocks */
          .code-block-container {
            margin: 1.5rem 0;
            border-radius: 0.5rem;
            overflow: hidden;
            border: 1px solid var(--color-border);
          }

          .code-block-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 1rem;
            background-color: var(--color-background-secondary);
            border-bottom: 1px solid var(--color-border);
          }

          .code-language {
            font-size: 0.875rem;
            color: var(--color-text-secondary);
            font-weight: 500;
          }

          .copy-button {
            padding: 0.25rem 0.5rem;
            background-color: var(--color-accent);
            color: white;
            border: none;
            border-radius: 0.25rem;
            font-size: 0.75rem;
            cursor: pointer;
            transition: opacity 0.2s;
          }

          .copy-button:hover {
            opacity: 0.8;
          }

          .code-block-container pre {
            margin: 0;
            padding: 1rem;
            background-color: var(--code-background);
            overflow-x: auto;
          }

          /* Lists */
          .enhanced-list {
            margin: 1rem 0;
            padding-left: 1.5rem;
          }

          .enhanced-list li {
            margin-bottom: 0.5rem;
            line-height: 1.6;
          }

          /* Links */
          .enhanced-link {
            color: var(--color-accent);
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: border-color 0.2s;
          }

          .enhanced-link:hover {
            border-bottom-color: var(--color-accent);
          }

          .external-indicator {
            font-size: 0.75rem;
            margin-left: 0.25rem;
            opacity: 0.7;
          }

          /* Blockquotes */
          .enhanced-blockquote {
            margin: 1.5rem 0;
            padding: 1rem 1.5rem;
            border-left: 4px solid var(--blockquote-border);
            background-color: var(--color-background-secondary);
            position: relative;
          }

          .quote-indicator {
            position: absolute;
            top: -0.5rem;
            left: 1rem;
            font-size: 2rem;
            color: var(--blockquote-border);
            background-color: var(--color-background-secondary);
            padding: 0 0.5rem;
          }

          /* Images */
          .image-container {
            margin: 1.5rem 0;
            text-align: center;
          }

          .enhanced-image {
            max-width: 100%;
            height: auto;
            border-radius: 0.5rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }

          .image-caption {
            margin-top: 0.5rem;
            font-size: 0.875rem;
            color: var(--color-text-secondary);
            font-style: italic;
          }

          /* Table of Contents */
          .table-of-contents {
            background-color: var(--color-background-secondary);
            border: 1px solid var(--color-border);
            border-radius: 0.5rem;
            padding: 1rem;
            margin-bottom: 2rem;
            max-width: 300px;
            float: right;
            margin-left: 2rem;
          }

          .toc-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
          }

          .toc-title {
            font-size: 1rem;
            font-weight: 600;
            margin: 0;
            color: var(--heading-color);
          }

          .toc-toggle {
            background: none;
            border: none;
            color: var(--color-text-secondary);
            cursor: pointer;
            padding: 0.25rem;
          }

          .toc-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          .toc-item {
            margin-bottom: 0.25rem;
          }

          .toc-link {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            padding: 0.25rem 0.5rem;
            background: none;
            border: none;
            text-align: left;
            color: var(--color-text);
            cursor: pointer;
            border-radius: 0.25rem;
            transition: background-color 0.2s;
            font-size: 0.875rem;
          }

          .toc-link:hover {
            background-color: var(--color-accent-light);
          }

          .toc-link.active {
            background-color: var(--color-accent);
            color: white;
          }

          .toc-text {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .active-indicator {
            font-size: 0.5rem;
            margin-left: 0.5rem;
          }

          .toc-children {
            list-style: none;
            padding-left: 1rem;
            margin-top: 0.25rem;
          }

          .level-1 .toc-link { font-weight: 600; }
          .level-2 .toc-link { font-weight: 500; }
          .level-3 .toc-link { font-weight: normal; }

          /* Responsive design */
          @media (max-width: 768px) {
            .table-of-contents {
              float: none;
              max-width: none;
              margin-left: 0;
              margin-bottom: 1rem;
            }

            .heading-anchor:hover::before {
              display: none;
            }
          }
        `}</style>
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