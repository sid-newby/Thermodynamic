# Thermodynamic — Modularization Plan (Pending Approval)

Source basis: Extracted from Modularization Observations in [CARTOGRAPHY.md](cartography/CARTOGRAPHY.md) — see “App component size and scope”.

Scope: Non-functional refactor to reduce bloat in [export default function App()](src/App.tsx:19) by extracting three isolated concerns into dedicated modules, preserving current behavior and UI.

Constraints:
- No API contract changes
- No visual or UX changes
- Keep drawer orchestration and WebContainer flows unchanged
- Keep all network calls and endpoints identical

## Pre-Development Checklist (Step 2a gate)
- [x] Understanding confirmed by user
- [x] This plan (with checkboxes) approved by user
- [x] Requirements clear and specific enough to begin

## Planned Refactor Targets

1) Extract Mic/ASR lifecycle into a hook
- Target code (current):
  - [toggleMic()](src/App.tsx:300)
  - [stopMic()](src/App.tsx:417)
  - [chooseOpusMime()](src/App.tsx:450)
- Plan:
  - [x] Create file: src/hooks/useMicStreaming.ts
  - [x] Implement exported hook: `useMicStreaming(options)` returning:
    - micOn: boolean
    - toggleMic(): Promise<void>
    - stopMic(): void
  - [x] Options shall provide:
    - getDeepgramKey(): Promise<string> (invokes GET /api/deepgram-token)
    - onDisplayChange(value: string): void (propagates live transcript into input)
    - onSendHotword(cleaned: string): void (invokes [onSend()](src/App.tsx:168) path in App)
  - [x] Internals: move MediaRecorder/WebSocket management and MIME selection logic from App into the hook (logic preserved, no changes to WS params)
  - [x] In [export default function App()](src/App.tsx:19), replace local functions with hook usage and state wiring only (prop drilling into hook callbacks)
  - [x] Ensure cleanup parity with current ESC/close flows

2) Extract Markdown streaming helpers into a utils module
- Target code (current):
  - [stabilizeMarkdownForStreaming()](src/App.tsx:684)
  - [hardCloseDanglingFences()](src/App.tsx:700)
  - [stripTrailingFence()](src/App.tsx:715)
- Plan:
  - [x] Create file: src/utils/markdownStream.ts
  - [x] Export the three functions unchanged
  - [x] Update [onSend()](src/App.tsx:168) and streaming flush code to import from utils
  - [ ] Verify fenced block behavior by manual dev run (no test framework present)

3) Extract runnable code detection into a pure util
- Target code (current):
  - [scanLatestRunnableCode()](src/App.tsx:725)
- Plan:
  - [x] Create file: src/utils/runnableCode.ts
  - [x] Export `scanLatestRunnableCode()` unchanged
  - [x] Update effect in [export default function App()](src/App.tsx:62) to import and use it
  - [ ] Confirm drawers still auto-open on latest closed fenced block

## File-by-File Actions (execution guardrails)

- [x] Add: src/hooks/useMicStreaming.ts (new)
- [ ] Add: src/utils/markdownStream.ts (new)
- [ ] Add: src/utils/runnableCode.ts (new)
- [x] Edit only in [src/App.tsx](src/App.tsx) to:
  - [x] Remove inlined functions listed above
  - [x] Import and wire the new modules/hook
  - [x] Keep all other logic intact; do not touch unrelated code
- [x] No changes to [src/wc.ts](src/wc.ts), [src/components/MermaidDrawer.tsx](src/components/MermaidDrawer.tsx), [src/components/CodeRunDrawer.tsx](src/components/CodeRunDrawer.tsx)

## Non-Goals (explicitly out of scope for this pass)
- Any styling or CSS changes
- Any changes to WebContainers server lifecycle or routes
- Any changes to API contracts or headers
- Any README edits (unless requested after refactor)
- Any rename of public exports consumed by other parts of the app

## Validation Plan
- [ ] Dev run (bun run dev) & manual verification:
  - [ ] Send/stream messages to validate markdown accumulation intact
  - [ ] Generate fenced blocks (```mermaid, ```js, ```html, ```python) to validate drawer triggers
  - [ ] Toggle microphone and say “send it” to validate hotword flow remains intact
  - [ ] Settings drawer still loads/saves system prompt and Mermaid theme
- [ ] Quick smoke re-check of console ticker output

## Rollback Plan
- If regressions detected, revert to inlined functions in [src/App.tsx](src/App.tsx) from prior state. No migrations required.

## Next Steps (post-approval sequencing)
- After user approves:
  1. Start memory MCP server
  2. Implement Step 1 (useMicStreaming)
  3. Implement Step 2 (markdownStream utils)
  4. Implement Step 3 (runnableCode util)
  5. Create/update [cartography/next-steps.md](cartography/next-steps.md) to mark completions and remaining tasks
  6. Document changes in `cartography/development/development.md`
