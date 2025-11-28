<!-- ccf17bca-9a69-4d9c-baa2-66ca1cd2f70b 57fa2061-2a05-472e-aca8-34a86d11014f -->
# Unified Proofreading Architecture with OnlyOffice Automation API

## Summary

Create a unified proofreading issue format that supports multiple agents (spelling, grammar, legal checks) and integrate with OnlyOffice's Automation API to highlight and fix errors directly in the document. Use SSE streaming for progressive issue display.

**Important:** OnlyOffice Automation API requires the Developer edition. Check your license supports `createConnector()`.

## Unified Issue Format

```typescript
interface ProofreadingIssue {
  id: string                    // unique identifier
  type: "replacement" | "comment" | "highlight"
  category: "spelling" | "grammar" | "legal" | "formatting"
  severity: "error" | "warning" | "suggestion"
  find: string                  // exact text to find
  replace?: string              // replacement (if type=replacement)
  paragraph_hint?: number       // narrow search scope
  explanation: string           // human-readable explanation
}
```

## Changes Required

### 1. Fix Loading State Bug (Quick Fix)

[frontend/src/App.tsx](frontend/src/App.tsx) - The `onRefresh` sets `isLoading=true` but never resets it.

### 2. Backend: SSE Streaming Proofreading Endpoint

[backend/app/services/spellcheck.py](backend/app/services/spellcheck.py) - Rename to `proofreading.py`:

- Use Gemini's streaming API (`generate_content(stream=True)`)
- Parse issues incrementally as JSON objects are completed
- Yield each issue for SSE streaming

[backend/app/routers/spellcheck.py](backend/app/routers/spellcheck.py) - Rename to `proofreading.py`:

- New endpoint: `GET /api/proofread/{doc_id}`
- Return `StreamingResponse` with `text/event-stream` content type
- SSE format: `data: {"id": "1", "type": "replacement", ...}\n\n`

### 3. Frontend: SSE Client + Types

[frontend/src/api/spellcheck.ts](frontend/src/api/spellcheck.ts) - Rename to `proofreading.ts`:

- Update types to match new `ProofreadingIssue` format
- Use `EventSource` API to consume SSE stream
- Callback-based API: `streamProofread(docId, onIssue, onComplete)`

### 4. OnlyOffice Automation Integration

[frontend/public/editor.html](frontend/public/editor.html) - After editor ready:

- Create connector: `const connector = docEditor.createConnector()`
- Listen for `APPLY_ISSUE` messages from parent
- Execute `SearchAndReplace`, `AddComment` methods

[frontend/src/components/DocumentEditor.tsx](frontend/src/components/DocumentEditor.tsx):

- `applyReplacement(issue)` - send replacement command via postMessage
- `highlightIssue(issue)` - send highlight command

### 5. Frontend: Updated Proofreading Panel

[frontend/src/components/SpellcheckPanel.tsx](frontend/src/components/SpellcheckPanel.tsx) - Rename to `ProofreadingPanel.tsx`:

- Issues appear progressively as SSE events arrive
- "Apply Fix" button triggers editor command
- Group by category, color by severity

## Architecture Flow

```
┌─────────────┐  SSE  ┌──────────────┐ postMessage ┌─────────────┐
│   Backend   │──────>│   Frontend   │────────────>│  OnlyOffice │
│   (Gemini)  │       │   (React)    │             │  (iframe)   │
└─────────────┘       └──────────────┘             └─────────────┘
                            │                            │
                   Issues stream in              connector.executeMethod()
                   progressively                 applies fixes to doc
```

## SSE Event Format

```
event: issue
data: {"id":"1","type":"replacement","category":"spelling","severity":"error","find":"recieve","replace":"receive","explanation":"Misspelling"}

event: issue
data: {"id":"2","type":"replacement","category":"spelling","severity":"error","find":"occurence","replace":"occurrence","explanation":"Misspelling"}

event: done
data: {"total":2}
```

### To-dos

- [ ] Add google-generativeai package to requirements.txt
- [ ] Add GEMINI_API_KEY and GEMINI_MODEL to config.py
- [ ] Rewrite SpellcheckService to use Gemini Flash with JSON-structured prompt
- [ ] Add GEMINI_API_KEY placeholder to docker-compose.yml backend service