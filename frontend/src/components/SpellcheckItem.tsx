import { useState } from 'react'
import './SpellcheckItem.css'

interface SpellError {
  word: string
  suggestions: string[]
  paragraph: number
  context: string
}

interface SpellcheckItemProps {
  error: SpellError
  onDismiss: (word: string) => void
}

export default function SpellcheckItem({ error, onDismiss }: SpellcheckItemProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) {
    return null
  }

  const handleCopy = async (suggestion: string) => {
    console.log('%c[USER ACTION] Suggestion copied to clipboard', 'color: #9C27B0; font-weight: bold;', {
      misspelledWord: error.word,
      suggestion,
    })
    try {
      await navigator.clipboard.writeText(suggestion)
      setCopied(suggestion)
      setTimeout(() => setCopied(null), 1500)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDismiss = () => {
    console.log('%c[USER ACTION] Spellcheck item dismissed', 'color: #9C27B0; font-weight: bold;', {
      word: error.word,
    })
    setDismissed(true)
    onDismiss(error.word)
  }

  // Highlight the misspelled word in context
  const highlightContext = () => {
    const regex = new RegExp(`(${error.word})`, 'gi')
    const parts = error.context.split(regex)
    
    return parts.map((part, index) => 
      part.toLowerCase() === error.word.toLowerCase() 
        ? <mark key={index}>{part}</mark>
        : part
    )
  }

  return (
    <div className="spellcheck-item">
      <div className="item-header">
        <span className="misspelled-word">{error.word}</span>
        <button 
          className="dismiss-btn" 
          onClick={handleDismiss}
          title="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      
      <div className="item-context">
        {highlightContext()}
      </div>
      
      {error.suggestions.length > 0 && (
        <div className="suggestions">
          <span className="suggestions-label">Suggestions:</span>
          <div className="suggestions-list">
            {error.suggestions.map((suggestion, index) => (
              <button
                key={index}
                className={`suggestion-btn ${copied === suggestion ? 'copied' : ''}`}
                onClick={() => handleCopy(suggestion)}
                title="Click to copy"
              >
                {copied === suggestion ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  suggestion
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

