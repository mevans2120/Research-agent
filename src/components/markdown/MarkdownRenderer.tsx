'use client';
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { MarkdownComponents } from './MarkdownComponents';
import { TableOfContents } from './TableOfContents';
import { MarkdownTheme } from './MarkdownTheme';
import { extractHeadings, type Heading } from '../utils/markdownUtils';

interface MarkdownRendererProps {
  content: string;
  theme?: 'default' | 'research' | 'academic' | 'minimal';
  showToc?: boolean;
  enableInteractive?: boolean;
  className?: string;
  onContentStructured?: (headings: Heading[]) => void;
}

export function MarkdownRenderer({
  content,
  theme = 'research',
  showToc = true,
  enableInteractive = true,
  className = '',
  onContentStructured
}: MarkdownRendererProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeHeading, setActiveHeading] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Extract headings for table of contents
    const extractedHeadings = extractHeadings(content);
    setHeadings(extractedHeadings);
    setIsLoading(false);
    
    if (onContentStructured) {
      onContentStructured(extractedHeadings);
    }
  }, [content, onContentStructured]);

  useEffect(() => {
    if (!enableInteractive) return;

    // Set up intersection observer for active heading tracking
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveHeading(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0% -35% 0%',
        threshold: 0
      }
    );

    // Observe all headings
    const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headingElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [enableInteractive, content]);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (isLoading) {
    return (
      <div className="markdown-loading">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <MarkdownTheme theme={theme}>
      <div className={`markdown-container ${className}`}>
        {showToc && headings.length > 0 && (
          <TableOfContents
            headings={headings}
            activeHeading={activeHeading}
            onHeadingClick={scrollToHeading}
          />
        )}
        
        <div className="markdown-content prose prose-lg max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            rehypePlugins={[rehypeHighlight, rehypeRaw]}
            components={MarkdownComponents}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </MarkdownTheme>
  );
}