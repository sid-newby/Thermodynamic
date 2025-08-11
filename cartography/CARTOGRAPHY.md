# Thermodynamic Cartography — 2025-08-10

This document maps the current codebase structure, components, dependencies, data flow, and integrations. It also records neutral modularization observations relevant to reliability/performance.

## Executive Summary

- Stack: React 19 + TypeScript, Vite 7, Framer Motion, React Markdown (GFM), Prism highlighter, Mermaid, WebContainers, Deepgram.
- Architecture: Single-page React app. Frontend streams assistant responses, renders Markdown with runnable fenced code blocks. Runnable code is executed via a singleton WebContainer server surfaced in drawers.
- Key entry points:
  - [index.html](index.html)
  - [src/main.tsx](src/main.tsx:1)
  - [src/App.tsx](src/App.tsx)
- Cross-origin isolation: Vite dev/preview servers set COOP/COEP headers to enable WebContainers ([vite.config.ts](vite.config.ts:8-11), [vite.config.ts](vite.config.ts:21-24)).

## Component Inventory

- Application shell
  - [src/App.tsx](src/App.tsx) — 543 LOC
    - Root React component: [export default function App()](src/App.tsx:19)
    - Responsibilities:
      - Markdown streaming and rendering ([onSend()](src/App.tsx:168), helpers in [src/utils/markdownStream.ts](src/utils/markdownStream.ts))
      - Runnable code detection ([scanLatestRunnableCode()](src/utils/runnableCode.ts))
      - Meraki console ticker (log capture)
      - Microphone capture and Deepgram websocket ([useMicStreaming()](src/hooks/useMicStreaming.ts))
      - Settings drawer (system prompt, Mermaid theme saving)
      - Drawer orchestration for Mermaid and code run
    - External IO:
      - HTTP: /api/system-prompt, /api/mermaid-theme, /api/message, /api/deepgram-token
      - WS: wss://api.deepgram.com/v1/listen (dynamic query) via [useMicStreaming()](src/hooks/useMicStreaming.ts)
- Drawers
  - [src/components/MermaidDrawer.tsx](src/components/MermaidDrawer.tsx) — 291 LOC
    - Live Mermaid rendering inside an iframe using srcDoc.
    - Build helpers: [buildAnySrcDoc()](src/components/MermaidDrawer.tsx:64), [buildMermaidSrcDoc()](src/components/MermaidDrawer.tsx:70), [buildRadarSrcDoc()](src/components/MermaidDrawer.tsx:150).
  - [src/components/CodeRunDrawer.tsx](src/components/CodeRunDrawer.tsx) — 117 LOC
    - Attaches to existing WC server URL via [getServerUrl()](src/wc.ts:68); shows /run preview in an iframe.
    - Component: [export function CodeRunDrawer](src/components/CodeRunDrawer.tsx:18)
  - [src/components/ChartsDrawer.tsx](src/components/ChartsDrawer.tsx) — 4 LOC
    - Stub delegating to MermaidDrawer (maintains compatibility).
- WebContainers manager (singleton)
  - [src/wc.ts](src/wc.ts) — 406 LOC
    - Boot and server lifecycle: [bootWC()](src/wc.ts:18), [getServerUrl()](src/wc.ts:68)
    - Code writers: [writeMermaidCode()](src/wc.ts:72), [writeRunSnippet()](src/wc.ts:85)
    - Language routing: [writeFilesForLanguage()](src/wc.ts:97)
    - Server templates: [UNIFIED_SERVER_JS](src/wc.ts:170), [MERMAID_MAIN_JS](src/wc.ts:258), [INDEX_HTML_JS](src/wc.ts:321), [INDEX_HTML_PY](src/wc.ts:351)
- App bootstrap
  - [src/main.tsx](src/main.tsx:1) — 7 LOC
  - [index.html](index.html:1) — static root
- Styling
  - [src/App.css](src/App.css)
  - [src/index.css](src/index.css)
  - [src/markdown-theme.css](src/markdown-theme.css)
- Public assets
  - [public/](public)

## Dependency Map

