// Session storage utilities for research context management

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

export interface ResearchSession {
  id: string;
  originalQuery: string;
  timestamp: string;
  results: ResearchResults;
  followups: FollowupQuestion[];
}

export interface FollowupQuestion {
  id: string;
  question: string;
  answer: string;
  timestamp: string;
  contextUsed: string[];
  sources?: Array<{ title: string; url: string }>;
}

const SESSION_STORAGE_KEY = 'research_sessions';
const CURRENT_SESSION_KEY = 'current_research_session';

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Save a research session to browser storage
 */
export function saveResearchSession(session: ResearchSession): void {
  try {
    const existingSessions = getStoredSessions();
    const updatedSessions = {
      ...existingSessions,
      [session.id]: session
    };
    
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSessions));
    sessionStorage.setItem(CURRENT_SESSION_KEY, session.id);
  } catch (error) {
    console.error('Failed to save research session:', error);
  }
}

/**
 * Get all stored research sessions
 */
export function getStoredSessions(): Record<string, ResearchSession> {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to retrieve stored sessions:', error);
    return {};
  }
}

/**
 * Get a specific research session by ID
 */
export function getResearchSession(sessionId: string): ResearchSession | null {
  try {
    const sessions = getStoredSessions();
    return sessions[sessionId] || null;
  } catch (error) {
    console.error('Failed to retrieve research session:', error);
    return null;
  }
}

/**
 * Get the current active session ID
 */
export function getCurrentSessionId(): string | null {
  try {
    return sessionStorage.getItem(CURRENT_SESSION_KEY);
  } catch (error) {
    console.error('Failed to get current session ID:', error);
    return null;
  }
}

/**
 * Get the current active research session
 */
export function getCurrentSession(): ResearchSession | null {
  const sessionId = getCurrentSessionId();
  return sessionId ? getResearchSession(sessionId) : null;
}

/**
 * Add a follow-up question to an existing session
 */
export function addFollowupToSession(
  sessionId: string, 
  followup: FollowupQuestion
): void {
  try {
    const session = getResearchSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.followups.push(followup);
    saveResearchSession(session);
  } catch (error) {
    console.error('Failed to add followup to session:', error);
  }
}

/**
 * Create a new research session from results
 */
export function createResearchSession(
  originalQuery: string,
  results: ResearchResults
): ResearchSession {
  const session: ResearchSession = {
    id: generateSessionId(),
    originalQuery,
    timestamp: new Date().toISOString(),
    results,
    followups: []
  };

  saveResearchSession(session);
  return session;
}

/**
 * Extract relevant context from research results for follow-up questions
 */
export function extractRelevantContext(
  session: ResearchSession
): string {
  try {
    // Extract key information from original research
    const originalFindings = session.results.findings || [];
    const synthesis = session.results.synthesis?.summary || '';
    
    // Create a condensed context string
    const contextParts = [
      `Original Query: ${session.originalQuery}`,
      `Research Summary: ${synthesis.substring(0, 500)}...`,
      `Key Findings:`
    ];

    // Add relevant findings (limit to prevent token overflow)
    originalFindings.slice(0, 3).forEach((finding: Finding, index: number) => {
      contextParts.push(`${index + 1}. Q: ${finding.question}`);
      contextParts.push(`   A: ${finding.answer.substring(0, 300)}...`);
    });

    // Add previous follow-ups for conversation continuity
    if (session.followups.length > 0) {
      contextParts.push(`Previous Follow-up Questions:`);
      session.followups.slice(-2).forEach((followup) => {
        contextParts.push(`Q: ${followup.question}`);
        contextParts.push(`A: ${followup.answer.substring(0, 200)}...`);
      });
    }

    return contextParts.join('\n');
  } catch (error) {
    console.error('Failed to extract context:', error);
    return `Original Query: ${session.originalQuery}`;
  }
}

/**
 * Clean up old sessions (keep last 10 sessions)
 */
export function cleanupOldSessions(): void {
  try {
    const sessions = getStoredSessions();
    const sessionEntries = Object.entries(sessions);
    
    if (sessionEntries.length > 10) {
      // Sort by timestamp and keep the 10 most recent
      const sortedSessions = sessionEntries
        .sort(([, a], [, b]) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
      
      const cleanedSessions = Object.fromEntries(sortedSessions);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(cleanedSessions));
    }
  } catch (error) {
    console.error('Failed to cleanup old sessions:', error);
  }
}