# Thermodynamic
![thermodynamic](public/thermodynamic.gif)

## Features v Progress
 [x] Web search
 [x] 10 step context history 
 [x] Supabase for state
 [x] Web Containers
 [x] Remark GFM
 [x] React Markdown and Styling 
 [x] System Prompt Management in the UI 
 [x] Tavily web search 
 [x] Deepgram for TTS 
 [x] MCP Server
 [x] Bun API 
 [x] React Syntax Highlighting
 [x] Independent State for Web Containers - Fuck UseState / UseEffect for real. 
 [ ] Embedding with OpenAI and Supabase (text-embeddings-small @ 768dim)
 [ ] Multi-agent editors (Langgraph / Inspired by GPTResearcher)
 [ ] STT (Cartesia / Websockets)
 [x] Hot word STT when mic is toggled on 'Send it' ->
 [ ] Tons of tuneup 
 [ ] Add more controls to UI Admin (Themes, Voice, MCP Loading)


**Advanced Agentic Research Agent with WebContainer Integration**

Thermodynamic is a sophisticated AI-powered research agent featuring a React-based chat interface that communicates with Claude via Anthropic's API. The system supports streaming responses, tool usage, MCP server integration, real-time console logging, WebContainer-based code execution, and automatic Mermaid diagram rendering.

## Features

### 🤖 AI Integration
- **Claude Sonnet 4** integration with streaming responses
- **MCP (Model Context Protocol)** server support for extensible tool integration
- **Custom tools** for stock prices, weather, time, and web search with Tavily or through using the native Anthropic Web Search Beta. 
- **Persistent system prompts** with Supabase integration
- **1-hour prompt caching** for improved performance

### 🖥️ WebContainer Execution
- **Live code execution** for JavaScript, HTML, and Python (via Pyodide)
- **Mermaid diagram rendering** with automatic detection and live updates
- **Sandboxed environments** with cross-origin isolation
- **Real-time preview** with console output capture

### 🎨 User Interface
- **Dark theme** with responsive design
- **Streaming markdown** with syntax highlighting
- **Auto-resizing input** with keyboard shortcuts
- **Real-time console ticker** with log level differentiation
- **Drawer-based panels** for charts and code execution

### 🔧 Developer Experience
- **TypeScript** throughout with strict type checking
- **Vite** for fast development and building
- **Bun** runtime for backend API server
- **Concurrent development** with automatic proxy configuration
- **ESLint** for code quality

## Quick Start

### Prerequisites
- **Bun** runtime installed
- **Anthropic API key** for Claude integration
- Modern browser with SharedArrayBuffer support

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd thermodynamic

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys
```

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=your_anthropic_api_key

# Optional - System Prompt Persistence
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE=your_supabase_service_role_key

# Optional - Enhanced Search
TAVILY_API_KEY=your_tavily_api_key

# Optional - Custom MCP Server
MCP_SERVER_URL=your_mcp_server_url
MCP_AUTH_TOKEN=your_mcp_auth_token

# Optional - WebContainers
VITE_WEB_CONTAINERS_CLIENT_ID=your_webcontainers_client_id
```

### Development

```bash
# Start both frontend and backend servers
bun run dev

# Or run separately
bun run web    # Frontend only
bun run api    # Backend only
```

### Production

```bash
# Build for production
bun run build

# Preview production build
bun run preview
```

## Architecture

### Frontend (`src/`)
- **App.tsx** - Main application component with chat interface
- **components/ChartsDrawer.tsx** - WebContainer-based Mermaid rendering
- **components/CodeRunDrawer.tsx** - Multi-language code execution
- **App.css** - Application styling with dark theme
- **markdown-theme.css** - Custom markdown rendering styles

### Backend
- **claude.ts** - Bun-based API server with Claude integration
- Streaming responses via Server-Sent Events
- System prompt persistence via Supabase
- MCP server integration for extensible tools

### Key Technologies
- **React 19.1.1** with TypeScript
- **Vite 7.1.0** with SWC for fast builds
- **Bun** for backend runtime
- **WebContainer API** for browser-based code execution
- **Anthropic Claude API** for AI capabilities
- **Supabase** for data persistence
- **Framer Motion** for animations

## Usage

### Basic Chat
1. Start the development server with `bun run dev`
2. Open your browser to the displayed URL
3. Enter your message and press Enter or click Send
4. Watch as Claude responds with streaming text

### Code Execution
1. Ask Claude to generate code in JavaScript, HTML, or Python
2. Click the "Run ▶" button that appears on code blocks
3. View live execution results in the Code Runner drawer
4. Console output appears in real-time within the preview

### Mermaid Diagrams
1. Ask Claude to create a Mermaid diagram
2. The Charts drawer automatically opens when diagrams are detected
3. View live-rendered diagrams with automatic updates
4. Diagrams update in real-time as the conversation continues

### System Prompts
1. Click the settings (⚙️) button in the header
2. Edit the system prompt in the drawer
3. Changes are automatically saved and persisted
4. System prompts are cached for 1 hour for performance

## API Endpoints

### `POST /api/message`
Send a message to Claude and receive streaming responses.

**Request:**
```json
{
  "text": "Your message here"
}
```

**Response:** Server-Sent Events stream with:
- `text` events for streaming content
- `tool` events for tool usage notifications
- `done` event when response is complete

### `GET /api/system-prompt`
Retrieve the current system prompt.

**Response:**
```json
{
  "prompt": "Current system prompt text"
}
```

### `PUT /api/system-prompt`
Update the system prompt.

**Request:**
```json
{
  "prompt": "New system prompt text"
}
```

## WebContainer Integration

Thermodynamic uses WebContainers to provide secure, browser-based code execution environments. This requires:

1. **Cross-Origin Isolation** - Automatically configured via Vite headers
2. **SharedArrayBuffer Support** - Modern browser requirement
3. **HTTPS in Production** - Required for cross-origin isolation

The system automatically handles WebContainer lifecycle management, including:
- Environment initialization and caching
- File synchronization for code changes
- Server management for live previews
- Error handling and recovery

## MCP Server Integration

The system supports Model Context Protocol (MCP) servers for extensible tool integration:

1. **Built-in Tools** - Stock prices, weather, time, web search
2. **Tavily Integration** - Enhanced web search via MCP
3. **Custom Servers** - Configure via environment variables
4. **Authentication** - OAuth bearer token support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `bun run lint` to check code quality
5. Submit a pull request

## License

[Add your license information here]

## Support

For issues and questions:
1. Check the [cartography documentation](./cartography/thermodynamic-codebase-map.md) for detailed technical information
2. Review the codebase structure and component responsibilities
3. Open an issue with detailed reproduction steps

---

**Built with ❤️ using React, TypeScript, Bun, and Claude**