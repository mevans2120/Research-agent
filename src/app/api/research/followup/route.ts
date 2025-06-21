import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import * as cheerio from 'cheerio';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

async function searchWeb(query: string): Promise<SearchResult[]> {
  try {
    // Using SerpAPI for web search
    const serpApiKey = process.env.SERPAPI_KEY;
    if (!serpApiKey || serpApiKey === 'your_serpapi_key_here') {
      console.warn('SERPAPI_KEY not configured, using fallback search method');
      return await fallbackSearch();
    }

    const response = await axios.get('https://serpapi.com/search', {
      params: {
        engine: 'google',
        q: query,
        api_key: serpApiKey,
        num: 3 // Fewer results for follow-up questions
      }
    });

    const results = response.data.organic_results || [];
    return results.map((result: { title?: string; link?: string; snippet?: string }, index: number) => ({
      title: result.title || '',
      link: result.link || '',
      snippet: result.snippet || '',
      position: index + 1
    }));
  } catch (error) {
    console.error('Web search error:', error);
    return await fallbackSearch();
  }
}

async function fallbackSearch(): Promise<SearchResult[]> {
  // Simplified fallback for follow-up questions
  console.log('No web search available for follow-up question');
  return [];
}

async function scrapeContent(url: string): Promise<ScrapedContent> {
  try {
    const response = await axios.get(url, {
      timeout: 8000,
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
      .substring(0, 2000); // Smaller limit for follow-up questions
    
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

async function processFollowupQuestion(
  question: string,
  context: string,
  sendEvent: (type: string, data: { message: string; timestamp: string }) => void
) {
  sendEvent('activity', {
    message: `🤔 Processing follow-up question: "${question.substring(0, 50)}${question.length > 50 ? '...' : ''}"`,
    timestamp: new Date().toISOString()
  });

  // Determine if we need additional web research
  const needsWebResearch = await shouldSearchWeb(question);
  
  let webContext = '';
  let sources: Array<{ title: string; url: string }> = [];
  
  if (needsWebResearch) {
    sendEvent('activity', {
      message: '🌐 Searching for additional information...',
      timestamp: new Date().toISOString()
    });
    
    // Search for additional information
    const searchResults = await searchWeb(question);
    
    if (searchResults.length > 0) {
      sendEvent('activity', {
        message: `📄 Found ${searchResults.length} additional sources, analyzing...`,
        timestamp: new Date().toISOString()
      });
      
      // Scrape content from search results
      const scrapedContent: ScrapedContent[] = [];
      for (const result of searchResults.slice(0, 2)) {
        const content = await scrapeContent(result.link);
        scrapedContent.push(content);
      }
      
      webContext = scrapedContent
        .filter(content => content.content && !content.error)
        .map(content => `Source: ${content.url}\nContent: ${content.content}`)
        .join('\n\n');
      
      sources = searchResults.map(r => ({ title: r.title, url: r.link }));
    }
  }

  sendEvent('activity', {
    message: '🤖 Generating contextual response...',
    timestamp: new Date().toISOString()
  });

  // Generate response using context and any additional web data
  const promptContent = `You are a research assistant providing a follow-up answer based on previous research context and the user's specific question.

PREVIOUS RESEARCH CONTEXT:
${context}

${webContext ? `ADDITIONAL WEB RESEARCH:
${webContext}` : ''}

USER'S FOLLOW-UP QUESTION: ${question}

Please provide a comprehensive, contextual answer that:
1. References relevant information from the previous research
2. Directly addresses the specific follow-up question
3. Incorporates any additional web research if available
4. Maintains continuity with the conversation thread
5. Provides specific, actionable insights

Focus on being precise and helpful while building upon the established research context.`;

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: promptContent
      }
    ],
    temperature: 0.3,
  });

  const answer = response.content[0].type === 'text' ? response.content[0].text : '';

  sendEvent('activity', {
    message: '✅ Follow-up response generated successfully!',
    timestamp: new Date().toISOString()
  });

  return {
    answer,
    sources,
    contextUsed: [context.substring(0, 200) + '...'],
    method: webContext ? "Context + Web research + Claude-3 analysis" : "Context + Claude-3 analysis"
  };
}

async function shouldSearchWeb(question: string): Promise<boolean> {
  // Simple heuristic to determine if additional web search is needed
  const webSearchKeywords = [
    'latest', 'recent', 'current', 'new', 'update', 'today', 'now',
    'price', 'cost', 'market', 'stock', 'news', 'development'
  ];
  
  const questionLower = question.toLowerCase();
  return webSearchKeywords.some(keyword => questionLower.includes(keyword));
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const isStreaming = url.searchParams.get('stream') === 'true';
  
  if (isStreaming) {
    return handleStreamingFollowup(request);
  }
  
  try {
    const { question, context } = await request.json();
    
    if (!question || !context) {
      return NextResponse.json({ 
        error: 'Question and context are required' 
      }, { status: 400 });
    }
    
    console.log(`Processing follow-up question: ${question}`);
    
    const result = await processFollowupQuestion(question, context, () => {});
    
    return NextResponse.json({
      question,
      answer: result.answer,
      sources: result.sources,
      contextUsed: result.contextUsed,
      method: result.method,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Follow-up API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function handleStreamingFollowup(request: NextRequest) {
  const { question, context } = await request.json();
  
  if (!question || !context) {
    return NextResponse.json({ 
      error: 'Question and context are required' 
    }, { status: 400 });
  }

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const sendEvent = (type: string, data: { message: string; timestamp: string } | { question: string; answer: string; sources: Array<{ title: string; url: string }>; contextUsed: string[]; method: string; timestamp: string } | { message: string; error: string }) => {
          const message = `data: ${JSON.stringify({ type, data })}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        const result = await processFollowupQuestion(question, context, sendEvent);
        
        sendEvent('complete', {
          question,
          answer: result.answer,
          sources: result.sources,
          contextUsed: result.contextUsed,
          method: result.method,
          timestamp: new Date().toISOString()
        });
        
        controller.close();
      } catch (error) {
        console.error('Streaming follow-up error:', error);
        const sendEvent = (type: string, data: { message: string; error: string }) => {
          const message = `data: ${JSON.stringify({ type, data })}\n\n`;
          controller.enqueue(encoder.encode(message));
        };
        sendEvent('error', {
          message: 'Follow-up processing failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        controller.close();
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