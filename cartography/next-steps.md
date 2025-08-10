# Next Steps — Thermodynamic Modularization

Scope: Execute the approved plan in [plan.md](cartography/plan.md), refactoring only the specified targets to reduce bloat in [App.tsx](src/App.tsx:19) without changing behavior.

## Checklist

- [x] Step 1 — Extract Mic/ASR lifecycle into a hook
  - Added: [useMicStreaming.ts](src/hooks/useMicStreaming.ts:1)
  - Updated: [App.tsx](src/App.tsx:9) to import the hook and wire it near initialization ([App.tsx](src/App.tsx:45))
  - Removed inlined mic lifecycle and helpers from [App.tsx](src/App.tsx):
    - toggleMic() ([App.tsx](src/App.tsx:300-415))
    - stopMic() ([App.tsx](src/App.tsx:417-431))
    - chooseOpusMime() ([App.tsx](src/App.tsx:450-465))
    - hasSendHotword(), suppressCommandPhrases(), suppressDanglingSendAtEnd() ([App.tsx](src/App.tsx:433-448))
  - Kept UI behavior identical (mic button uses hook’s micOn/toggleMic; recording class still responds to micOn)

- [-] Step 2 — Extract Markdown streaming helpers into a utils module
  - Created: [markdownStream.ts](src/utils/markdownStream.ts)
  - Moved unchanged functions from [App.tsx](src/App.tsx):
    - stabilizeMarkdownForStreaming() ([App.tsx](src/App.tsx:684-697))
    - hardCloseDanglingFences() ([App.tsx](src/App.tsx:700-713))
    - stripTrailingFence() ([App.tsx](src/App.tsx:715-719))
  - Updated imports/usage where referenced (e.g., [onSend()](src/App.tsx:168-281))

- [x] Step 3 — Extract runnable code detection into a pure util
  - Created: [runnableCode.ts](src/utils/runnableCode.ts)
  - Moved unchanged: scanLatestRunnableCode() from [App.tsx](src/App.tsx:725-757)
  - Updated the effect that reacts to detected code ([App.tsx](src/App.tsx:62-82)) to import and use the util

- [x] QA — Manual verification (no behavior changes)
  - Message streaming and fence stabilization behave as before
  - Closed fenced blocks (```mermaid, ```js, ```html, ```python) still auto-open the correct drawer
  - Mic toggle and “send it” hotword path still function as expected
  - System Prompt and Mermaid Theme flows unaffected

- [x] Documentation/logs
  - Updated `README.md` and `cartography/CARTOGRAPHY.md` to reflect new modules and LOC.

## Notes
- No changes to [wc.ts](src/wc.ts), [MermaidDrawer.tsx](src/components/MermaidDrawer.tsx), or [CodeRunDrawer.tsx](src/components/CodeRunDrawer.tsx) are in scope.
- No API or visual/UX changes in this pass.