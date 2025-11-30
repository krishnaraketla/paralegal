<!-- c6f5970d-b359-45e6-996e-3a17c3fb5a21 e53361aa-f009-46df-8f5b-7a99d441ca0b -->
# Multi-Agent Proofreading MVP

## Architecture

ADK `ParallelAgent` orchestrates 4 specialized `LlmAgent` sub-agents that run concurrently, with real-time status updates and document tools including eyecite for legal citations:

```
┌─────────────────────────────────────────────────────┐
│                  agent/main.py                      │
│            FastAPI + SSE Streaming                  │
├─────────────────────────────────────────────────────┤
│              ADK ParallelAgent                      │
│     status: "Analyzing document..."                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Spelling │ │ Grammar  │ │FactLogic │ │Format- │ │
│  │ LlmAgent │ │ LlmAgent │ │ LlmAgent │ │LlmAgent│ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
│       │            │            │            │     │
│       └────────────┴─────┬──────┴────────────┘     │
│                          ▼                         │
│                      Tools                         │
│  document | entities | citations (eyecite)         │
└─────────────────────────────────────────────────────┘
           ↓ SSE: status, issue, done events
┌─────────────────────────────────────────────────────┐
│           Frontend (existing)                       │
│   ProofreadingPanel.tsx + Status Display            │
└─────────────────────────────────────────────────────┘
```

## Project Structure

```
paralegal/
├── agent/
│   ├── __init__.py
│   ├── main.py                # FastAPI + SSE endpoint
│   ├── config.py              # Gemini/ADK configuration
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── proofreader.py     # ParallelAgent + 4 LlmAgent sub-agents
│   │   └── prompts.py         # Specialized prompts per agent
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── document.py        # Section/paragraph extraction
│   │   ├── entities.py        # Entity extraction for fact-checking
│   │   └── citations.py       # eyecite integration for legal citations
│   ├── requirements.txt
│   └── Dockerfile
```

## Implementation

### 1. Document Tools ([agent/tools/document.py](agent/tools/document.py))

```python
from google.adk.tools import tool

@tool
def get_document_sections(file_path: str) -> list[dict]:
    """Parse document into sections by heading styles."""
    ...

@tool  
def get_paragraph(file_path: str, index: int) -> dict:
    """Get specific paragraph with surrounding context."""
    ...

@tool
def get_document_metadata(file_path: str) -> dict:
    """Extract document metadata (title, dates, word count)."""
    ...
```

### 2. Entity Extraction Tools ([agent/tools/entities.py](agent/tools/entities.py))

```python
@tool
def extract_entities(text: str) -> dict:
    """Extract dates, names, numbers for cross-referencing."""
    ...

@tool
def find_entity_references(file_path: str, entity: str) -> list[dict]:
    """Find all references to an entity in the document."""
    ...
```

### 3. Citation Tools with eyecite ([agent/tools/citations.py](agent/tools/citations.py))

```python
from eyecite import get_citations
from eyecite.models import FullCaseCitation, ShortCaseCitation, StatuteCitation

@tool
def extract_citations(text: str) -> list[dict]:
    """Extract legal citations using eyecite.
    Returns list of {
        text: str,           # "410 U.S. 113"
        type: str,           # "case" | "statute" | "journal"
        reporter: str,       # "U.S."
        volume: str,         # "410"
        page: str,           # "113"
        paragraph_idx: int,
        is_valid: bool       # Basic format validation
    }"""
    citations = get_citations(text)
    results = []
    for cite in citations:
        if isinstance(cite, FullCaseCitation):
            results.append({
                "text": cite.matched_text(),
                "type": "case",
                "reporter": cite.groups.get("reporter", ""),
                "volume": cite.groups.get("volume", ""),
                "page": cite.groups.get("page", ""),
                "is_valid": True
            })
        elif isinstance(cite, StatuteCitation):
            results.append({
                "text": cite.matched_text(),
                "type": "statute",
                ...
            })
    return results

@tool
def validate_citation_format(citation: str) -> dict:
    """Check if a citation follows proper Bluebook format.
    Returns {is_valid: bool, issues: list[str], suggested_fix: str}."""
    ...
```

### 4. ADK Agent Setup ([agent/agents/proofreader.py](agent/agents/proofreader.py))

