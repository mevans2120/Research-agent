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
6. **Synthesis**: GPT-4 combines all findings into a comprehensive answer

### Example Research Flow

**Input**: "What are the latest developments in renewable energy?"

**Sub-questions Generated**:
- What are the most recent technological breakthroughs in solar energy?
- What new wind energy projects have been announced in 2024?
- What government policies regarding renewable energy have changed recently?
- What are the current market trends and investment patterns in renewable energy?

**For Each Sub-question**:
1. Search Google for current results
2. Scrape content from top 3 relevant websites
3. Analyze findings with Claude-3
4. Compile sources and insights

**Final Output**: Comprehensive synthesis with source attribution

## Technical Architecture

### Backend (`/api/research`)

- **Framework**: Next.js API Routes
- **AI Models**: 
  - OpenAI GPT-4 (analysis & synthesis)
  - Anthropic Claude-3 Sonnet (information processing)
- **Web Search**: SerpAPI integration
- **Scraping**: Cheerio for HTML parsing
- **Error Handling**: Comprehensive error management with fallbacks

### Frontend

- **Framework**: React with TypeScript
- **Styling**: Inline styles with responsive design
- **Features**:
  - Real-time research progress
  - Structured results display
  - Source attribution and linking
  - Error handling and user feedback

## API Endpoints

### POST `/api/research`

Performs comprehensive research on a given query.

**Request Body**:
```json
{
  "query": "Your research question here"
}
```

**Response**:
```json
{
  "analysis": {
    "originalQuery": "string",
    "subQuestions": ["string"],
    "analysisMethod": "string"
  },
  "findings": [
    {
      "question": "string",
      "answer": "string", 
      "sources": [{"title": "string", "url": "string"}],
      "scrapedSources": "number",
      "method": "string"
    }
  ],
  "synthesis": {
    "summary": "string",
    "methodology": "string",
    "confidence": "string",
    "totalSources": "number",
    "totalScrapedSources": "number"
  },
  "timestamp": "string"
}
```

## Configuration Options

### Environment Variables

- `OPENAI_API_KEY`: Required for GPT-4 analysis and synthesis
- `ANTHROPIC_API_KEY`: Required for Claude-3 information processing  
- `SERPAPI_KEY`: Required for web search functionality

### Customization

You can modify the research behavior by editing `/src/app/api/research/route.ts`:

- **Search Results**: Change the number of search results per query (default: 5)
- **Scraping Depth**: Modify how many URLs to scrape per search (default: 3)
- **Content Length**: Adjust scraped content limits (default: 3000 characters)
- **AI Models**: Switch between different OpenAI or Anthropic models
- **Temperature Settings**: Adjust AI creativity vs. accuracy

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

## Development

### Project Structure

```
src/
├── app/
│   ├── api/research/route.ts    # Main research API
│   ├── page.tsx                 # Frontend interface
│   ├── layout.tsx              # App layout
│   └── globals.css             # Global styles
└── ...
```

### Adding New Features

1. **New Data Sources**: Add integrations in the `gatherInformation` function
2. **Different AI Models**: Modify model configurations in API route
3. **Enhanced UI**: Update the React components in `page.tsx`
4. **Additional Analysis**: Extend the synthesis logic

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
