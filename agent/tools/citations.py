"""
Legal citation extraction tools using eyecite
"""
import re
from typing import Any

try:
    from eyecite import get_citations
    from eyecite.models import (
        FullCaseCitation,
        ShortCaseCitation,
        SupraCitation,
        IdCitation,
        FullLawCitation,
        FullJournalCitation,
    )
    EYECITE_AVAILABLE = True
except ImportError:
    EYECITE_AVAILABLE = False


def extract_citations(text: str) -> list[dict[str, Any]]:
    """
    Extract legal citations using eyecite.
    
    Args:
        text: The text to analyze for citations
        
    Returns:
        List of dictionaries containing:
        - text: The matched citation text
        - type: "case" | "statute" | "journal" | "short" | "supra" | "id"
        - reporter: Reporter name (for case citations)
        - volume: Volume number
        - page: Page number
        - position: Character position in text
        - is_valid: Whether the citation appears well-formed
        - details: Additional citation-specific details
    """
    if not EYECITE_AVAILABLE:
        # Fallback to basic regex patterns if eyecite not available
        return _extract_citations_fallback(text)
    
    results = []
    
    try:
        citations = get_citations(text)
        
        for cite in citations:
            citation_data = {
                "text": cite.matched_text() if hasattr(cite, 'matched_text') else str(cite),
                "position": cite.span()[0] if hasattr(cite, 'span') else 0,
                "is_valid": True,
                "details": {}
            }
            
            if isinstance(cite, FullCaseCitation):
                citation_data["type"] = "case"
                citation_data["reporter"] = getattr(cite, 'reporter', '')
                citation_data["volume"] = getattr(cite, 'volume', '')
                citation_data["page"] = getattr(cite, 'page', '')
                citation_data["details"] = {
                    "plaintiff": getattr(cite, 'plaintiff', ''),
                    "defendant": getattr(cite, 'defendant', ''),
                    "year": getattr(cite, 'year', '')
                }
            
            elif isinstance(cite, ShortCaseCitation):
                citation_data["type"] = "short"
                citation_data["reporter"] = getattr(cite, 'reporter', '')
                citation_data["volume"] = getattr(cite, 'volume', '')
                citation_data["page"] = getattr(cite, 'page', '')
            
            elif isinstance(cite, SupraCitation):
                citation_data["type"] = "supra"
                citation_data["details"] = {
                    "antecedent_guess": getattr(cite, 'antecedent_guess', '')
                }
            
            elif isinstance(cite, IdCitation):
                citation_data["type"] = "id"
            
            elif isinstance(cite, FullLawCitation):
                citation_data["type"] = "statute"
                citation_data["details"] = {
                    "title": getattr(cite, 'title', ''),
                    "code": getattr(cite, 'code', ''),
                    "section": getattr(cite, 'section', '')
                }
            
            elif isinstance(cite, FullJournalCitation):
                citation_data["type"] = "journal"
                citation_data["volume"] = getattr(cite, 'volume', '')
                citation_data["page"] = getattr(cite, 'page', '')
                citation_data["details"] = {
                    "journal": getattr(cite, 'journal', '')
                }
            
            else:
                citation_data["type"] = "other"
            
            results.append(citation_data)
    
    except Exception as e:
        # If eyecite fails, fall back to regex
        return _extract_citations_fallback(text)
    
    return results


def _extract_citations_fallback(text: str) -> list[dict[str, Any]]:
    """
    Fallback citation extraction using regex patterns.
    Used when eyecite is not available or fails.
    """
    results = []
    
    # Common case citation patterns
    case_patterns = [
        # Standard case citations: 410 U.S. 113, 123 S.Ct. 456
        r'\b\d+\s+[A-Z][A-Za-z.]*(?:\s+[A-Z][a-z]*\.?)?\s+\d+\b',
        # Case names with v.: Smith v. Jones, 410 U.S. 113
        r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+v\.\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s*\d+\s+[A-Z][A-Za-z.]+\s+\d+',
    ]
    
    # Statute patterns
    statute_patterns = [
        # U.S.C. citations: 42 U.S.C. § 1983
        r'\b\d+\s+U\.?S\.?C\.?\s*§?\s*\d+[a-z]?\b',
        # CFR citations: 29 C.F.R. § 1630.2
        r'\b\d+\s+C\.?F\.?R\.?\s*§?\s*[\d.]+\b',
    ]
    
    for pattern in case_patterns:
        for match in re.finditer(pattern, text):
            results.append({
                "text": match.group(),
                "type": "case",
                "position": match.start(),
                "is_valid": True,
                "reporter": "",
                "volume": "",
                "page": "",
                "details": {}
            })
    
    for pattern in statute_patterns:
        for match in re.finditer(pattern, text):
            results.append({
                "text": match.group(),
                "type": "statute",
                "position": match.start(),
                "is_valid": True,
                "details": {}
            })
    
    return results


