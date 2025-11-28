import { useRef, useCallback, useState } from 'react'
import { 
  streamProofread, 
  getCategoryInfo, 
  getSeverityInfo,
  type ProofreadingIssue 
} from '../api/proofreading'
import './ProofreadingPanel.css'

interface ProofreadingPanelProps {
  issues: ProofreadingIssue[]
  isLoading: boolean
  documentId: string
  onProofreadStart: () => void
  onIssueReceived: (issue: ProofreadingIssue) => void
  onProofreadComplete: () => void
  onApplyIssue: (issue: ProofreadingIssue) => void
  onDismissIssue: (issueId: string) => void
  onHighlightIssue: (issue: ProofreadingIssue) => void
}

export default function ProofreadingPanel({
  issues,
  isLoading,
  documentId,
  onProofreadStart,
  onIssueReceived,
  onProofreadComplete,
  onApplyIssue,
  onDismissIssue,
  onHighlightIssue,
}: ProofreadingPanelProps) {
  const abortRef = useRef<(() => void) | null>(null)
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)

  const handleStartProofread = useCallback(() => {
    console.log('%c[USER ACTION] Starting proofreading', 'color: #9C27B0; font-weight: bold;', {
      documentId,
    })
    
    // Abort any existing stream
    if (abortRef.current) {
      abortRef.current()
    }
    
    setSelectedIssueId(null)
    onProofreadStart()
    
    abortRef.current = streamProofread(documentId, {
      onIssue: onIssueReceived,
      onComplete: (total) => {
        console.log('%c[PROOFREADING] Complete', 'color: #4CAF50; font-weight: bold;', { total })
        onProofreadComplete()
        abortRef.current = null
      },
      onError: (error) => {
        console.error('[PROOFREADING] Error:', error)
        onProofreadComplete()
        abortRef.current = null
      }
    })
  }, [documentId, onProofreadStart, onIssueReceived, onProofreadComplete])

  const handleIssueClick = useCallback((issue: ProofreadingIssue) => {
    console.log('%c[USER ACTION] Issue clicked - highlighting in document', 'color: #2196F3; font-weight: bold;', {
      find: issue.find,
    })
    setSelectedIssueId(issue.id)
    onHighlightIssue(issue)
  }, [onHighlightIssue])

  const handleApply = useCallback((issue: ProofreadingIssue, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent issue click handler
    console.log('%c[USER ACTION] Apply issue', 'color: #9C27B0; font-weight: bold;', issue)
    onApplyIssue(issue)
    onDismissIssue(issue.id)
  }, [onApplyIssue, onDismissIssue])

  const handleDismiss = useCallback((issueId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent issue click handler
    console.log('%c[USER ACTION] Dismiss issue', 'color: #9C27B0; font-weight: bold;', { issueId })
    onDismissIssue(issueId)
    if (selectedIssueId === issueId) {
      setSelectedIssueId(null)
    }
  }, [onDismissIssue, selectedIssueId])

  // Group issues by category
  const groupedIssues = issues.reduce((acc, issue) => {
    const category = issue.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(issue)
    return acc
  }, {} as Record<string, ProofreadingIssue[]>)

  return (
    <div className="proofreading-panel">
      <div className="panel-header">
        <h2>Proofreading</h2>
        <button
          className="refresh-btn"
          onClick={handleStartProofread}
          disabled={isLoading}
          title="Run proofreading"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={isLoading ? 'spinning' : ''}
          >
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
          </svg>
        </button>
      </div>

      <div className="panel-content">
        {isLoading ? (
          <div className="panel-loading">
            <div className="loading-spinner-small" />
            <span>Analyzing document...</span>
            {issues.length > 0 && (
              <span className="issue-count-live">{issues.length} issues found</span>
            )}
          </div>
        ) : issues.length === 0 ? (
          <div className="no-issues">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>No issues found!</span>
            <button className="start-btn" onClick={handleStartProofread}>
              Run Proofreading
            </button>
          </div>
        ) : (
          <>
            <div className="issue-summary">
              <span className="count">{issues.length}</span>
              <span>issue{issues.length !== 1 ? 's' : ''} found</span>
            </div>
            
            <div className="issues-list">
              {Object.entries(groupedIssues).map(([category, categoryIssues]) => {
                const categoryInfo = getCategoryInfo(category as ProofreadingIssue['category'])
                return (
                  <div key={category} className="issue-category">
                    <div 
                      className="category-header"
                      style={{ borderLeftColor: categoryInfo.color }}
                    >
                      <span className="category-label">{categoryInfo.label}</span>
                      <span className="category-count">{categoryIssues.length}</span>
                    </div>
                    
                    {categoryIssues.map((issue) => {
                      const severityInfo = getSeverityInfo(issue.severity)
                      const isSelected = selectedIssueId === issue.id
                      return (
                        <div 
                          key={issue.id} 
                          className={`issue-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleIssueClick(issue)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && handleIssueClick(issue)}
                        >
                          <div className="issue-header">
                            <span 
                              className="severity-badge"
                              style={{ backgroundColor: severityInfo.color }}
                            >
                              {severityInfo.label}
                            </span>
                            {isSelected && (
                              <span className="selected-indicator" title="Highlighted in document">
                                👁
                              </span>
                            )}
                          </div>
                          
                          <div className="issue-content">
                            <div className="issue-find">
                              <span className="label">Found:</span>
                              <code className="text">{issue.find}</code>
                            </div>
                            
                            {issue.replace && (
                              <div className="issue-replace">
                                <span className="label">Replace with:</span>
                                <code className="text correct">{issue.replace}</code>
                              </div>
                            )}
                            
                            <p className="issue-explanation">{issue.explanation}</p>
                          </div>
                          
                          <div className="issue-actions">
                            {issue.type === 'replacement' && issue.replace && (
                              <button 
                                className="btn-apply"
                                onClick={(e) => handleApply(issue, e)}
                                title="Apply this fix to the document"
                              >
                                Apply Fix
                              </button>
                            )}
                            <button 
                              className="btn-dismiss"
                              onClick={(e) => handleDismiss(issue.id, e)}
                              title="Dismiss this issue"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <div className="panel-footer">
        <p className="panel-hint">
          Click an issue to highlight it in the document.
        </p>
      </div>
    </div>
  )
}
