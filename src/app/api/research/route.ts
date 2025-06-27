import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import * as cheerio from 'cheerio';


// Lazy initialization function to avoid module-level client creation
function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }
  return new Anthropic({ apiKey });
}

// Rate limiting utility
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced error handling for Claude API calls
async function callClaudeWithErrorHandling(clientCall: () => Promise<any>, context: string) {
  try {
    return await clientCall();
  } catch (error: any) {
    if (error.status === 401) {
      console.error(`Claude API 401 Error in ${context}:`, {
        apiKeyPresent: !!process.env.ANTHROPIC_API_KEY,
        apiKeyPrefix: process.env.ANTHROPIC_API_KEY?.substring(0, 10),
        timestamp: new Date().toISOString(),
        context
      });
    }
    console.error(`Claude API Error in ${context}:`, error);
    throw error;
  }
}

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  error?: string;
}

interface RelevanceScore {
  score: number;
  reasoning: string;
}

interface FilteredFinding {
  question: string;
  answer: string;
  sources: { title: string; url: string }[];
  scrapedSources: number;
  method: string;
  relevanceScore?: RelevanceScore;
  isRelevant: boolean;
}

interface FormattingMetadata {
  format: 'table' | 'bullets' | 'mixed' | 'narrative';
  hasComparisons: boolean;
  hasLists: boolean;
  hasData: boolean;
}

async function analyzeQuery(query: string) {
  const anthropic = getAnthropicClient();
  
  const response = await callClaudeWithErrorHandling(
    () => anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `You are a research analyst. Break down the user's query into 3-5 specific sub-questions that need to be researched to provide a comprehensive answer. Focus on questions that would benefit from current, real-time information.

Query to analyze: ${query}

Please provide 3-5 specific sub-questions, each on a new line, that would help research this topic comprehensively.`
        }
      ],
      temperature: 0.3,
    }),
    'analyzeQuery'
  );

  const content = response.content[0].type === 'text' ? response.content[0].text : '';
  const subQuestions = content.split('\n').filter((line: string) => line.trim().length > 0) || [];
  
  return {
    originalQuery: query,
    subQuestions,
    analysisMethod: "Claude-3 Sonnet decomposition"
  };
}

async function searchWeb(query: string): Promise<SearchResult[]> {
  try {
    // Using Brave Search API for web search
    const braveApiKey = process.env.BRAVE_API_KEY;
    if (!braveApiKey) {
      console.warn('BRAVE_API_KEY not configured, using fallback search method');
      return await fallbackSearch(query);
    }

    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      params: {
        q: query,
        count: 5,
        offset: 0,
        mkt: 'en-US',
        safesearch: 'moderate',
        textDecorations: false,
        textFormat: 'Raw'
      },
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': braveApiKey
      }
    });

    const results = response.data.web?.results || [];
    return results.map((result: { title?: string; url?: string; description?: string }, index: number) => ({
      title: result.title || '',
      link: result.url || '',
      snippet: result.description || '',
      position: index + 1
    }));
  } catch (error) {
    console.error('Brave Search API error:', error);
    console.log('Falling back to alternative search method');
    return await fallbackSearch(query);
  }
}

async function fallbackSearch(query: string): Promise<SearchResult[]> {
  // Fallback: Generate relevant URLs based on the query topic
  // This is a simplified approach for when API search is not available
  const insuranceRelatedUrls = [
    'https://www.aetna.com/individuals-families/plans-services.html',
    'https://www.aetna.com/health-care-professionals/provider-education-manuals.html',
    'https://www.aetna.com/about-us/aetna-facts-health-information.html',
    'https://www.healthcare.gov/glossary/',
    'https://www.cms.gov/marketplace/resources/data/public-use-files'
  ];
  
  // For insurance-related queries, return relevant URLs
  if (query.toLowerCase().includes('aetna') || query.toLowerCase().includes('insurance')) {
    return insuranceRelatedUrls.map((url, index) => ({
      title: `Aetna Insurance Information - ${index + 1}`,
      link: url,
      snippet: `Information about Aetna insurance plans and services related to: ${query}`,
      position: index + 1
    }));
  }
  
  // For other queries, return empty array (will rely on AI knowledge)
  console.log('No fallback URLs available for this query type');
  return [];
}

