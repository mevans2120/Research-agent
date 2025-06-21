'use client';
import { useState, useEffect } from 'react';
import {
  createResearchSession,
  getCurrentSession,
  addFollowupToSession,
  extractRelevantContext,
  generateSessionId,
  type ResearchSession,
  type FollowupQuestion
} from '../lib/sessionStorage';
import { MarkdownRenderer } from '../components/markdown/MarkdownRenderer';

interface Source {
  title: string;
  url: string;
}

interface Finding {
  question: string;
  answer: string;
  sources: Source[];
  scrapedSources: number;
  method: string;
  relevanceScore?: {
    score: number;
    reasoning: string;
  };
  isRelevant: boolean;
}

interface Synthesis {
  summary: string;
  methodology: string;
  confidence: string;
  totalSources: number;
  totalScrapedSources: number;
  relevantFindings?: number;
  filteredOutFindings?: number;
  averageRelevanceScore?: number;
  formatMetadata?: {
    format: 'table' | 'bullets' | 'mixed' | 'narrative';
    hasComparisons: boolean;
    hasLists: boolean;
    hasData: boolean;
  };
  sourceBreakdown: Array<{
    question: string;
    sourceCount: number;
    sources: Source[];
    relevanceScore?: number;
  }>;
  filteredFindings?: Array<{
    question: string;
    relevanceScore?: number;
    reasoning?: string;
  }>;
}

interface ResearchResults {
  analysis: {
    originalQuery: string;
    subQuestions: string[];
    analysisMethod: string;
  };
  findings: Finding[];
  synthesis: Synthesis;
  timestamp: string;
}

interface ActivityLog {
  message: string;
  timestamp: string;
}