def validate_citation_format(citation: str) -> dict[str, Any]:
    """
    Check if a citation follows proper Bluebook format.
    
    Args:
        citation: The citation text to validate
        
    Returns:
        Dictionary containing:
        - is_valid: Whether the citation appears valid
        - issues: List of potential formatting issues
        - suggested_fix: Suggested correction if issues found
        - citation_type: Detected type of citation
    """
    issues = []
    suggested_fix = citation
    citation_type = "unknown"
    
    # Detect citation type
    if re.search(r'\bv\.\s', citation):
        citation_type = "case"
    elif re.search(r'U\.?S\.?C\.?', citation):
        citation_type = "statute"
    elif re.search(r'C\.?F\.?R\.?', citation):
        citation_type = "regulation"
    elif re.search(r'\d+\s+[A-Z][a-z]+\.\s+(L\.?\s*)?(Rev|J)\b', citation):
        citation_type = "journal"
    
    # Check for common Bluebook issues
    
    # 1. Check for proper spacing around "v."
    if citation_type == "case":
        if re.search(r'v\.(?!\s)', citation):
            issues.append("Missing space after 'v.'")
            suggested_fix = re.sub(r'v\.(?!\s)', 'v. ', suggested_fix)
        if re.search(r'(?<!\s)v\.', citation):
            issues.append("Missing space before 'v.'")
            suggested_fix = re.sub(r'(?<!\s)v\.', ' v.', suggested_fix)
    
    # 2. Check for proper section symbol usage
    if '§' in citation:
        # Check for space after section symbol
        if re.search(r'§(?!\s)', citation):
            issues.append("Missing space after section symbol (§)")
            suggested_fix = re.sub(r'§(?!\s)', '§ ', suggested_fix)
    elif 'section' in citation.lower() and citation_type in ['statute', 'regulation']:
        issues.append("Consider using section symbol (§) instead of 'section'")
    
    # 3. Check reporter abbreviations
    reporter_corrections = {
        r'\bU\.S\.C\b': 'U.S.C.',
        r'\bUS\b(?=\s+\d)': 'U.S.',
        r'\bSCt\b': 'S. Ct.',
        r'\bS\.Ct\b': 'S. Ct.',
        r'\bLEd\b': 'L. Ed.',
        r'\bFed\b(?=\s)': 'Fed.',
        r'\bSupp\b': 'Supp.',
    }
    
    for pattern, replacement in reporter_corrections.items():
        if re.search(pattern, citation):
            issues.append(f"Reporter abbreviation should be '{replacement}'")
            suggested_fix = re.sub(pattern, replacement, suggested_fix)
    
    # 4. Check for year in parentheses for case citations
    if citation_type == "case":
        if not re.search(r'\(\d{4}\)', citation):
            issues.append("Case citations should include the year in parentheses")
    
    # 5. Check for comma before page number (pincite)
    if citation_type == "case":
        # Pattern for citation with pincite: 410 U.S. 113, 120
        if re.search(r'\d+\s+[A-Z][A-Za-z.]+\s+\d+\s+\d+', citation):
            if not re.search(r'\d+\s+[A-Z][A-Za-z.]+\s+\d+,\s*\d+', citation):
                issues.append("Pincite should be preceded by comma and space")
    
    return {
        "is_valid": len(issues) == 0,
        "issues": issues,
        "suggested_fix": suggested_fix if issues else citation,
        "citation_type": citation_type
    }