async function scrapeContent(url: string): Promise<ScrapedContent> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Remove script and style elements
    $('script, style, nav, footer, header, aside').remove();
    
    // Extract title
    const title = $('title').text().trim() || $('h1').first().text().trim() || 'No title';
    
    // Extract main content
    let content = '';
    
    // Try to find main content areas
    const contentSelectors = [
      'main',
      'article',
      '.content',
      '.main-content',
      '.post-content',
      '.entry-content',
      '#content',
      '.article-body'
    ];
    
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text().trim();
        break;
      }
    }
    
    // Fallback to body if no specific content area found
    if (!content) {
      content = $('body').text().trim();
    }
    
    // Clean up content - remove extra whitespace and limit length
    content = content
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 3000); // Limit to 3000 characters
    
    return {
      url,
      title,
      content
    };
  } catch (error) {
    return {
      url,
      title: 'Error',
      content: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function gatherInformation(subQuestions: string[]) {
  const findings = [];
  
  for (const question of subQuestions) {
    console.log(`Researching: ${question}`);
    
    // Step 1: Search the web for current information
    const searchResults = await searchWeb(question);
    
    // Step 2: Scrape content from top search results
    const scrapedContent: ScrapedContent[] = [];
    const urlsToScrape = searchResults.slice(0, 3).map(result => result.link);
    
    for (const url of urlsToScrape) {
      const content = await scrapeContent(url);
      scrapedContent.push(content);
    }
    
    // Step 3: Combine search results and scraped content for AI analysis
    const webContext = searchResults.map(result =>
      `Title: ${result.title}\nSnippet: ${result.snippet}\nURL: ${result.link}`
    ).join('\n\n');
    
    const scrapedContext = scrapedContent
      .filter(content => content.content && !content.error)
      .map(content =>
        `Source: ${content.url}\nTitle: ${content.title}\nContent: ${content.content.substring(0, 1000)}...`
      ).join('\n\n');
    
    // Step 4: Use AI to analyze and synthesize the information
    const hasWebData = webContext.length > 0 || scrapedContext.length > 0;
    const promptContent = hasWebData
      ? `Research Question: ${question}

Web Search Results:
${webContext}

Scraped Content:
${scrapedContext}

Based on the above web search results and scraped content, provide a comprehensive and accurate answer to the research question. Focus on the most current and relevant information. If the sources don't contain sufficient information, mention that and provide what context you can from your training data.`
      : `Research Question: ${question}

No current web search results are available. Please provide a comprehensive answer to this research question based on your training data. Focus on providing accurate, detailed information while noting that this information may not reflect the most recent developments.`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: promptContent
        }
      ]
    });
    
    findings.push({
      question,
      answer: response.content[0].type === 'text' ? response.content[0].text : '',
      sources: searchResults.map(r => ({ title: r.title, url: r.link })),
      scrapedSources: scrapedContent.filter(c => !c.error).length,
      method: hasWebData ? "Web search + scraping + Claude-3 analysis" : "Claude-3 knowledge base analysis"
    });
  }
  
  return findings;
}

