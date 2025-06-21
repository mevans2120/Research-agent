# System Patterns *Optional*

This file documents recurring patterns and standards used in the project.
It is optional, but recommended to be updated as the project evolves.
2025-06-20 13:52:53 - Initial system patterns documentation established.

## Coding Patterns

* TypeScript throughout the application for type safety
* Next.js App Router structure with API routes
* React components for frontend interface
* Environment-based configuration management

## Architectural Patterns

* API-first design with dedicated research endpoints
* Separation of concerns between frontend and backend logic
* Research workflow: sub-question generation → individual research → synthesis
* Real-time processing with detailed logging for transparency

## Testing Patterns

* Development server setup for local testing
* API endpoint testing through direct calls
* Research functionality validation through insurance domain examples
[2025-06-20 14:07:40] - Follow-up Question Feature System Patterns

## Architectural Patterns
- **Context-Aware API Design**: Follow-up endpoints that intelligently reference original research context
- **Session-Based State Management**: Browser session storage for maintaining research conversation threads
- **Selective Context Inclusion**: Token-optimized approach to including relevant research context in AI prompts
- **Conversation Threading**: UI pattern for displaying research conversations with clear question-answer flow

## Coding Patterns
- **Context Serialization**: Structured storage of research results for follow-up reference
- **Prompt Engineering**: Context-enhanced prompts that reference specific findings and sources
- **Stream Processing**: Extending existing SSE pattern for follow-up question real-time activities
- **Component State Management**: React patterns for managing conversation history and context

## Testing Patterns
- **Context Preservation Testing**: Verify research context maintains integrity across follow-up questions
- **Conversation Flow Testing**: Validate proper threading and response attribution
- **Token Usage Optimization**: Test context selection algorithms for efficient AI API usage
[2025-06-20 14:34:39] - Pertinent Results Filtering and Enhanced Formatting System Patterns

## Architectural Patterns
- **Relevance-First Design**: Filter research findings by pertinence before synthesis to improve quality and reduce noise
- **Adaptive Formatting**: Automatically select optimal output format (tables, bullets, mixed) based on content type and structure
- **Threshold-Based Filtering**: Configurable relevance scoring (0-100) with intelligent threshold management
- **Structured Response Architecture**: Enhanced API responses with separate sections for relevant/filtered results and formatting metadata

## Coding Patterns
- **Relevance Scoring Pipeline**: Batch processing of findings through Claude-based relevance analysis
- **Format Detection Logic**: Content analysis to determine optimal presentation format (comparison tables, bullet lists, narrative)
- **Token Optimization**: Pre-filtering irrelevant content to reduce synthesis API costs and improve response speed
- **Graceful Degradation**: Fallback mechanisms when relevance analysis or formatting fails

## Testing Patterns
- **Relevance Accuracy Validation**: A/B testing of filtered vs. unfiltered results for user satisfaction
- **Format Quality Assessment**: Cross-validation of table structure and bullet point organization
- **Performance Benchmarking**: Token usage and processing time comparison with and without filtering
- **User Experience Testing**: Format preference tracking and readability metrics across different query types
[2025-06-20 14:50:44] - Enhanced Markdown Display Feature System Patterns

## Architectural Patterns
- **Layered Markdown Processing**: Multi-stage pipeline from raw content → structured analysis → markdown generation → enhanced rendering
- **Content-Aware Formatting**: Automatic format detection and optimization based on research content type and complexity
- **Progressive Enhancement**: Base markdown functionality with optional interactive features that gracefully degrade
- **Modular Rendering System**: Pluggable markdown components for different content types (tables, citations, code blocks, timelines)

## Coding Patterns
- **Markdown Component Architecture**: Reusable React components for each markdown element type with consistent styling and behavior
- **Custom Markdown Extensions**: Plugin-based system for research-specific syntax (citations, relevance scores, source attribution)
- **Streaming Markdown Generation**: Real-time markdown content creation with progressive rendering as research progresses
- **Responsive Markdown Layout**: CSS Grid and Flexbox patterns for optimal display across device sizes and orientations

## Testing Patterns
- **Markdown Rendering Validation**: Automated testing of markdown-to-HTML conversion accuracy and visual regression testing
- **Content Structure Testing**: Validation of automatic section detection, heading hierarchy, and cross-reference generation
- **Performance Benchmarking**: Rendering speed testing for large markdown documents and memory usage optimization
- **Accessibility Compliance**: Screen reader compatibility testing and keyboard navigation validation for interactive markdown elements