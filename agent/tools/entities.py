"""
Entity extraction tools for fact/logic checking
"""
import re
from typing import Any
from datetime import datetime
from dateutil import parser as date_parser
from docx import Document
from docx.opc.exceptions import PackageNotFoundError


def extract_entities(text: str) -> dict[str, list[dict[str, Any]]]:
    """
    Extract named entities from text for cross-referencing.
    
    Args:
        text: The text to analyze
        
    Returns:
        Dictionary containing:
        - dates: List of {text, normalized, position}
        - numbers: List of {text, value, context, position}
        - monetary: List of {text, value, currency, position}
        - names: List of {text, type, position}
        - defined_terms: List of {term, position}
    """
    results = {
        "dates": [],
        "numbers": [],
        "monetary": [],
        "names": [],
        "defined_terms": []
    }
    
    # Extract dates
    date_patterns = [
        # Full dates: January 15, 2024 or Jan 15, 2024
        r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December|'
        r'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}\b',
        # Numeric dates: 01/15/2024, 2024-01-15
        r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',
        r'\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b',
        # Month/Year: January 2024
        r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b',
    ]
    
    for pattern in date_patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            date_text = match.group()
            try:
                parsed = date_parser.parse(date_text, fuzzy=True)
                normalized = parsed.strftime("%Y-%m-%d")
            except (ValueError, TypeError):
                normalized = None
            
            results["dates"].append({
                "text": date_text,
                "normalized": normalized,
                "position": match.start()
            })
    
    # Extract monetary amounts
    money_pattern = r'\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|billion|thousand|USD|dollars?))?'
    for match in re.finditer(money_pattern, text, re.IGNORECASE):
        money_text = match.group()
        # Extract numeric value
        value_match = re.search(r'[\d,]+(?:\.\d{2})?', money_text)
        if value_match:
            value_str = value_match.group().replace(',', '')
            try:
                value = float(value_str)
                # Handle multipliers
                if 'million' in money_text.lower():
                    value *= 1_000_000
                elif 'billion' in money_text.lower():
                    value *= 1_000_000_000
                elif 'thousand' in money_text.lower():
                    value *= 1_000
            except ValueError:
                value = None
            
            results["monetary"].append({
                "text": money_text,
                "value": value,
                "currency": "USD",
                "position": match.start()
            })
    
    # Extract other numbers (percentages, counts, etc.)
    number_patterns = [
        (r'\b\d+(?:\.\d+)?%', 'percentage'),
        (r'\b\d{1,3}(?:,\d{3})+\b', 'large_number'),  # Numbers with commas
        (r'\b(?:one|two|three|four|five|six|seven|eight|nine|ten|'
         r'eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|'
         r'eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|'
         r'eighty|ninety|hundred|thousand|million|billion)\b', 'word_number'),
    ]
    
    for pattern, num_type in number_patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            # Get surrounding context (30 chars before and after)
            start = max(0, match.start() - 30)
            end = min(len(text), match.end() + 30)
            context = text[start:end]
            
            results["numbers"].append({
                "text": match.group(),
                "type": num_type,
                "context": context.strip(),
                "position": match.start()
            })
    
    # Extract potential proper names (capitalized words)
    # This is a simple heuristic - looks for sequences of capitalized words
    name_pattern = r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b'
    for match in re.finditer(name_pattern, text):
        name_text = match.group()
        # Filter out common non-names
        skip_words = {'The', 'This', 'That', 'These', 'Those', 'When', 'Where', 
                      'Which', 'While', 'After', 'Before', 'During', 'Between'}
        first_word = name_text.split()[0]
        if first_word not in skip_words:
            results["names"].append({
                "text": name_text,
                "type": "proper_noun",
                "position": match.start()
            })
    
    # Extract defined terms (words in quotes or with special formatting)
    defined_pattern = r'"([^"]+)"|\'([^\']+)\'|"([^"]+)"'
    for match in re.finditer(defined_pattern, text):
        term = match.group(1) or match.group(2) or match.group(3)
        if term and len(term.split()) <= 5:  # Only short phrases
            results["defined_terms"].append({
                "term": term,
                "position": match.start()
            })
    
    return results


def find_entity_references(file_path: str, entity: str) -> list[dict[str, Any]]:
    """
    Find all references to an entity in the document.
    
    Args:
        file_path: Path to the DOCX file
        entity: The entity text to search for
        
    Returns:
        List of dictionaries containing:
        - paragraph_idx: Paragraph index where found
        - context: Surrounding text
        - exact_text: The exact matched text
        - position: Character position within paragraph
    """
    try:
        doc = Document(file_path)
    except (PackageNotFoundError, Exception) as e:
        return [{"error": f"Failed to open document: {str(e)}"}]
    
    results = []
    
    # Create case-insensitive pattern
    pattern = re.compile(re.escape(entity), re.IGNORECASE)
    
    for idx, paragraph in enumerate(doc.paragraphs):
        text = paragraph.text
        for match in pattern.finditer(text):
            # Get context (50 chars before and after)
            start = max(0, match.start() - 50)
            end = min(len(text), match.end() + 50)
            context = text[start:end]
            
            # Add ellipsis if truncated
            if start > 0:
                context = "..." + context
            if end < len(text):
                context = context + "..."
            
            results.append({
                "paragraph_idx": idx,
                "context": context,
                "exact_text": match.group(),
                "position": match.start()
            })
    
    return results


