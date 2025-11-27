<!-- aa75d7b9-26da-44db-9271-74bfb2bfe916 4d38f32c-0ae7-4cd8-8533-f364197d9aa9 -->
# Legal Proofreading Agent Service (Backend)

## Architecture Overview

Standalone Python service using Google ADK with hierarchical multi-agent pattern. Frontend integration deferred to Phase 2.

## Project Structure

```
paralegal/
├── agent/                          # New standalone service
│   ├── __init__.py
│   ├── main.py                     # FastAPI app with SSE streaming
│   ├── config.py                   # ADK + Gemini configuration
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── coordinator.py          # Root agent - orchestrates workflow
│   │   ├── accuracy.py             # Numbers, dates, names, symbols
│   │   ├── terminology.py          # Legal language validation
│   │   ├── citations.py            # Legal reference checking
│   │   ├── ambiguity.py            # Unclear language detection
│   │   └── formatting.py           # Legal formatting standards
│   ├── tools/
│   │   ├── __init__.py
│   │   └── document_tools.py       # Document parsing, section extraction
│   ├── prompts/
│   │   └── system_prompts.py       # Specialized prompts per agent
│   ├── requirements.txt
│   └── Dockerfile
```

## Technology Stack

| Component | Choice | Rationale |

|-----------|--------|-----------|

| Agent Framework | **Google ADK** | Native Gemini support, multi-agent built-in |

| LLM Model | **gemini-2.0-flash** | Fast, cost-effective, sufficient for proofreading |

| Streaming | **SSE** (Server-Sent Events) | Simple one-way streaming, no bidirectional needed |

| Doc Parsing | **python-docx** | Already in use, reliable |

| API Framework | **FastAPI** | Consistent with existing backend |

## Implementation Details

### 1. Google ADK Setup ([agent/config.py](agent/config.py))

- Configure Gemini API key via `GOOGLE_API_KEY` env var
- Model: `gemini-2.0-flash` for all agents

### 2. Document Tools ([agent/tools/document_tools.py](agent/tools/document_tools.py))

Build on existing [backend/app/services/docx_parser.py](backend/app/services/docx_parser.py):

- `extract_sections()` - Parse by heading styles, return structured sections
- `get_paragraph_with_context()` - Get paragraph + surrounding context
- `extract_citations()` - Find legal citations (regex patterns for Bluebook)
- `get_document_metadata()` - Title, author, dates for accuracy checks

### 3. Specialized Agents

Each agent focuses on one proofreading category with tailored prompts:

| Agent | File | Checks |

|-------|------|--------|

| Accuracy | `accuracy.py` | Numbers, dates, names, symbols (§, ¶, $) |

| Terminology | `terminology.py` | Legal language, Latin terms, defined terms |

| Citations | `citations.py` | Bluebook format, case names, statutory refs |

| Ambiguity | `ambiguity.py` | Vague pronouns, unclear antecedents |

| Formatting | `formatting.py` | Heading hierarchy, spacing, numbering |

### 4. Coordinator Agent ([agent/agents/coordinator.py](agent/agents/coordinator.py))

- Receives document path, chunks into sections
- Dispatches to specialist sub-agents via ADK's `sub_agents`
- Aggregates results into standardized output format

### 5. API Output Format

```python
{
  "type": "replacement",        # replacement | comment | highlight
  "category": "accuracy",       # which agent found it
  "severity": "error",          # error | warning | suggestion
  "find": "recieve",            # exact text to find
  "replace": "receive",         # replacement (if type=replacement)
  "paragraph_hint": 5,          # narrow search scope
  "explanation": "Misspelling"  # human-readable explanation
}
```

### 6. Streaming API ([agent/main.py](agent/main.py))

- `POST /proofread` - Accept document path, return SSE stream
- Stream issues as each agent finds them
- Final event signals completion with summary

## Testing Strategy

- Use existing documents in [backend/storage/](backend/storage/) for testing
- Manual testing via curl/httpie with SSE support
- Verify each agent produces valid output format

## Dependencies (agent/requirements.txt)

```
google-adk>=0.1.0
google-generativeai>=0.5.0
fastapi>=0.109.0
uvicorn>=0.27.0
python-docx>=1.1.0
sse-starlette>=1.6.0
```

---

**Phase 2 (Future)**: Frontend integration with OnlyOffice Automation API

### To-dos

- [ ] Create agent/ directory with config.py, requirements.txt, and __init__.py files
- [ ] Build document parsing tools: extract_sections, get_paragraph_with_context, extract_citations
- [ ] Implement accuracy agent (numbers, dates, names, symbols)
- [ ] Implement terminology agent (legal language, Latin terms)
- [ ] Implement citations agent (Bluebook format, case names)
- [ ] Implement ambiguity agent (vague pronouns, unclear language)
- [ ] Implement formatting agent (heading hierarchy, numbering)
- [ ] Create coordinator agent that orchestrates the 5 specialist sub-agents
- [ ] Implement FastAPI /proofread endpoint with SSE streaming
- [ ] Test agent service with sample documents from backend/storage/