async function scoreRelevance(finding: { question: string; answer: string }, originalQuery: string): Promise<RelevanceScore> {
  const anthropic = getAnthropicClient();
  
  // Add rate limiting delay
  await delay(200);
  
  const response = await callClaudeWithErrorHandling(
    () => anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are a relevance evaluator. Score how relevant this research finding is to the original query on a scale of 0-100.

Original Query: "${originalQuery}"

Research Finding:
Question: ${finding.question}
Answer: ${finding.answer}

Provide a relevance score (0-100) and brief reasoning. Focus on:
- Direct relevance to the original query
- Quality and specificity of information
- Usefulness for answering the original question

Respond in this exact format:
Score: [number]
Reasoning: [brief explanation]`
        }
      ],
      temperature: 0.1,
    }),
    'scoreRelevance'
  );

  const content = response.content[0].type === 'text' ? response.content[0].text : '';
  const scoreMatch = content.match(/Score:\s*(\d+)/);
  const reasoningMatch = content.match(/Reasoning:\s*([\s\S]+)/);
  
  return {
    score: scoreMatch ? parseInt(scoreMatch[1]) : 50,
    reasoning: reasoningMatch ? reasoningMatch[1].trim() : 'Unable to determine relevance'
  };
}

async function filterFindingsByRelevance(findings: { question: string; answer: string; sources: { title: string; url: string }[]; scrapedSources: number; method: string }[], originalQuery: string, threshold: number = 70): Promise<FilteredFinding[]> {
  const filteredFindings: FilteredFinding[] = [];
  
  for (const finding of findings) {
    const relevanceScore = await scoreRelevance(finding, originalQuery);
    const isRelevant = relevanceScore.score >= threshold;
    
    filteredFindings.push({
      ...finding,
      relevanceScore,
      isRelevant
    });
  }
  
  return filteredFindings;
}

async function detectOptimalFormat(findings: FilteredFinding[], originalQuery: string): Promise<FormattingMetadata> {
  const anthropic = getAnthropicClient();
  
  // Add rate limiting delay
  await delay(200);
  
  const response = await callClaudeWithErrorHandling(
    () => anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Analyze these research findings and determine the optimal presentation format.

Original Query: "${originalQuery}"

Number of findings: ${findings.length}
Sample findings: ${findings.slice(0, 2).map(f => `Q: ${f.question}\nA: ${f.answer.substring(0, 200)}...`).join('\n\n')}

Determine the best format based on content type:
- "table" if findings contain comparisons, data, or structured information that would benefit from tabular presentation
- "bullets" if findings are best presented as lists or key points
- "mixed" if some findings need tables and others need bullets
- "narrative" if findings are best presented as flowing text

Also identify:
- hasComparisons: true if content compares different items/options
- hasLists: true if content contains enumerated items or lists
- hasData: true if content contains numbers, statistics, or data points

Respond in this exact format:
Format: [table|bullets|mixed|narrative]
HasComparisons: [true|false]
HasLists: [true|false]
HasData: [true|false]`
        }
      ],
      temperature: 0.1,
    }),
    'detectOptimalFormat'
  );

  const content = response.content[0].type === 'text' ? response.content[0].text : '';
  const formatMatch = content.match(/Format:\s*(table|bullets|mixed|narrative)/i);
  const comparisonsMatch = content.match(/HasComparisons:\s*(true|false)/i);
  const listsMatch = content.match(/HasLists:\s*(true|false)/i);
  const dataMatch = content.match(/HasData:\s*(true|false)/i);

  return {
    format: (formatMatch?.[1]?.toLowerCase() as FormattingMetadata['format']) || 'narrative',
    hasComparisons: comparisonsMatch?.[1]?.toLowerCase() === 'true',
    hasLists: listsMatch?.[1]?.toLowerCase() === 'true',
    hasData: dataMatch?.[1]?.toLowerCase() === 'true'
  };
}

