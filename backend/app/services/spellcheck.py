from typing import List, Dict, Any
from spellchecker import SpellChecker
from docx import Document
import re


def edit_distance(s1: str, s2: str) -> int:
    """Calculate Levenshtein edit distance between two strings."""
    if len(s1) < len(s2):
        return edit_distance(s2, s1)
    
    if len(s2) == 0:
        return len(s1)
    
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    
    return previous_row[-1]


class SpellcheckService:
    def __init__(self):
        self.spell = SpellChecker()
        # Add common technical/business terms that might be flagged incorrectly
        self.spell.word_frequency.load_words([
            'docx', 'pdf', 'api', 'url', 'html', 'css', 'javascript',
            'frontend', 'backend', 'onlyoffice', 'paralegal'
        ])
    
    def extract_words(self, text: str) -> List[str]:
        """Extract words from text, ignoring numbers and special characters"""
        # Match words (letters only, at least 2 characters)
        words = re.findall(r'\b[a-zA-Z]{2,}\b', text)
        return words
    
    def check_document(self, file_path: str) -> List[Dict[str, Any]]:
        """Check a DOCX document for spelling errors"""
        
        doc = Document(file_path)
        errors = []
        seen_words = set()  # Track unique misspelled words
        
        for para_idx, paragraph in enumerate(doc.paragraphs):
            text = paragraph.text
            if not text.strip():
                continue
            
            words = self.extract_words(text)
            
            for word in words:
                word_lower = word.lower()
                
                # Skip if we've already reported this word
                if word_lower in seen_words:
                    continue
                
                # Check if word is misspelled
                if word_lower not in self.spell:
                    seen_words.add(word_lower)
                    
                    # Get suggestions
                    suggestions = list(self.spell.candidates(word_lower) or [])
                    # Sort by edit distance (most likely first)
                    suggestions = sorted(suggestions, 
                                        key=lambda x: edit_distance(word_lower, x))[:5]
                    
                    # Get context (surrounding text)
                    context = self._get_context(text, word)
                    
                    errors.append({
                        "word": word,
                        "suggestions": suggestions,
                        "paragraph": para_idx,
                        "context": context
                    })
        
        return errors
    
    def _get_context(self, text: str, word: str, context_chars: int = 50) -> str:
        """Get surrounding context for a word"""
        try:
            # Find the word in text (case insensitive)
            pattern = re.compile(re.escape(word), re.IGNORECASE)
            match = pattern.search(text)
            
            if match:
                start = max(0, match.start() - context_chars)
                end = min(len(text), match.end() + context_chars)
                
                context = text[start:end]
                
                # Add ellipsis if truncated
                if start > 0:
                    context = "..." + context
                if end < len(text):
                    context = context + "..."
                
                return context
        except Exception:
            pass
        
        return text[:100] + "..." if len(text) > 100 else text