- Internal dependencies (textual):
  - [src/App.tsx](src/App.tsx) imports [src/components/MermaidDrawer.tsx](src/components/MermaidDrawer.tsx), [src/components/CodeRunDrawer.tsx](src/components/CodeRunDrawer.tsx), and [src/wc.ts](src/wc.ts) ([writeRunSnippet()](src/wc.ts:85)).
  - [src/components/CodeRunDrawer.tsx](src/components/CodeRunDrawer.tsx) imports [getServerUrl()](src/wc.ts:68).
  - [src/components/ChartsDrawer.tsx](src/components/ChartsDrawer.tsx) re-exports [MermaidDrawer](src/components/MermaidDrawer.tsx).
- External libraries (key):
  - React, Framer Motion, React Markdown + remark-gfm, react-syntax-highlighter + prism theme, lucide-react.
  - Mermaid (CDN within drawers and WC environment).
  - WebContainers API.
  - Deepgram integration: server exposes token endpoint, client uses raw WebSocket connection.

Mermaid diagram of core relationships:

```mermaid
flowchart TD
  App[src/App.tsx] --> MermaidDrawer[src/components/MermaidDrawer.tsx]
  App --> CodeRunDrawer[src/components/CodeRunDrawer.tsx]
  App --> WC[src/wc.ts]
  CodeRunDrawer --> WC
  MermaidDrawer -. (iframe srcDoc) .-> MermaidCDN[Mermaid@CDN]
  WC -->|/charts, /run|& IframePreviews[Previews in iframes]
  App -->|/api/message, /api/system-prompt, /api/mermaid-theme| LocalAPI[Local API on :3000]
  App -->|Deepgram WS|& Deepgram[wss://api.deepgram.com]
```

## Data Flow Documentation

- Message streaming
  - Trigger: [onSend()](src/App.tsx) POSTs to /api/message with recent history.
  - Streaming: Reads SSE-like chunks, buffers, schedules UI flush.
  - Finalization: Ensures balanced fences via [markdownStream](src/utils/markdownStream.ts).
  - History append: On done, assistant text added to history.
- Runnable code detection
  - Detection: [scanLatestRunnableCode()](src/utils/runnableCode.ts) scans last closed fenced block.
  - Reaction: If "mermaid", open Mermaid drawer; else write snippet to WC and open Run drawer.
- WebContainers
  - Boot: [bootWC()](src/wc.ts:18) on app mount.
  - Server-ready event sets serverUrl; WC serves /charts and /run ([UNIFIED_SERVER_JS](src/wc.ts:170)).
  - Writers: [writeRunSnippet()](src/wc.ts:85) routes by language to appropriate files ([writeFilesForLanguage()](src/wc.ts:97)).
- Mermaid rendering
  - In-drawer srcDoc builds page with Mermaid CDN, attempts normalization and render with retries ([buildMermaidSrcDoc()](src/components/MermaidDrawer.tsx:70)).
  - Radar-beta custom mode renders via ECharts ([buildRadarSrcDoc()](src/components/MermaidDrawer.tsx:150)).
- Microphone and ASR
  - Microphone lifecycle: [useMicStreaming()](src/hooks/useMicStreaming.ts)
  - getUserMedia and Deepgram WS handled inside the hook; hotword "send it" triggers `onSend()` via callback.
  - Token retrieval: GET /api/deepgram-token provides temporary key for browser WebSocket connection.

Storage and persistence:
- localStorage: "systemPrompt" cached/updated
- Mermaid theme variables and CSS saved server-side via PUT

## Integration Documentation

- Backend endpoints (proxied to :3000)
  - GET/PUT /api/system-prompt — load/save system prompt
  - GET/PUT /api/mermaid-theme — load/save Mermaid theme
  - POST /api/message — stream assistant response
  - GET /api/deepgram-token — obtain token for live WS
- Dev server headers for COOP/COEP (WebContainers):
  - [vite.config.ts](vite.config.ts:8-11), [vite.config.ts](vite.config.ts:21-24)
- Build and run
  - Scripts: [package.json](package.json:6-14)
    - "dev": runs API (bun) + Vite with port cleanup
    - "build": tsc build + vite build
    - "preview": vite preview
- Environment
  - Optional: VITE_WEB_CONTAINERS_CLIENT_ID used by [bootWC()](src/wc.ts:32-36)