async function enhancedSynthesizeFindings(originalQuery: string, filteredFindings: FilteredFinding[], formatMetadata: FormattingMetadata) {
  const relevantFindings = filteredFindings.filter(f => f.isRelevant);
  const filteredOutFindings = filteredFindings.filter(f => !f.isRelevant);
  
  const combinedFindings = relevantFindings.map(f =>
    `Q: ${f.question}\nA: ${f.answer}\nSources: ${f.sources.map(s => s.title).join(', ')}\nRelevance: ${f.relevanceScore?.score}/100`
  ).join('\n\n');

  let formatInstructions = '';
  switch (formatMetadata.format) {
    case 'table':
      formatInstructions = `Present the synthesis using markdown tables where appropriate. Use proper markdown table syntax with clear headers and organized data. Include comparison tables if the content involves comparing different options, features, or data points.`;
      break;
    case 'bullets':
      formatInstructions = `Present the synthesis using markdown bullet points and numbered lists. Organize information hierarchically with main points and sub-points. Use clear, concise bullet points for easy scanning.`;
      break;
    case 'mixed':
      formatInstructions = `Use a combination of markdown tables and bullet points as appropriate. Use tables for comparative data and structured information, and bullet points for lists and key takeaways. Choose the format that best presents each piece of information.`;
      break;
    case 'narrative':
      formatInstructions = `Present the synthesis as well-structured markdown text with clear paragraphs and logical flow. Use markdown headings (##, ###) and subheadings to organize the content.`;
      break;
  }

  const anthropic = getAnthropicClient();
  
  // Add rate limiting delay
  await delay(200);
  
  const response = await callClaudeWithErrorHandling(
    () => anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2500,
      messages: [
        {
          role: "user",
          content: `You are a research synthesizer with enhanced markdown formatting capabilities. Combine the research findings into a comprehensive, well-structured markdown answer to the original query.

Original Query: ${originalQuery}

Relevant Research Findings (${relevantFindings.length} findings):
${combinedFindings}

MARKDOWN FORMATTING INSTRUCTIONS:
${formatInstructions}

Additional markdown formatting guidelines:
- Use proper markdown syntax throughout (##, ###, -, *, |, etc.)
- Use markdown headings (## Main Topic, ### Subtopic) to structure content
- Include source attribution using markdown links where possible
- Use **bold** and *italic* text for emphasis
- Create markdown tables with proper | syntax for tabular data
- Use markdown lists (- or 1.) for organized information
- Ensure the response directly answers the original query
- Make the content easy to scan and digest with proper markdown structure
- ${formatMetadata.hasComparisons ? 'Include comparison tables using markdown table syntax where relevant' : ''}
- ${formatMetadata.hasLists ? 'Use markdown lists to organize information clearly' : ''}
- ${formatMetadata.hasData ? 'Present data and statistics in markdown tables or formatted lists' : ''}

IMPORTANT: Return ONLY properly formatted markdown content. Do not include any explanatory text about the formatting - just the formatted research synthesis.

Please provide a comprehensive synthesis with enhanced markdown formatting that directly answers the original query.`
        }
      ],
      temperature: 0.2,
    }),
    'enhancedSynthesizeFindings'
  );

  const totalSources = relevantFindings.reduce((acc, f) => acc + f.sources.length, 0);
  const totalScrapedSources = relevantFindings.reduce((acc, f) => acc + f.scrapedSources, 0);
  const avgRelevanceScore = relevantFindings.length > 0
    ? relevantFindings.reduce((acc, f) => acc + (f.relevanceScore?.score || 0), 0) / relevantFindings.length
    : 0;

  return {
    summary: response.content[0].type === 'text' ? response.content[0].text : '',
    methodology: "Enhanced Claude-3 Sonnet analysis with relevance filtering and structured formatting",
    confidence: avgRelevanceScore >= 80 ? "High" : avgRelevanceScore >= 60 ? "Medium" : "Low",
    totalSources,
    totalScrapedSources,
    relevantFindings: relevantFindings.length,
    filteredOutFindings: filteredOutFindings.length,
    averageRelevanceScore: Math.round(avgRelevanceScore),
    formatMetadata,
    sourceBreakdown: relevantFindings.map(f => ({
      question: f.question,
      sourceCount: f.sources.length,
      sources: f.sources,
      relevanceScore: f.relevanceScore?.score
    })),
    filteredFindings: filteredOutFindings.map(f => ({
      question: f.question,
      relevanceScore: f.relevanceScore?.score,
      reasoning: f.relevanceScore?.reasoning
    }))
  };
}

interface EventData {
  message: string;
  timestamp: string;
}

interface AnalysisEventData {
  originalQuery: string;
  subQuestions: string[];
  analysisMethod: string;
}

interface CompleteEventData {
  analysis: {
    originalQuery: string;
    subQuestions: string[];
    analysisMethod: string;
  };
  findings: FilteredFinding[];
  synthesis: {
    summary: string;
    methodology: string;
    confidence: string;
    totalSources: number;
    totalScrapedSources: number;
    relevantFindings?: number;
    filteredOutFindings?: number;
    averageRelevanceScore?: number;
    formatMetadata?: FormattingMetadata;
    sourceBreakdown: Array<{
      question: string;
      sourceCount: number;
      sources: { title: string; url: string }[];
      relevanceScore?: number;
    }>;
    filteredFindings?: Array<{
      question: string;
      relevanceScore?: number;
      reasoning?: string;
    }>;
  };
  timestamp: string;
}