// Simple markdown renderer for enhanced formatting
function renderMarkdown(text: string) {
  // Convert markdown tables to HTML tables
  const tableRegex = /\|(.+)\|\n\|[-\s|:]+\|\n((?:\|.+\|\n?)+)/g;
  let html = text.replace(tableRegex, (match, header, rows) => {
    const headerCells = header.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell);
    const rowsArray = rows.trim().split('\n').map((row: string) =>
      row.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell)
    );
    
    return `
      <table style="width: 100%; border-collapse: collapse; margin: 1rem 0; border: 1px solid #e5e7eb;">
        <thead>
          <tr style="background-color: #f9fafb;">
            ${headerCells.map((cell: string) => `<th style="padding: 0.75rem; text-align: left; border: 1px solid #e5e7eb; font-weight: 600;">${cell}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rowsArray.map((row: string[]) => `
            <tr>
              ${row.map((cell: string) => `<td style="padding: 0.75rem; border: 1px solid #e5e7eb;">${cell}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  });
  
  // Convert bullet points
  html = html.replace(/^\* (.+)$/gm, '<li style="margin-bottom: 0.5rem;">$1</li>');
  html = html.replace(/^- (.+)$/gm, '<li style="margin-bottom: 0.5rem;">$1</li>');
  
  // Wrap consecutive list items in ul tags
  html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/g, '<ul style="margin: 1rem 0; padding-left: 1.5rem;">$&</ul>');
  
  // Convert numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li style="margin-bottom: 0.5rem;">$1</li>');
  html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/g, (match) => {
    if (match.includes('•') || match.includes('-')) return match;
    return `<ol style="margin: 1rem 0; padding-left: 1.5rem;">${match}</ol>`;
  });
  
  // Convert headers
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size: 1.125rem; font-weight: 600; margin: 1.5rem 0 0.75rem 0; color: #1f2937;">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size: 1.25rem; font-weight: 600; margin: 1.5rem 0 0.75rem 0; color: #1f2937;">$1</h2>');
  
  // Convert bold text
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Convert line breaks
  html = html.replace(/\n\n/g, '</p><p style="margin-bottom: 1rem;">');
  html = `<p style="margin-bottom: 1rem;">${html}</p>`;
  
  return html;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResearchResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [currentSession, setCurrentSession] = useState<ResearchSession | null>(null);
  const [followupQuestion, setFollowupQuestion] = useState('');
  const [followupLoading, setFollowupLoading] = useState(false);
  const [followupActivities, setFollowupActivities] = useState<ActivityLog[]>([]);
  const [relevanceThreshold, setRelevanceThreshold] = useState(70);
  const [enableFormatting, setEnableFormatting] = useState(true);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [enableEnhancedMarkdown, setEnableEnhancedMarkdown] = useState(true);
  const [markdownComplexity, setMarkdownComplexity] = useState<'simple' | 'moderate' | 'complex'>('moderate');
  const [showTableOfContents, setShowTableOfContents] = useState(true);

  // Load current session on component mount
  useEffect(() => {
    const session = getCurrentSession();
    if (session) {
      setCurrentSession(session);
      setResults(session.results);
    }
  }, []);

  const handleResearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setResults(null);
    setActivities([]);
    setCurrentSession(null);
    
    try {
      const response = await fetch('/api/research?stream=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          relevanceThreshold,
          enableFormatting
        })
      });
      
      if (!response.ok) {
        throw new Error('Research failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No response stream available');
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'activity':
                  setActivities(prev => [...prev, data.data]);
                  break;
                case 'analysis':
                  // Store analysis data if needed
                  break;
                case 'complete':
                  setResults(data.data);
                  setLoading(false);
                  
                  // Create and save research session
                  const session = createResearchSession(query, data.data);
                  setCurrentSession(session);
                  break;
                case 'error':
                  setError(data.data.error || 'Research failed');
                  setLoading(false);
                  break;
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Research error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      setLoading(false);
    }
  };

  const handleFollowupQuestion = async () => {
    if (!followupQuestion.trim() || !currentSession) return;
    
    setFollowupLoading(true);
    setFollowupActivities([]);
    
    try {
      const context = extractRelevantContext(currentSession);
      
      const response = await fetch('/api/research/followup?stream=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: followupQuestion,
          context
        })
      });
      
      if (!response.ok) {
        throw new Error('Follow-up question failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No response stream available');
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'activity':
                  setFollowupActivities(prev => [...prev, data.data]);
                  break;
                case 'complete':
                  // Add follow-up to session
                  const followup: FollowupQuestion = {
                    id: generateSessionId(),
                    question: followupQuestion,
                    answer: data.data.answer,
                    timestamp: data.data.timestamp,
                    contextUsed: data.data.contextUsed,
                    sources: data.data.sources
                  };
                  
                  addFollowupToSession(currentSession.id, followup);
                  
                  // Update current session state
                  const updatedSession = { ...currentSession };
                  updatedSession.followups.push(followup);
                  setCurrentSession(updatedSession);
                  
                  setFollowupQuestion('');
                  setFollowupLoading(false);
                  setFollowupActivities([]);
                  break;
                case 'error':
                  setError(data.data.error || 'Follow-up question failed');
                  setFollowupLoading(false);
                  break;
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Follow-up error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      setFollowupLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleResearch();
    }
  };

  const handleFollowupKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleFollowupQuestion();
    }
  };

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1f2937' }}>
          🔍 AI Research Agent
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#6b7280', marginBottom: '2rem' }}>
          Comprehensive research using AI analysis, web search, and content scraping
        </p>
      </div>
      
      <div style={{ marginBottom: '3rem', backgroundColor: '#f9fafb', padding: '2rem', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
        <textarea
          style={{
            width: '100%',
            padding: '1rem',
            border: '2px solid #d1d5db',
            borderRadius: '8px',
            minHeight: '120px',
            fontSize: '1rem',
            resize: 'vertical',
            outline: 'none',
            transition: 'border-color 0.2s',
            color: '#000000',
            backgroundColor: '#ffffff'
          }}
          placeholder="What would you like to research? (e.g., 'Latest developments in AI', 'Current state of renewable energy', 'Recent changes in cryptocurrency regulations')"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyPress}
          onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
          onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <small style={{ color: '#6b7280' }}>Press Ctrl+Enter to start research</small>
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                transition: 'all 0.2s'
              }}
            >
              ⚙️ {showAdvancedOptions ? 'Hide' : 'Show'} Options
            </button>
          </div>
          <button
            onClick={handleResearch}
            disabled={loading || !query.trim()}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: loading || !query.trim() ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? '🔄 Researching...' : '🚀 Start Research'}
          </button>
        </div>
        
        {showAdvancedOptions && (
          <div style={{
            marginTop: '1rem',
            padding: '1.5rem',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px'
          }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>
              🎛️ Advanced Options
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Relevance Threshold: {relevanceThreshold}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="90"
                  value={relevanceThreshold}
                  onChange={(e) => setRelevanceThreshold(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '3px',
                    background: '#e5e7eb',
                    outline: 'none'
                  }}
                />
                <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  Higher values show only the most relevant results
                </small>
              </div>
              
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  <input
                    type="checkbox"
                    checked={enableFormatting}
                    onChange={(e) => setEnableFormatting(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  Enhanced Formatting
                </label>
                <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                  Automatically format results with tables and bullet points
                </small>
              </div>
            </div>
            
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
              <h5 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>
                📝 Enhanced Markdown Display
              </h5>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    <input
                      type="checkbox"
                      checked={enableEnhancedMarkdown}
                      onChange={(e) => setEnableEnhancedMarkdown(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    Enhanced Markdown
                  </label>
                  <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    Rich formatting with interactive elements
                  </small>
                </div>
                
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    <input
                      type="checkbox"
                      checked={showTableOfContents}
                      onChange={(e) => setShowTableOfContents(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    Table of Contents
                  </label>
                  <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    Auto-generated navigation
                  </small>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Complexity Level
                  </label>
                  <select
                    value={markdownComplexity}
                    onChange={(e) => setMarkdownComplexity(e.target.value as 'simple' | 'moderate' | 'complex')}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="simple">Simple</option>
                    <option value="moderate">Moderate</option>
                    <option value="complex">Complex</option>
                  </select>
                  <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    Controls interactive features
                  </small>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca', 
          color: '#dc2626', 
          padding: '1rem', 
          borderRadius: '8px', 
          marginBottom: '2rem' 
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && (
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔄</div>
            <h3 style={{ fontSize: '1.3rem', color: '#1f2937', marginBottom: '0.5rem' }}>
              Research in Progress
            </h3>
            <p style={{ fontSize: '1rem', color: '#6b7280' }}>
              Following AI agent activities in real-time
            </p>
          </div>
          
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1rem'
          }}>
            {activities.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: '#9ca3af',
                fontStyle: 'italic',
                padding: '2rem'
              }}>
                Initializing research agents...
              </div>
            ) : (
              <div>
                {activities.map((activity, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      marginBottom: '1rem',
                      padding: '0.75rem',
                      backgroundColor: index === activities.length - 1 ? '#f0f9ff' : 'transparent',
                      borderRadius: '6px',
                      border: index === activities.length - 1 ? '1px solid #bae6fd' : 'none',
                      animation: index === activities.length - 1 ? 'fadeIn 0.3s ease-in' : 'none'
                    }}
                  >
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#9ca3af',
                      minWidth: '60px',
                      marginRight: '1rem',
                      fontFamily: 'monospace'
                    }}>
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </div>
                    <div style={{
                      fontSize: '0.95rem',
                      color: '#1f2937',
                      lineHeight: '1.4',
                      flex: 1
                    }}>
                      {activity.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {results && (
        <div style={{ marginTop: '2rem' }}>
          {/* Analysis Section */}
          <section style={{ marginBottom: '3rem', backgroundColor: '#f0f9ff', padding: '2rem', borderRadius: '12px', border: '1px solid #bae6fd' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#0c4a6e' }}>
              📋 Query Analysis
            </h2>
            <p style={{ marginBottom: '1rem', color: '#1f2937' }}>
              <strong>Original Query:</strong> {results.analysis.originalQuery}
            </p>
            <div>
              <strong style={{ color: '#1f2937' }}>Sub-questions identified:</strong>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                {results.analysis.subQuestions.map((question, index) => (
                  <li key={index} style={{ marginBottom: '0.5rem', color: '#1f2937' }}>
                    {question}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Findings Section */}
          <section style={{ marginBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>
                🔍 Research Findings
              </h2>
              {results.synthesis.relevantFindings !== undefined && (
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {results.synthesis.relevantFindings} relevant • {results.synthesis.filteredOutFindings} filtered
                </div>
              )}
            </div>
            
            {/* Relevant Findings */}
            {results.findings.filter(f => f.isRelevant).map((finding, index) => (
              <div key={index} style={{
                backgroundColor: '#ffffff',
                border: '2px solid #10b981',
                borderRadius: '12px',
                padding: '2rem',
                marginBottom: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#1f2937', flex: 1 }}>
                    Q{index + 1}: {finding.question}
                  </h3>
                  {finding.relevanceScore && (
                    <div style={{
                      backgroundColor: '#10b981',
                      color: 'white',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      marginLeft: '1rem'
                    }}>
                      {finding.relevanceScore.score}% relevant
                    </div>
                  )}
                </div>
                
                <div style={{ marginBottom: '1.5rem', lineHeight: '1.6', color: '#1f2937' }}>
                  {finding.answer}
                </div>
                
                {finding.sources.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                      📚 Sources ({finding.sources.length} web results, {finding.scrapedSources} scraped):
                    </h4>
                    <ul style={{ paddingLeft: '1rem' }}>
                      {finding.sources.map((source, sourceIndex) => (
                        <li key={sourceIndex} style={{ marginBottom: '0.25rem' }}>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#3b82f6', textDecoration: 'none' }}
                            onMouseOver={(e) => (e.target as HTMLElement).style.textDecoration = 'underline'}
                            onMouseOut={(e) => (e.target as HTMLElement).style.textDecoration = 'none'}
                          >
                            {source.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
            
            {/* Filtered Out Findings */}
            {results.findings.filter(f => !f.isRelevant).length > 0 && (
              <details style={{ marginTop: '2rem' }}>
                <summary style={{
                  cursor: 'pointer',
                  padding: '1rem',
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fcd34d',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#92400e'
                }}>
                  📋 View {results.findings.filter(f => !f.isRelevant).length} Filtered Results (Less Relevant)
                </summary>
                <div style={{ marginTop: '1rem' }}>
                  {results.findings.filter(f => !f.isRelevant).map((finding, index) => (
                    <div key={index} style={{
                      backgroundColor: '#fefce8',
                      border: '1px solid #fde047',
                      borderRadius: '8px',
                      padding: '1.5rem',
                      marginBottom: '1rem',
                      opacity: 0.8
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#92400e', flex: 1 }}>
                          {finding.question}
                        </h4>
                        {finding.relevanceScore && (
                          <div style={{
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            marginLeft: '1rem'
                          }}>
                            {finding.relevanceScore.score}% relevant
                          </div>
                        )}
                      </div>
                      
                      {finding.relevanceScore?.reasoning && (
                        <div style={{ fontSize: '0.875rem', color: '#a16207', marginBottom: '1rem', fontStyle: 'italic' }}>
                          Filtered reason: {finding.relevanceScore.reasoning}
                        </div>
                      )}
                      
                      <div style={{ fontSize: '0.875rem', lineHeight: '1.5', color: '#92400e' }}>
                        {finding.answer.substring(0, 200)}...
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </section>

          {/* Synthesis Section */}
          <section style={{ backgroundColor: '#f0fdf4', padding: '2rem', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#14532d' }}>
                🎯 Research Synthesis
              </h2>
              {results.synthesis.formatMetadata && (
                <div style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}>
                  📝 {results.synthesis.formatMetadata.format} format
                </div>
              )}
            </div>
            
            {enableEnhancedMarkdown ? (
              <div style={{ marginBottom: '2rem' }}>
                <MarkdownRenderer
                  content={results.synthesis.summary}
                  theme="research"
                  showToc={showTableOfContents}
                  enableInteractive={markdownComplexity !== 'simple'}
                />
              </div>
            ) : (
              <div
                style={{ marginBottom: '2rem', lineHeight: '1.7', color: '#1f2937', fontSize: '1.05rem' }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(results.synthesis.summary) }}
              />
            )}
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem',
              marginTop: '1.5rem',
              padding: '1rem',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #d1fae5'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
                  {results.synthesis.totalSources}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Web Sources</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
                  {results.synthesis.totalScrapedSources}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Scraped Pages</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
                  {results.synthesis.confidence}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Confidence</div>
              </div>
              {results.synthesis.relevantFindings !== undefined && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
                    {results.synthesis.relevantFindings}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Relevant</div>
                </div>
              )}
              {results.synthesis.averageRelevanceScore !== undefined && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
                    {results.synthesis.averageRelevanceScore}%
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Avg Relevance</div>
                </div>
              )}
            </div>
            
            {results.synthesis.formatMetadata && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                backgroundColor: '#ecfdf5',
                borderRadius: '8px',
                border: '1px solid #bbf7d0'
              }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#14532d' }}>
                  🎨 Enhanced Formatting Applied
                </h4>
                <div style={{ fontSize: '0.875rem', color: '#166534' }}>
                  <strong>Format:</strong> {results.synthesis.formatMetadata.format} •
                  {results.synthesis.formatMetadata.hasComparisons && ' Comparisons'}
                  {results.synthesis.formatMetadata.hasLists && ' Lists'}
                  {results.synthesis.formatMetadata.hasData && ' Data Tables'}
                </div>
              </div>
            )}
            
            <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#374151' }}>
              <strong>Methodology:</strong> {results.synthesis.methodology}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.5rem' }}>
              Research completed at: {new Date(results.timestamp).toLocaleString()}
            </div>
          </section>

          {/* Follow-up Questions Section */}
          {currentSession && (
            <section style={{ marginTop: '3rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1f2937' }}>
                💬 Follow-up Questions
              </h2>
              
              {/* Follow-up Input */}
              <div style={{
                backgroundColor: '#fefce8',
                padding: '2rem',
                borderRadius: '12px',
                border: '1px solid #fde047',
                marginBottom: '2rem'
              }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem', color: '#92400e' }}>
                  Ask a follow-up question about your research
                </h3>
                <textarea
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: '2px solid #fbbf24',
                    borderRadius: '8px',
                    minHeight: '80px',
                    fontSize: '1rem',
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    color: '#000000',
                    backgroundColor: '#ffffff'
                  }}
                  placeholder="Ask a specific question about the research findings... (e.g., 'Can you explain more about...', 'What are the latest developments in...', 'How does this compare to...')"
                  value={followupQuestion}
                  onChange={(e) => setFollowupQuestion(e.target.value)}
                  onKeyDown={handleFollowupKeyPress}
                  onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                  onBlur={(e) => e.target.style.borderColor = '#fbbf24'}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                  <small style={{ color: '#92400e' }}>Press Ctrl+Enter to ask follow-up question</small>
                  <button
                    onClick={handleFollowupQuestion}
                    disabled={followupLoading || !followupQuestion.trim()}
                    style={{
                      padding: '0.75rem 2rem',
                      backgroundColor: followupLoading || !followupQuestion.trim() ? '#9ca3af' : '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: followupLoading || !followupQuestion.trim() ? 'not-allowed' : 'pointer',
                      fontSize: '1rem',
                      fontWeight: '600',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {followupLoading ? '🤔 Processing...' : '💭 Ask Question'}
                  </button>
                </div>
              </div>

              {/* Follow-up Loading */}
              {followupLoading && (
                <div style={{
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fcd34d',
                  borderRadius: '12px',
                  padding: '2rem',
                  marginBottom: '2rem'
                }}>
                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🤔</div>
                    <h3 style={{ fontSize: '1.3rem', color: '#92400e', marginBottom: '0.5rem' }}>
                      Processing Follow-up Question
                    </h3>
                    <p style={{ fontSize: '1rem', color: '#a16207' }}>
                      Analyzing context and generating response...
                    </p>
                  </div>
                  
                  <div style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    backgroundColor: '#ffffff',
                    border: '1px solid #fcd34d',
                    borderRadius: '8px',
                    padding: '1rem'
                  }}>
                    {followupActivities.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        color: '#a16207',
                        fontStyle: 'italic',
                        padding: '2rem'
                      }}>
                        Preparing contextual analysis...
                      </div>
                    ) : (
                      <div>
                        {followupActivities.map((activity, index) => (
                          <div
                            key={index}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              marginBottom: '1rem',
                              padding: '0.75rem',
                              backgroundColor: index === followupActivities.length - 1 ? '#fef3c7' : 'transparent',
                              borderRadius: '6px',
                              border: index === followupActivities.length - 1 ? '1px solid #fcd34d' : 'none'
                            }}
                          >
                            <div style={{
                              fontSize: '0.8rem',
                              color: '#a16207',
                              minWidth: '60px',
                              marginRight: '1rem',
                              fontFamily: 'monospace'
                            }}>
                              {new Date(activity.timestamp).toLocaleTimeString()}
                            </div>
                            <div style={{
                              fontSize: '0.95rem',
                              color: '#92400e',
                              lineHeight: '1.4',
                              flex: 1
                            }}>
                              {activity.message}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Conversation Thread */}
              {currentSession.followups.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '1.5rem', color: '#1f2937' }}>
                    📝 Conversation History
                  </h3>
                  {currentSession.followups.map((followup, index) => (
                    <div key={followup.id} style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '2rem',
                      marginBottom: '1.5rem',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}>
                      <div style={{
                        backgroundColor: '#f3f4f6',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        borderLeft: '4px solid #6366f1'
                      }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#4338ca', marginBottom: '0.5rem' }}>
                          Follow-up Question #{index + 1}:
                        </h4>
                        <p style={{ color: '#1f2937', lineHeight: '1.5' }}>
                          {followup.question}
                        </p>
                      </div>
                      
                      <div style={{ marginBottom: '1.5rem' }}>
                        {enableEnhancedMarkdown ? (
                          <MarkdownRenderer
                            content={followup.answer}
                            theme="research"
                            showToc={false}
                            enableInteractive={markdownComplexity !== 'simple'}
                          />
                        ) : (
                          <div style={{ lineHeight: '1.6', color: '#1f2937' }}>
                            {followup.answer}
                          </div>
                        )}
                      </div>
                      
                      {followup.sources && followup.sources.length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                          <h5 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                            📚 Additional Sources:
                          </h5>
                          <ul style={{ paddingLeft: '1rem' }}>
                            {followup.sources.map((source, sourceIndex) => (
                              <li key={sourceIndex} style={{ marginBottom: '0.25rem' }}>
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#3b82f6', textDecoration: 'none' }}
                                  onMouseOver={(e) => (e.target as HTMLElement).style.textDecoration = 'underline'}
                                  onMouseOut={(e) => (e.target as HTMLElement).style.textDecoration = 'none'}
                                >
                                  {source.title}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '1rem' }}>
                        Asked at: {new Date(followup.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </main>
  );
}
