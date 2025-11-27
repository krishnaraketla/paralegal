import { useState } from 'react'
import { getSpellcheck } from '../api/documents'
import type { SpellError } from '../App'
import SpellcheckItem from './SpellcheckItem'
import './SpellcheckPanel.css'

interface SpellcheckPanelProps {
  errors: SpellError[]
  isLoading: boolean
  documentId: string
  onRefresh: () => void
}

export default function SpellcheckPanel({ 
  errors, 
  isLoading, 
  documentId,
  onRefresh 
}: SpellcheckPanelProps) {
  const [refreshing, setRefreshing] = useState(false)
  const [localErrors, setLocalErrors] = useState<SpellError[]>([])
  const displayErrors = localErrors.length > 0 ? localErrors : errors

  const handleRefresh = async () => {
    setRefreshing(true)
    onRefresh()
    try {
      const result = await getSpellcheck(documentId)
      setLocalErrors(result.errors)
    } catch (err) {
      console.error('Refresh error:', err)
    } finally {
      setRefreshing(false)
    }
  }

  const handleDismiss = (word: string) => {
    setLocalErrors(prev => prev.filter(e => e.word !== word))
  }

  return (
    <div className="spellcheck-panel">
      <div className="panel-header">
        <h2>Spellcheck</h2>
        <button 
          className="refresh-btn" 
          onClick={handleRefresh}
          disabled={isLoading || refreshing}
          title="Refresh spellcheck"
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            className={refreshing ? 'spinning' : ''}
          >
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
          </svg>
        </button>
      </div>

      <div className="panel-content">
        {isLoading || refreshing ? (
          <div className="panel-loading">
            <div className="loading-spinner-small" />
            <span>Checking spelling...</span>
          </div>
        ) : displayErrors.length === 0 ? (
          <div className="no-errors">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>No spelling errors found!</span>
          </div>
        ) : (
          <>
            <div className="error-count">
              <span className="count">{displayErrors.length}</span>
              <span>issue{displayErrors.length !== 1 ? 's' : ''} found</span>
            </div>
            <div className="errors-list">
              {displayErrors.map((error, index) => (
                <SpellcheckItem 
                  key={`${error.word}-${index}`} 
                  error={error} 
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="panel-footer">
        <p className="panel-hint">
          Click on a suggestion to copy it. Edit in the document editor.
        </p>
      </div>
    </div>
  )
}

