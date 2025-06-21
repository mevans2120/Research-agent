'use client';
import React, { useState } from 'react';
import { generateHeadingId } from '../utils/markdownUtils';

// Enhanced Table Component
function EnhancedTable({ children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  // Table sorting functionality (placeholder for future implementation)
  // const [sortColumn, setSortColumn] = useState<number | null>(null);
  // const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  return (
    <div className="table-container">
      <table className="enhanced-table" {...props}>
        {children}
      </table>
    </div>
  );
}

// Enhanced Heading Components with Auto-ID
function createHeadingComponent(level: number) {
  return function HeadingComponent({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    const text = typeof children === 'string' ? children : '';
    const id = generateHeadingId(text);
    
    const HeadingTag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    
    return React.createElement(
      HeadingTag,
      {
        id,
        className: `heading-${level} scroll-mt-20`,
        ...props
      },
      React.createElement(
        'a',
        { href: `#${id}`, className: 'heading-anchor' },
        children
      )
    );
  };
}

// Collapsible Section Component
function CollapsibleSection({ children, title }: { children: React.ReactNode; title: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <details className="collapsible-section" open={isOpen}>
      <summary 
        className="collapsible-summary"
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
      >
        <span className="summary-icon">{isOpen ? '▼' : '▶'}</span>
        {title}
      </summary>
      <div className="collapsible-content">
        {children}
      </div>
    </details>
  );
}

// Enhanced Code Block with Copy Button
function CodeBlock({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = async () => {
    const text = typeof children === 'string' ? children : '';
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <span className="code-language">
          {className?.replace('language-', '') || 'text'}
        </span>
        <button 
          onClick={copyToClipboard}
          className="copy-button"
          title="Copy to clipboard"
        >
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>
      <pre className={className} {...props}>
        <code>{children}</code>
      </pre>
    </div>
  );
}

// Enhanced List with Nested Support
function EnhancedList({ ordered, children, ...props }: { ordered?: boolean; children?: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
  const ListTag = ordered ? 'ol' : 'ul';
  
  return React.createElement(
    ListTag,
    { className: 'enhanced-list', ...props },
    children
  );
}

// Citation Component
function Citation({ children, href }: { children: React.ReactNode; href?: string }) {
  return (
    <sup className="citation">
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="citation-link">
          {children}
        </a>
      ) : (
        children
      )}
    </sup>
  );
}

// Highlight Box Component
function HighlightBox({ children, type = 'info' }: { children: React.ReactNode; type?: 'info' | 'warning' | 'success' | 'error' }) {
  return (
    <div className={`highlight-box highlight-${type}`}>
      <div className="highlight-icon">
        {type === 'info' && 'ℹ️'}
        {type === 'warning' && '⚠️'}
        {type === 'success' && '✅'}
        {type === 'error' && '❌'}
      </div>
      <div className="highlight-content">
        {children}
      </div>
    </div>
  );
}

// Research-specific components
function RelevanceIndicator({ score }: { score: number }) {
  const getColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <span className={`relevance-indicator ${getColor(score)}`}>
      {score}% relevant
    </span>
  );
}

function SourceAttribution({ sources }: { sources: Array<{ title: string; url: string }> }) {
  return (
    <div className="source-attribution">
      <h4 className="sources-title">📚 Sources</h4>
      <ol className="sources-list">
        {sources.map((source, index) => (
          <li key={index} className="source-item">
            <a 
              href={source.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="source-link"
            >
              {source.title}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

// Main component mapping
export const MarkdownComponents = {
  // Headings with auto-ID generation
  h1: createHeadingComponent(1),
  h2: createHeadingComponent(2),
  h3: createHeadingComponent(3),
  h4: createHeadingComponent(4),
  h5: createHeadingComponent(5),
  h6: createHeadingComponent(6),
  
  // Enhanced table
  table: EnhancedTable,
  
  // Enhanced lists
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => <EnhancedList {...props} />,
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => <EnhancedList ordered {...props} />,
  
  // Enhanced code blocks
  pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => {
    // Check if this is a code block
    if (React.isValidElement(children) &&
        typeof children.props === 'object' &&
        children.props !== null &&
        'className' in children.props &&
        typeof children.props.className === 'string' &&
        children.props.className.startsWith('language-')) {
      const codeContent = 'children' in children.props ? children.props.children as React.ReactNode : children;
      return (
        <CodeBlock className={children.props.className}>
          {codeContent}
        </CodeBlock>
      );
    }
    return <pre {...props}>{children}</pre>;
  },
  
  // Enhanced links with external indicators
  a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const isExternal = href?.startsWith('http');
    return (
      <a 
        href={href} 
        {...props}
        {...(isExternal && { target: '_blank', rel: 'noopener noreferrer' })}
        className={`enhanced-link ${isExternal ? 'external-link' : 'internal-link'}`}
      >
        {children}
        {isExternal && <span className="external-indicator">↗</span>}
      </a>
    );
  },
  
  // Enhanced blockquotes
  blockquote: ({ children, ...props }: React.BlockquoteHTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="enhanced-blockquote" {...props}>
      <div className="quote-indicator">&quot;</div>
      {children}
    </blockquote>
  ),
  
  // Enhanced images with lazy loading
  img: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <div className="image-container">
      <img 
        src={src} 
        alt={alt} 
        loading="lazy"
        className="enhanced-image"
        {...props}
      />
      {alt && <figcaption className="image-caption">{alt}</figcaption>}
    </div>
  ),
  
  // Custom components for research-specific content
  RelevanceIndicator,
  SourceAttribution,
  HighlightBox,
  CollapsibleSection,
  Citation
};