interface ErrorEventData {
  message: string;
  error: string;
}

type StreamEventData = EventData | AnalysisEventData | CompleteEventData | ErrorEventData;

async function gatherInformationWithProgress(subQuestions: string[], sendEvent: (type: string, data: StreamEventData) => void) {
  const findings = [];
  
  for (let i = 0; i < subQuestions.length; i++) {
    const question = subQuestions[i];
    const questionNum = i + 1;
    
    sendEvent('activity', {
      message: `🌐 Searching web for question ${questionNum}/${subQuestions.length}: "${question.substring(0, 60)}${question.length > 60 ? '...' : ''}"`,
      timestamp: new Date().toISOString()
    });
    
    // Step 1: Search the web for current information
    const searchResults = await searchWeb(question);
    
    sendEvent('activity', {
      message: `📄 Found ${searchResults.length} web sources, scraping content...`,
      timestamp: new Date().toISOString()
    });
    
    // Step 2: Scrape content from top search results
    const scrapedContent: ScrapedContent[] = [];
    const urlsToScrape = searchResults.slice(0, 3).map(result => result.link);
    
    for (const url of urlsToScrape) {
      try {
        const content = await scrapeContent(url);
        scrapedContent.push(content);
        if (!content.error) {
          const domain = new URL(url).hostname;
          sendEvent('activity', {
            message: `📄 Scraped content from ${domain}`,
            timestamp: new Date().toISOString()
          });
        }
      } catch {
        // Continue with other URLs if one fails
      }
    }
    
    sendEvent('activity', {
      message: `🤖 Analyzing findings for question ${questionNum}/${subQuestions.length}...`,
      timestamp: new Date().toISOString()
    });
    
    // Step 3: Combine search results and scraped content for AI analysis
    const webContext = searchResults.map(result =>
      `Title: ${result.title}\nSnippet: ${result.snippet}\nURL: ${result.link}`
    ).join('\n\n');
    
    const scrapedContext = scrapedContent
      .filter(content => content.content && !content.error)
      .map(content =>
        `Source: ${content.url}\nTitle: ${content.title}\nContent: ${content.content.substring(0, 1000)}...`
      ).join('\n\n');
    
    // Step 4: Use AI to analyze and synthesize the information
    const hasWebData = webContext.length > 0 || scrapedContext.length > 0;
    const promptContent = hasWebData
      ? `Research Question: ${question}

Web Search Results:
${webContext}

Scraped Content:
${scrapedContext}

Based on the above web search results and scraped content, provide a comprehensive and accurate answer to the research question. Focus on the most current and relevant information. If the sources don't contain sufficient information, mention that and provide what context you can from your training data.`
      : `Research Question: ${question}

No current web search results are available. Please provide a comprehensive answer to this research question based on your training data. Focus on providing accurate, detailed information while noting that this information may not reflect the most recent developments.`;

    const anthropic = getAnthropicClient();
    
    // Add rate limiting delay
    await delay(300);
    
    const response = await callClaudeWithErrorHandling(
      () => anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: promptContent
          }
        ]
      }),
      `gatherInformationWithProgress-question-${questionNum}`
    );
    
    findings.push({
      question,
      answer: response.content[0].type === 'text' ? response.content[0].text : '',
      sources: searchResults.map(r => ({ title: r.title, url: r.link })),
      scrapedSources: scrapedContent.filter(c => !c.error).length,
      method: hasWebData ? "Web search + scraping + Claude-3 analysis" : "Claude-3 knowledge base analysis"
    });
    
    sendEvent('activity', {
      message: `✅ Completed research for question ${questionNum}/${subQuestions.length}`,
      timestamp: new Date().toISOString()
    });
  }
  
  return findings;
}