# IMMEDIATE CONCERNS: 
## Modularization Observations (reliability/performance-focused)

- App component size and scope
  - [src/App.tsx](src/App.tsx) reduced to ~543 LOC after extracting mic lifecycle, markdown streaming helpers, and runnable code detection into dedicated modules.
  - Distinct clusters:
    - Streaming and Markdown accumulation: [onSend()](src/App.tsx), helpers in [src/utils/markdownStream.ts](src/utils/markdownStream.ts)
    - Mic and Deepgram transport: [useMicStreaming](src/hooks/useMicStreaming.ts)
    - Runnable code scan: [scanLatestRunnableCode()](src/utils/runnableCode.ts) and the effect wiring ([src/App.tsx](src/App.tsx))
    - Markdown renderer components and code-run controls: [mdComponents.code](src/App.tsx:477-531) and footer button handlers ([src/App.tsx](src/App.tsx:507-526))
    - Settings drawer UI and save handlers: ([src/App.tsx](src/App.tsx:599-675)), [saveSystemPrompt()](src/App.tsx:132-146), [saveMermaidTheme()](src/App.tsx:148-159)
  - Neutral observation for reliability:
    - Mic/WS lifecycle has been extracted into [useMicStreaming()](src/hooks/useMicStreaming.ts), reducing event listener complexity in the main component and lowering the risk of leaks affecting UI responsiveness.
    - Markdown stream utilities have been extracted to [src/utils/markdownStream.ts](src/utils/markdownStream.ts), making streaming state updates more predictable and testable.
    - Runnable code detection has been extracted to [scanLatestRunnableCode()](src/utils/runnableCode.ts), reducing coupling between message state and action triggers.
- WebContainers lifecycle
  - [bootWC()](src/wc.ts:18) centralizes WC boot with a cached bootPromise and COEP 'credentialless'. Neutral observation: maintaining WC boot and server readiness in an isolated module (already done in [src/wc.ts](src/wc.ts)) supports predictable performance and avoids duplicate boots when drawers open concurrently.
- claude.ts uses `any` :(! and broad types, triggering @typescript-eslint/no-explicit-any.
- MermaidDrawer.tsx has no-useless-escape warnings in regex replacements.
- 

## Quick Reference

- Common tasks
  - Add runnable JS/HTML/Python snippet: Post a Markdown reply containing a fenced block (```js / ```html / ```python). App will detect and open the appropriate drawer automatically via [scanLatestRunnableCode()](src/utils/runnableCode.ts).
  - Render Mermaid: Use ```mermaid fenced block. Mermaid drawer opens with live preview ([src/components/MermaidDrawer.tsx](src/components/MermaidDrawer.tsx)).
  - Update system prompt: Use Settings drawer; changes persist via PUT.
  - Customize Mermaid theme: Settings drawer JSON/CSS, then Save Theme.
  - Voice input: Toggle microphone for speech-to-text with hotword "send it" via [useMicStreaming()](src/hooks/useMicStreaming.ts).
- Key files
  - App shell: [src/App.tsx](src/App.tsx)
  - WC manager: [src/wc.ts](src/wc.ts)
  - Drawers: [src/components/MermaidDrawer.tsx](src/components/MermaidDrawer.tsx), [src/components/CodeRunDrawer.tsx](src/components/CodeRunDrawer.tsx)
  - Entry: [src/main.tsx](src/main.tsx:1), [index.html](index.html:1)
  - Dev config: [vite.config.ts](vite.config.ts:1)
  - Scripts/deps: [package.json](package.json:1)
- Naming and patterns
  - React components in PascalCase; helper functions in lowerCamelCase.
  - Drawers use Framer Motion’s AnimatePresence for slide-in panels.
  - Markdown renderers map tags to CSS classes prefixed md-* ([mdComponents](src/App.tsx:467-536)).
- Development setup
  - dev: `yarn dev` or `bun run dev` per [package.json](package.json:6-14) (requires bun for API script).
  - build: `yarn build` then `yarn preview` or `bun run build` / `bun run preview`.
  - Ensure crossOriginIsolated in browser for WebContainers (Vite headers already set) ([vite.config.ts](vite.config.ts:8-11)).
