# AI Research Agent

A comprehensive AI-powered research tool that combines multiple AI models, web search, and content scraping to provide thorough, up-to-date research on any topic.

## Features

### 🧠 Three-Stage Research Process

1. **Query Analyzer** - Uses GPT-4 to break down complex questions into specific sub-questions
2. **Information Gatherer** - Combines multiple data sources:
   - Web search via SerpAPI
   - Content scraping from relevant websites
   - AI analysis using Claude-3 Sonnet
3. **Synthesizer** - Uses GPT-4 to combine all findings into a coherent, comprehensive response

### 🔍 Advanced Capabilities

- **Real-time Web Search**: Searches current web content using Google Search API
- **Content Scraping**: Extracts and analyzes content from relevant web pages
- **Multi-AI Analysis**: Leverages both OpenAI GPT-4 and Anthropic Claude-3 for diverse perspectives
- **Source Attribution**: Tracks and displays all sources used in research
- **Comprehensive Synthesis**: Combines findings into well-structured, actionable insights
- **Real-time Streaming**: Live progress updates during research with Server-Sent Events
- **Follow-up Questions**: Context-aware follow-up system for deeper exploration
- **Relevance Filtering**: Intelligent filtering of research results by pertinence
- **Enhanced Markdown Display**: Rich formatting with interactive elements and structured presentation

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Keys

Create a `.env.local` file in the root directory with the following keys:

```env
# Required: OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Required: Anthropic API Key  
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Required: SerpAPI Key for web search
SERPAPI_KEY=your_serpapi_key_here
```

#### Getting API Keys:

- **OpenAI**: Get your API key at [platform.openai.com](https://platform.openai.com/api-keys)
- **Anthropic**: Get your API key at [console.anthropic.com](https://console.anthropic.com/)
- **SerpAPI**: Get a free API key at [serpapi.com](https://serpapi.com/) (100 free searches/month)

### 3. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the research agent.

## How It Works

### Research Process Flow

1. **Query Input**: User submits a research question
2. **Analysis**: GPT-4 breaks the query into 3-5 specific sub-questions
3. **Web Search**: Each sub-question is searched using SerpAPI
4. **Content Scraping**: Top search results are scraped for detailed content
5. **AI Analysis**: Claude-3 analyzes scraped content and search results
6. **Relevance Filtering**: Results are scored and filtered for pertinence
7. **Enhanced Formatting**: Content is structured with tables, bullets, and markdown
8. **Synthesis**: GPT-4 combines all findings into a comprehensive answer

### Advanced Features

#### Real-time Streaming
- Live progress updates during research
- Detailed activity logging with timestamps
- Visual feedback for each research phase

#### Follow-up Questions
- Context-aware question processing
- Session-based conversation threading
- Maintains research context across interactions

#### Relevance Filtering
- Configurable relevance thresholds (0-100)
- Automatic filtering of less pertinent results
- Visual distinction between relevant and filtered content

#### Enhanced Markdown Display
- Rich formatting with tables and structured lists
- Interactive elements and collapsible sections
- Responsive design with customizable themes

## Technical Architecture

### Backend (`/api/research`)

- **Framework**: Next.js API Routes
- **AI Models**: 
  - OpenAI GPT-4 (analysis & synthesis)
  - Anthropic Claude-3 Sonnet (information processing & relevance scoring)
- **Web Search**: SerpAPI integration
- **Scraping**: Cheerio for HTML parsing
- **Streaming**: Server-Sent Events for real-time updates
- **Error Handling**: Comprehensive error management with fallbacks

### Frontend

- **Framework**: React with TypeScript
- **Styling**: CSS modules with responsive design
- **Features**:
  - Real-time research progress streaming
  - Interactive markdown rendering
  - Follow-up question interface
  - Advanced options for relevance and formatting
  - Session management and conversation threading

## API Endpoints

### POST `/api/research`

Performs comprehensive research on a given query with optional streaming and advanced features.

**Request Body**:
```json
{
  "query": "Your research question here",
  "relevanceThreshold": 70,
  "enableFormatting": true
}
```

**Query Parameters**:
- `stream=true`: Enable real-time streaming updates

### POST `/api/research/followup`

Processes follow-up questions with context from previous research.

**Request Body**:
```json
{
  "question": "Follow-up question here",
  "sessionId": "session_identifier"
}
```

## Configuration Options

### Environment Variables

- `OPENAI_API_KEY`: Required for GPT-4 analysis and synthesis
- `ANTHROPIC_API_KEY`: Required for Claude-3 information processing  
- `SERPAPI_KEY`: Required for web search functionality

### Advanced Options

- **Relevance Threshold**: Adjust filtering sensitivity (0-100)
- **Enhanced Formatting**: Enable structured output with tables and bullets
- **Streaming**: Real-time progress updates during research
- **Follow-up Context**: Maintain conversation history for deeper exploration

## Memory Bank System

This project includes a comprehensive Memory Bank system for maintaining project context:

- **Product Context**: High-level project overview and goals
- **Active Context**: Current focus and recent changes
- **Decision Log**: Architectural and implementation decisions
- **System Patterns**: Recurring patterns and standards
- **Progress Tracking**: Task completion and development milestones

## Development

### Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── research/
│   │       ├── route.ts           # Main research API
│   │       └── followup/route.ts  # Follow-up questions API
│   ├── page.tsx                   # Frontend interface
│   ├── layout.tsx                 # App layout
│   └── globals.css               # Global styles
├── components/
│   ├── markdown/                  # Enhanced markdown components
│   └── utils/                     # Utility functions
├── lib/
│   └── sessionStorage.ts         # Session management
└── memory-bank/                   # Project context files
```

### Adding New Features

1. **New Data Sources**: Add integrations in the `gatherInformation` function
2. **Different AI Models**: Modify model configurations in API route
3. **Enhanced UI**: Update the React components in `page.tsx`
4. **Additional Analysis**: Extend the synthesis logic

## Troubleshooting

### Common Issues

1. **API Key Errors**: Ensure all API keys are correctly set in `.env.local`
2. **Rate Limits**: SerpAPI free tier has 100 searches/month limit
3. **Scraping Failures**: Some websites block scraping - this is handled gracefully
4. **Slow Responses**: Research can take 30-60 seconds due to multiple API calls

### Error Handling

The application includes comprehensive error handling:
- Graceful degradation when web search fails
- Fallback to AI knowledge when scraping fails
- Clear error messages for API issues
- Timeout protection for slow websites

## License

This project is open source and available under the MIT License.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review API documentation for OpenAI, Anthropic, and SerpAPI
3. Open an issue on the project repository
