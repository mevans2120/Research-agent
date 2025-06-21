export interface Heading {
  id: string;
  text: string;
  level: number;
  children?: Heading[];
}

export function extractHeadings(content: string): Heading[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: Heading[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = generateHeadingId(text);

    headings.push({
      id,
      text,
      level,
      children: []
    });
  }

  return buildHeadingHierarchy(headings);
}

export function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function buildHeadingHierarchy(flatHeadings: Heading[]): Heading[] {
  const result: Heading[] = [];
  const stack: Heading[] = [];

  for (const heading of flatHeadings) {
    // Remove headings from stack that are at the same level or deeper
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      // Top-level heading
      result.push(heading);
    } else {
      // Child heading
      const parent = stack[stack.length - 1];
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(heading);
    }

    stack.push(heading);
  }

  return result;
}

export function enhanceMarkdownContent(content: string): string {
  // Add IDs to headings for navigation
  return content.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, text) => {
    const id = generateHeadingId(text);
    return `${hashes} ${text} {#${id}}`;
  });
}

export function detectContentStructure(content: string): {
  hasCodeBlocks: boolean;
  hasTables: boolean;
  hasLists: boolean;
  hasImages: boolean;
  hasLinks: boolean;
  complexity: 'simple' | 'moderate' | 'complex';
} {
  const hasCodeBlocks = /```[\s\S]*?```/.test(content);
  const hasTables = /\|.*\|/.test(content);
  const hasLists = /^[\s]*[-*+]\s/.test(content) || /^[\s]*\d+\.\s/.test(content);
  const hasImages = /!\[.*?\]\(.*?\)/.test(content);
  const hasLinks = /\[.*?\]\(.*?\)/.test(content);
  
  const complexityScore = [hasCodeBlocks, hasTables, hasLists, hasImages, hasLinks].filter(Boolean).length;
  const complexity = complexityScore >= 3 ? 'complex' : complexityScore >= 1 ? 'moderate' : 'simple';

  return {
    hasCodeBlocks,
    hasTables,
    hasLists,
    hasImages,
    hasLinks,
    complexity
  };
}

export function formatSourceAttribution(sources: Array<{ title: string; url: string }>): string {
  if (sources.length === 0) return '';
  
  const sourceList = sources.map((source, index) => 
    `[${index + 1}] [${source.title}](${source.url})`
  ).join('\n');
  
  return `\n\n---\n\n### Sources\n\n${sourceList}`;
}

export function addRelevanceIndicators(content: string, relevanceScore?: number): string {
  if (!relevanceScore) return content;
  
  const indicator = relevanceScore >= 80 ? '🎯' : relevanceScore >= 60 ? '📊' : '📋';
  const badge = `<div class="relevance-badge relevance-${Math.floor(relevanceScore / 20) * 20}">${indicator} ${relevanceScore}% relevant</div>\n\n`;
  
  return badge + content;
}