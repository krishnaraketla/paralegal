import logging
import json
import re
from typing import List, Dict, Any
from docx import Document
import google.generativeai as genai

from app.config import GEMINI_API_KEY, GEMINI_MODEL

logger = logging.getLogger(__name__)


class DocumentParseError(Exception):
    """Raised when a document cannot be parsed for spellchecking"""
    pass


class SpellcheckService:
    def __init__(self):
        if GEMINI_API_KEY:
            genai.configure(api_key=GEMINI_API_KEY)
            self.model = genai.GenerativeModel(GEMINI_MODEL)
        else:
            self.model = None
            logger.warning("GEMINI_API_KEY not configured - spellcheck will be disabled")
    
    def _extract_document_text(self, file_path: str) -> tuple[str, List[Dict[str, Any]]]:
        """
        Extract text from DOCX document.
        Returns tuple of (full_text, paragraph_info) where paragraph_info contains
        text and start position for context extraction.
        """
        try:
            doc = Document(file_path)
        except KeyError as e:
            logger.warning(f"Cannot parse document for spellcheck: {e}")
            raise DocumentParseError(f"Document format not supported for spellcheck: {e}")
        except Exception as e:
            logger.warning(f"Failed to open document for spellcheck: {e}")
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
    
    def _get_context(self, text: str, word: str, context_chars: int = 50) -> str:
        """Get surrounding context for a word"""
        try:
            pattern = re.compile(re.escape(word), re.IGNORECASE)
            match = pattern.search(text)
            
            if match:
                start = max(0, match.start() - context_chars)
                end = min(len(text), match.end() + context_chars)
                
                context = text[start:end]
                
                if start > 0:
                    context = "..." + context
                if end < len(text):
                    context = context + "..."
                
                return context
        except Exception:
            pass
        
        return text[:100] + "..." if len(text) > 100 else text
    
    def _find_paragraph_for_word(self, word: str, paragraphs: List[Dict[str, Any]]) -> int:
        """Find which paragraph contains a word"""
        for para in paragraphs:
            if word.lower() in para["text"].lower():
                return para["index"]
        return 0
    
    def check_document(self, file_path: str) -> List[Dict[str, Any]]:
        """Check a DOCX document for spelling errors using Gemini"""
        
        if not self.model:
            logger.warning("Gemini not configured, returning empty results")
            return []
        
        # Extract document text
        full_text, paragraphs = self._extract_document_text(file_path)
        
        if not full_text.strip():
            return []
        
        # Create prompt for Gemini
        prompt = """You are a legal document proofreader. Analyze the following text and identify ONLY spelling errors (misspelled words).

IMPORTANT RULES:
- Only identify words that are MISSPELLED (typos, incorrect spelling)
- Do NOT flag grammatical issues, punctuation, or formatting
- Do NOT flag proper nouns, names, or legal terms that are correctly spelled
- Do NOT flag abbreviations or acronyms
- Report each unique misspelled word only ONCE, even if it appears multiple times

Return your response as a JSON array. Each object should have:
- "word": the misspelled word exactly as it appears in the text (preserve original case)
- "correction": the correct spelling

If there are no spelling errors, return an empty array: []

TEXT TO ANALYZE:
---
""" + full_text + """
---

Return ONLY the JSON array, no other text or explanation."""

        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Extract JSON from response (handle markdown code blocks)
            if response_text.startswith("```"):
                # Remove markdown code block
                lines = response_text.split("\n")
                json_lines = []
                in_block = False
                for line in lines:
                    if line.startswith("```"):
                        in_block = not in_block
                        continue
                    if in_block or not line.startswith("```"):
                        json_lines.append(line)
                response_text = "\n".join(json_lines).strip()
            
            # Parse JSON response
            spelling_errors = json.loads(response_text)
            
            if not isinstance(spelling_errors, list):
                logger.warning(f"Unexpected response format: {type(spelling_errors)}")
                return []
            
            # Convert to our format
            errors = []
            seen_words = set()
            
            for error in spelling_errors:
                word = error.get("word", "")
                correction = error.get("correction", "")
                
                if not word or not correction:
                    continue
                
                # Skip duplicates
                word_lower = word.lower()
                if word_lower in seen_words:
                    continue
                seen_words.add(word_lower)
                
                # Find context and paragraph
                context = self._get_context(full_text, word)
                paragraph = self._find_paragraph_for_word(word, paragraphs)
                
                errors.append({
                    "word": word,
                    "suggestions": [correction],
                    "paragraph": paragraph,
                    "context": context
                })
            
            return errors
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
            logger.error(f"Response was: {response_text[:500]}")
            return []
        except Exception as e:
            logger.error(f"Gemini API call failed: {e}")
            return []
