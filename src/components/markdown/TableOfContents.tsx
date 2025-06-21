'use client';
import React, { useState } from 'react';
import { Heading } from '../utils/markdownUtils';

interface TableOfContentsProps {
  headings: Heading[];
  activeHeading: string;
  onHeadingClick: (id: string) => void;
  className?: string;
  collapsible?: boolean;
}

export function TableOfContents({
  headings,
  activeHeading,
  onHeadingClick,
  className = '',
  collapsible = true
}: TableOfContentsProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (headings.length === 0) {
    return null;
  }

  const renderHeading = (heading: Heading, index: number) => {
    const isActive = activeHeading === heading.id;
    const hasChildren = heading.children && heading.children.length > 0;

    return (
      <li key={`${heading.id}-${index}`} className={`toc-item level-${heading.level}`}>
        <button
          onClick={() => onHeadingClick(heading.id)}
          className={`toc-link ${isActive ? 'active' : ''}`}
          title={heading.text}
        >
          <span className="toc-text">{heading.text}</span>
          {isActive && <span className="active-indicator">●</span>}
        </button>
        
        {hasChildren && (
          <ul className="toc-children">
            {heading.children!.map((child, childIndex) => 
              renderHeading(child, childIndex)
            )}
          </ul>
        )}
      </li>
    );
  };

  return (
    <nav className={`table-of-contents ${className}`} aria-label="Table of contents">
      <div className="toc-header">
        <h3 className="toc-title">📋 Contents</h3>
        {collapsible && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="toc-toggle"
            aria-label={isCollapsed ? 'Expand table of contents' : 'Collapse table of contents'}
          >
            {isCollapsed ? '▶' : '▼'}
          </button>
        )}
      </div>
      
      {!isCollapsed && (
        <ul className="toc-list">
          {headings.map((heading, index) => renderHeading(heading, index))}
        </ul>
      )}
    </nav>
  );
}

// Floating TOC for better UX
export function FloatingTableOfContents({
  headings,
  activeHeading,
  onHeadingClick
}: Omit<TableOfContentsProps, 'className' | 'collapsible'>) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="floating-toc-toggle"
        aria-label="Toggle table of contents"
      >
        📋
      </button>
      
      {isVisible && (
        <div className="floating-toc-overlay" onClick={() => setIsVisible(false)}>
          <div className="floating-toc-content" onClick={(e) => e.stopPropagation()}>
            <TableOfContents
              headings={headings}
              activeHeading={activeHeading}
              onHeadingClick={(id) => {
                onHeadingClick(id);
                setIsVisible(false);
              }}
              className="floating-toc"
              collapsible={false}
            />
          </div>
        </div>
      )}
    </>
  );
}