async function synthesizeFindings(originalQuery: string, findings: { question: string; answer: string; sources: { title: string; url: string }[]; scrapedSources: number; method: string }[]) {
  const combinedFindings = findings.map(f =>
    `Q: ${f.question}\nA: ${f.answer}\nSources: ${f.sources.map(s => s.title).join(', ')}`
  ).join('\n\n');
  
  const anthropic = getAnthropicClient();
  
  // Add rate limiting delay
  await delay(200);
  
  const response = await callClaudeWithErrorHandling(
    () => anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are a research synthesizer. Combine the research findings into a comprehensive, well-structured answer to the original query. Include source attribution and ensure the response is accurate and up-to-date based on the provided research.

Original Query: ${originalQuery}

Research Findings:
${combinedFindings}

Please provide a comprehensive synthesis with proper source attribution that directly answers the original query.`
        }
      ],
      temperature: 0.2,
    }),
    'synthesizeFindings'
  );

  const totalSources = findings.reduce((acc, f) => acc + f.sources.length, 0);
  const totalScrapedSources = findings.reduce((acc, f) => acc + f.scrapedSources, 0);

  return {
    summary: response.content[0].type === 'text' ? response.content[0].text : '',
    methodology: "Claude-3 Sonnet analysis with web search and content scraping",
    confidence: "High",
    totalSources,
    totalScrapedSources,
    sourceBreakdown: findings.map(f => ({
      question: f.question,
      sourceCount: f.sources.length,
      sources: f.sources
    }))
  };
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const isStreaming = url.searchParams.get('stream') === 'true';
  
  if (isStreaming) {
    return handleStreamingRequest(request);
  }
  
  try {
    const { query, relevanceThreshold = 70, enableFormatting = true } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }
    
    console.log(`Starting enhanced research for: ${query}`);
    console.log(`Relevance threshold: ${relevanceThreshold}, Enhanced formatting: ${enableFormatting}`);
    
    // Step 1: Analyze the query and create sub-questions
    const analysis = await analyzeQuery(query);
    console.log(`Generated ${analysis.subQuestions.length} sub-questions`);
    
    // Step 2: Research each sub-question with web search and scraping
    const findings = await gatherInformation(analysis.subQuestions);
    console.log(`Completed research for all sub-questions`);
    
    // Step 3: Filter findings by relevance
    const filteredFindings = await filterFindingsByRelevance(findings, query, relevanceThreshold);
    console.log(`Filtered findings: ${filteredFindings.filter(f => f.isRelevant).length} relevant, ${filteredFindings.filter(f => !f.isRelevant).length} filtered out`);
    
    // Step 4: Detect optimal formatting and synthesize
    let synthesis;
    if (enableFormatting) {
      const formatMetadata = await detectOptimalFormat(filteredFindings.filter(f => f.isRelevant), query);
      console.log(`Detected optimal format: ${formatMetadata.format}`);
      synthesis = await enhancedSynthesizeFindings(query, filteredFindings, formatMetadata);
    } else {
      // Fallback to original synthesis for relevant findings only
      const relevantFindings = filteredFindings.filter(f => f.isRelevant);
      synthesis = await synthesizeFindings(query, relevantFindings);
    }
    
    console.log(`Enhanced research synthesis completed`);
    
    return NextResponse.json({
      analysis,
      findings: filteredFindings,
      synthesis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Research API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function handleStreamingRequest(request: NextRequest) {
  const { query, relevanceThreshold = 70, enableFormatting = true } = await request.json();
  
  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      let controllerClosed = false;
      let streamTimeout: NodeJS.Timeout;
      
      // Enhanced controller state management with proper closure detection
      const isControllerClosed = () => {
        return controllerClosed || controller.desiredSize === null;
      };
      
      const closeController = () => {
        if (!controllerClosed) {
          controllerClosed = true;
          if (streamTimeout) {
            clearTimeout(streamTimeout);
          }
          try {
            controller.close();
          } catch (error) {
            // Controller already closed - ignore error
            console.log('Controller already closed during cleanup');
          }
        }
      };
      
      // Set overall stream timeout (60 seconds)
      streamTimeout = setTimeout(() => {
        console.log('Stream timeout reached - closing controller');
        if (!isControllerClosed()) {
          try {
            const timeoutMessage = `data: ${JSON.stringify({
              type: 'error',
              data: {
                message: 'Research process timed out',
                error: 'Stream timeout after 60 seconds'
              }
            })}\n\n`;
            controller.enqueue(encoder.encode(timeoutMessage));
          } catch (error) {
            console.log('Failed to send timeout message:', error);
          }
        }
        closeController();
      }, 60000);
      
      try {
        const sendEvent = (type: string, data: StreamEventData) => {
          if (isControllerClosed()) {
            console.log(`Attempted to send event to closed controller: ${type}`);
            return;
          }
          
          try {
            const message = `data: ${JSON.stringify({ type, data })}\n\n`;
            controller.enqueue(encoder.encode(message));
            
            // Reset timeout on successful event (research is progressing)
            if (streamTimeout) {
              clearTimeout(streamTimeout);
              streamTimeout = setTimeout(() => {
                console.log('Stream timeout reached during research - closing controller');
                if (!isControllerClosed()) {
                  try {
                    const timeoutMessage = `data: ${JSON.stringify({
                      type: 'error',
                      data: {
                        message: 'Research process timed out',
                        error: 'No activity for 60 seconds'
                      }
                    })}\n\n`;
                    controller.enqueue(encoder.encode(timeoutMessage));
                  } catch (error) {
                    console.log('Failed to send timeout message:', error);
                  }
                }
                closeController();
              }, 60000);
            }
            
          } catch (error) {
            console.error('Failed to send event:', error);
            controllerClosed = true;
          }
        };

        sendEvent('activity', { message: '🔍 Analyzing your query...', timestamp: new Date().toISOString() });
        
        // Step 1: Analyze the query and create sub-questions
        const analysis = await analyzeQuery(query);
        sendEvent('activity', {
          message: `📋 Generated ${analysis.subQuestions.length} research questions`,
          timestamp: new Date().toISOString()
        });
        sendEvent('analysis', analysis);
        
        // Step 2: Research each sub-question with web search and scraping
        const findings = await gatherInformationWithProgress(analysis.subQuestions, sendEvent);
        
        // Step 3: Filter findings by relevance
        sendEvent('activity', {
          message: '🎯 Filtering results for relevance...',
          timestamp: new Date().toISOString()
        });
        const filteredFindings = await filterFindingsByRelevance(findings, query, relevanceThreshold);
        const relevantCount = filteredFindings.filter(f => f.isRelevant).length;
        const filteredCount = filteredFindings.filter(f => !f.isRelevant).length;
        
        sendEvent('activity', {
          message: `📊 Found ${relevantCount} relevant findings, filtered out ${filteredCount} less relevant ones`,
          timestamp: new Date().toISOString()
        });
        
        // Step 4: Detect optimal formatting and synthesize
        let synthesis;
        if (enableFormatting && relevantCount > 0) {
          sendEvent('activity', {
            message: '🎨 Detecting optimal formatting style...',
            timestamp: new Date().toISOString()
          });
          const formatMetadata = await detectOptimalFormat(filteredFindings.filter(f => f.isRelevant), query);
          sendEvent('activity', {
            message: `📝 Using ${formatMetadata.format} format for enhanced presentation`,
            timestamp: new Date().toISOString()
          });
          synthesis = await enhancedSynthesizeFindings(query, filteredFindings, formatMetadata);
        } else {
          sendEvent('activity', {
            message: '🎯 Synthesizing research findings...',
            timestamp: new Date().toISOString()
          });
          const relevantFindings = filteredFindings.filter(f => f.isRelevant);
          synthesis = await synthesizeFindings(query, relevantFindings);
        }
        
        sendEvent('activity', {
          message: '✅ Enhanced research completed successfully!',
          timestamp: new Date().toISOString()
        });
        
        sendEvent('complete', {
          analysis,
          findings: filteredFindings,
          synthesis,
          timestamp: new Date().toISOString()
        });
        
        // Clean shutdown
        closeController();
        
      } catch (error) {
        console.error('Streaming research error:', error);
        
        // Send error event if controller is still open
        if (!isControllerClosed()) {
          try {
            const errorMessage = `data: ${JSON.stringify({
              type: 'error',
              data: {
                message: 'Research failed',
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            })}\n\n`;
            controller.enqueue(encoder.encode(errorMessage));
          } catch (controllerError) {
            console.error('Failed to send error message:', controllerError);
          }
        }
        
        // Ensure controller is closed
        closeController();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}