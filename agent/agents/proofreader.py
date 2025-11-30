"""
Proofreading agent using Google ADK ParallelAgent pattern

This module creates 4 specialized LlmAgent sub-agents that run concurrently:
- SpellingAgent: Typos, misspellings, homophone confusion
- GrammarAgent: Grammar, usage, punctuation
- FactLogicAgent: Consistency, contradictions, logic errors
- FormattingAgent: Structure, numbering, headings
"""
from google.adk.agents import LlmAgent, ParallelAgent
from google.adk.tools import FunctionTool

from config import GEMINI_MODEL
from agents.prompts import (
    SPELLING_PROMPT,
    GRAMMAR_PROMPT,
    FACT_LOGIC_PROMPT,
    FORMATTING_PROMPT,
)
from tools.document import (
    get_document_sections,
    get_paragraph,
    get_document_metadata,
    get_full_text,
)
from tools.entities import (
    extract_entities,
    find_entity_references,
)
from tools.citations import (
    extract_citations,
    validate_citation_format,
)


# Status messages shown in UI when each agent starts
AGENT_STATUS = {
    "SpellingAgent": "Looking for spelling errors and typos...",
    "GrammarAgent": "Checking grammar and usage...",
    "FactLogicAgent": "Analyzing facts, dates, and citations...",
    "FormattingAgent": "Reviewing document structure...",
}


# Create FunctionTools from our tool functions
# Document tools
get_sections_tool = FunctionTool(get_document_sections)
get_paragraph_tool = FunctionTool(get_paragraph)
get_metadata_tool = FunctionTool(get_document_metadata)
get_text_tool = FunctionTool(get_full_text)

# Entity tools
extract_entities_tool = FunctionTool(extract_entities)
find_references_tool = FunctionTool(find_entity_references)

# Citation tools
extract_citations_tool = FunctionTool(extract_citations)
validate_citation_tool = FunctionTool(validate_citation_format)


def create_spelling_agent() -> LlmAgent:
    """Create the spelling/typo detection agent"""
    return LlmAgent(
        name="SpellingAgent",
        model=GEMINI_MODEL,
        instruction=SPELLING_PROMPT,
        tools=[get_paragraph_tool, get_text_tool],
        output_key="spelling_issues",
    )


def create_grammar_agent() -> LlmAgent:
    """Create the grammar/usage checking agent"""
    return LlmAgent(
        name="GrammarAgent",
        model=GEMINI_MODEL,
        instruction=GRAMMAR_PROMPT,
        tools=[get_sections_tool, get_paragraph_tool, get_text_tool],
        output_key="grammar_issues",
    )


def create_fact_logic_agent() -> LlmAgent:
    """Create the fact/logic/consistency checking agent"""
    return LlmAgent(
        name="FactLogicAgent",
        model=GEMINI_MODEL,
        instruction=FACT_LOGIC_PROMPT,
        tools=[
            extract_entities_tool,
            find_references_tool,
            extract_citations_tool,
            get_metadata_tool,
            get_text_tool,
        ],
        output_key="consistency_issues",
    )


def create_formatting_agent() -> LlmAgent:
    """Create the formatting/structure checking agent"""
    return LlmAgent(
        name="FormattingAgent",
        model=GEMINI_MODEL,
        instruction=FORMATTING_PROMPT,
        tools=[
            get_sections_tool,
            get_metadata_tool,
            validate_citation_tool,
            get_text_tool,
        ],
        output_key="formatting_issues",
    )


def create_proofreading_agent() -> ParallelAgent:
    """
    Create the main proofreading agent that orchestrates 4 sub-agents in parallel.
    
    Returns:
        ParallelAgent that runs spelling, grammar, fact/logic, and formatting
        agents concurrently.
    """
    spelling_agent = create_spelling_agent()
    grammar_agent = create_grammar_agent()
    fact_logic_agent = create_fact_logic_agent()
    formatting_agent = create_formatting_agent()
    
    return ParallelAgent(
        name="ProofreadingAgent",
        sub_agents=[
            spelling_agent,
            grammar_agent,
            fact_logic_agent,
            formatting_agent,
        ],
    )


# Create the default proofreading agent instance
proofreading_agent = create_proofreading_agent()


