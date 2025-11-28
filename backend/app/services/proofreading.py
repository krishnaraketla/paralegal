"""
Proofreading service using Gemini with SSE streaming support
"""
import logging
import json
import re
import uuid
from typing import List, Dict, Any, Generator
from docx import Document
import google.generativeai as genai

from app.config import GEMINI_API_KEY, GEMINI_MODEL

logger = logging.getLogger(__name__)


class DocumentParseError(Exception):
    """Raised when a document cannot be parsed for proofreading"""
    pass


class ProofreadingService:
    def __init__(self):
        if GEMINI_API_KEY:
            genai.configure(api_key=GEMINI_API_KEY)
            self.model = genai.GenerativeModel(GEMINI_MODEL)
        else:
            self.model = None
            logger.warning("GEMINI_API_KEY not configured - proofreading will be disabled")
    
    def extract_document_text(self, file_path: str) -> tuple[str, List[Dict[str, Any]]]:
        """
        Extract text from DOCX document.
        Returns tuple of (full_text, paragraph_info) where paragraph_info contains
        text and start position for context extraction.
        """
        try:
            doc = Document(file_path)
        except KeyError as e:
            logger.warning(f"Cannot parse document for proofreading: {e}")
            raise DocumentParseError(f"Document format not supported for proofreading: {e}")
        except Exception as e:
            logger.warning(f"Failed to open document for proofreading: {e}")
            raise DocumentParseError(f"Failed to open document: {e}")
        
        paragraphs = []
        full_text_parts = []
        current_pos = 0
        
        for para_idx, paragraph in enumerate(doc.paragraphs):
            text = paragraph.text
            if text.strip():
                paragraphs.append({
                    "index": para_idx,
                    "text": text,
                    "start_pos": current_pos
                })
                full_text_parts.append(text)
                current_pos += len(text) + 1  # +1 for newline
        
        full_text = "\n".join(full_text_parts)
        return full_text, paragraphs
    
    def _find_paragraph_for_text(self, find_text: str, paragraphs: List[Dict[str, Any]]) -> int:
        """Find which paragraph contains the text"""
        for para in paragraphs:
            if find_text.lower() in para["text"].lower():
                return para["index"]
        return 0
    
    def _create_prompt(self, text: str) -> str:
        """Create the Gemini prompt for proofreading"""
        return f"""You are a legal document proofreader. Analyze the following text and identify issues.

ISSUE TYPES TO FIND:
1. SPELLING ERRORS - Misspelled words (typos, incorrect spelling)
2. GRAMMAR ISSUES - Subject-verb agreement, tense consistency, article usage
3. LEGAL ISSUES - Incorrect legal citations, date inconsistencies, formatting issues

RULES:
- Do NOT flag proper nouns, names, or standard legal terms
- Do NOT flag abbreviations or acronyms
- Report each unique issue only ONCE
- Be thorough but avoid false positives

Return your response as a JSON array. Each object must have:
- "type": "replacement" (for corrections) or "comment" (for suggestions) or "highlight" (for attention)
- "category": "spelling" or "grammar" or "legal" or "formatting"
- "severity": "error" or "warning" or "suggestion"
- "find": the exact text to find (preserve original case)
- "replace": the corrected text (only for type=replacement)
- "explanation": brief human-readable explanation

Example output:
[
  {{"type": "replacement", "category": "spelling", "severity": "error", "find": "recieve", "replace": "receive", "explanation": "Misspelling"}},
  {{"type": "replacement", "category": "grammar", "severity": "warning", "find": "they was", "replace": "they were", "explanation": "Subject-verb agreement"}}
]

If there are no issues, return an empty array: []

TEXT TO ANALYZE:
---
{text}
---

Return ONLY the JSON array, no other text or explanation."""

    def proofread_document_stream(self, file_path: str) -> Generator[Dict[str, Any], None, None]:
        """
        Proofread a document and yield issues as they're found.
        Uses Gemini streaming for progressive results.
        """
        if not self.model:
            logger.warning("Gemini not configured, returning empty results")
            return
        
        # Extract document text
        full_text, paragraphs = self.extract_document_text(file_path)
        
        if not full_text.strip():
            return
        
        prompt = self._create_prompt(full_text)
        
        try:
            # Use streaming API
            response = self.model.generate_content(prompt, stream=True)
            
            # Accumulate response text
            accumulated_text = ""
            issue_count = 0
            
            for chunk in response:
                if chunk.text:
                    accumulated_text += chunk.text
            
            # Clean up response (remove markdown code blocks if present)
            response_text = accumulated_text.strip()
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                json_lines = []
                in_block = False
                for line in lines:
                    if line.startswith("```"):
                        in_block = not in_block
                        continue
                    if in_block:
                        json_lines.append(line)
                response_text = "\n".join(json_lines).strip()
            
            # Parse JSON response
            issues = json.loads(response_text)
            
            if not isinstance(issues, list):
                logger.warning(f"Unexpected response format: {type(issues)}")
                return
            
            seen_finds = set()
            
            for issue in issues:
                find_text = issue.get("find", "")
                
                if not find_text:
                    continue
                
                # Skip duplicates
                find_lower = find_text.lower()
                if find_lower in seen_finds:
                    continue
                seen_finds.add(find_lower)
                
                issue_count += 1
                
                # Add paragraph hint
                paragraph_hint = self._find_paragraph_for_text(find_text, paragraphs)
                
                yield {
                    "id": str(uuid.uuid4())[:8],
                    "type": issue.get("type", "replacement"),
                    "category": issue.get("category", "spelling"),
                    "severity": issue.get("severity", "error"),
                    "find": find_text,
                    "replace": issue.get("replace", ""),
                    "paragraph_hint": paragraph_hint,
                    "explanation": issue.get("explanation", "")
                }
            
            logger.info(f"Proofreading complete: {issue_count} issues found")
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
            logger.error(f"Response was: {accumulated_text[:500]}")
        except Exception as e:
            logger.error(f"Gemini API call failed: {e}")
            raise

    def proofread_document(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Proofread a document and return all issues at once.
        Non-streaming version for backwards compatibility.
        """
        return list(self.proofread_document_stream(file_path))