```python
from google.adk.agents import LlmAgent, ParallelAgent
from agent.tools.document import get_document_sections, get_paragraph, get_document_metadata
from agent.tools.entities import extract_entities, find_entity_references
from agent.tools.citations import extract_citations, validate_citation_format

spelling_agent = LlmAgent(
    name="SpellingAgent",
    model="gemini-2.0-flash",
    instruction=SPELLING_PROMPT,
    tools=[get_paragraph],
    output_key="spelling_issues"
)

grammar_agent = LlmAgent(
    name="GrammarAgent",
    model="gemini-2.0-flash",
    instruction=GRAMMAR_PROMPT,
    tools=[get_document_sections, get_paragraph],
    output_key="grammar_issues"
)

fact_logic_agent = LlmAgent(
    name="FactLogicAgent",
    model="gemini-2.0-flash",
    instruction=FACT_LOGIC_PROMPT,
    tools=[extract_entities, find_entity_references, extract_citations, get_document_metadata],
    output_key="consistency_issues"
)

formatting_agent = LlmAgent(
    name="FormattingAgent",
    model="gemini-2.0-flash",
    instruction=FORMATTING_PROMPT,
    tools=[get_document_sections, get_document_metadata, validate_citation_format],
    output_key="formatting_issues"
)

proofreading_agent = ParallelAgent(
    name="ProofreadingAgent",
    sub_agents=[spelling_agent, grammar_agent, fact_logic_agent, formatting_agent]
)
```

### 5. SSE Streaming with Status Updates ([agent/main.py](agent/main.py))

Three event types: `status`, `issue`, `done`

```python
# Status messages for each agent
AGENT_STATUS = {
    "SpellingAgent": "Looking for spelling errors and typos...",
    "GrammarAgent": "Checking grammar and usage...",
    "FactLogicAgent": "Analyzing facts, dates, and citations...",
    "FormattingAgent": "Reviewing document structure..."
}

@app.get("/proofread/{doc_id}")
async def proofread(doc_id: str):
    temp_path = await download_document(doc_id)
    
    async def event_generator():
        # Initial status
        yield f"event: status\ndata: {json.dumps({'message': 'Starting analysis...'})}\n\n"
        
        session = await session_service.create_session(
            app_name="proofreader",
            state={"file_path": temp_path}
        )
        
        agents_started = set()
        
        async for event in runner.run_async(
            session_id=session.id,
            user_id="user",
            new_message=f"Proofread the document at {temp_path}"
        ):
            # Send status when agent starts
            if event.author and event.author not in agents_started:
                agents_started.add(event.author)
                status_msg = AGENT_STATUS.get(event.author, f"{event.author} processing...")
                yield f"event: status\ndata: {json.dumps({'message': status_msg, 'agent': event.author})}\n\n"
            
            # Stream issues as they arrive
            if event.actions and event.actions.state_delta:
                for key, issues_json in event.actions.state_delta.items():
                    category = key.replace("_issues", "")
                    for issue in parse_issues(issues_json, category):
                        yield f"event: issue\ndata: {json.dumps(issue)}\n\n"
        
        yield f"event: status\ndata: {json.dumps({'message': 'Analysis complete!'})}\n\n"
        yield f"event: done\ndata: {json.dumps({'total': total})}\n\n"
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

### 6. Frontend Status Display

Update [frontend/src/api/proofreading.ts](frontend/src/api/proofreading.ts):

```typescript
export interface ProofreadingCallbacks {
  onIssue: (issue: ProofreadingIssue) => void
  onStatus: (status: { message: string; agent?: string }) => void  // NEW
  onComplete: (total: number) => void
  onError?: (error: string) => void
}

// Add status event listener
eventSource.addEventListener('status', (event) => {
  const status = JSON.parse(event.data)
  callbacks.onStatus(status)
})
```

Update [frontend/src/components/ProofreadingPanel.tsx](frontend/src/components/ProofreadingPanel.tsx):

```tsx
// Add status state
const [status, setStatus] = useState<string>('')

// In loading state, show status:
{isLoading && (
  <div className="panel-loading">
    <div className="loading-spinner-small" />
    <span className="status-message">{status || 'Starting...'}</span>
    {issues.length > 0 && (
      <span className="issue-count-live">{issues.length} issues found</span>
    )}
  </div>
)}
```

### 7. Docker Compose

```yaml
agent:
  build: ./agent
  ports:
    - "8001:8001"
  environment:
    - GOOGLE_API_KEY=${GOOGLE_API_KEY}
  volumes:
    - ./backend/storage:/app/storage
```

## Dependencies (agent/requirements.txt)

```
google-adk>=1.0.0
google-generativeai>=0.5.0
fastapi>=0.109.0
uvicorn>=0.27.0
python-docx>=1.1.0
sse-starlette>=1.6.0
eyecite>=2.6.0
python-dateutil>=2.8.0
```

## Testing

1. Start agent service: `cd agent && uvicorn main:app --port 8001`
2. Test eyecite tool with sample legal documents
3. Verify status updates appear in frontend during analysis
4. Check all 4 agent categories return issues correctly

### To-dos

- [ ] Create agent/ directory with config.py, requirements.txt, base agent class
- [ ] Implement spelling agent for typos and misspellings
- [ ] Implement grammar agent for usage, tense, punctuation
- [ ] Implement fact/logic agent for consistency and contradictions
- [ ] Implement formatting agent for structure and numbering
- [ ] Build FastAPI endpoint with parallel agent execution and interleaved SSE
- [ ] Update frontend API URL and add consistency category
- [ ] Add agent service to docker-compose.yml