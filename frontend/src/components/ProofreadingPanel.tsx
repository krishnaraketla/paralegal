import { useRef, useCallback, useState } from 'react'
import { 
  streamProofread, 
  getCategoryInfo, 
  getSeverityInfo,
  type ProofreadingIssue,
  type ProofreadingStatus,
} from '../api/proofreading'
import { ChainOfThought, type ChainOfThoughtStep } from '@/components/ui/chain-of-thought'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
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
  const [status, setStatus] = useState<ProofreadingStatus | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Initialize all categories as expanded when issues change
  const initializeExpandedCategories = useCallback((newIssues: ProofreadingIssue[]) => {
    const categories = new Set(newIssues.map(i => i.category))
    setExpandedCategories(categories)
  }, [])

  const handleStartProofread = useCallback(() => {
    console.log('%c[USER ACTION] Starting proofreading', 'color: #9C27B0; font-weight: bold;', {
      documentId,
    })
    
    // Abort any existing stream
    if (abortRef.current) {
      abortRef.current()
    }
    
    setSelectedIssueId(null)
    setStatus(null)
    setExpandedCategories(new Set())
    onProofreadStart()
    
    abortRef.current = streamProofread(documentId, {
      onIssue: (issue) => {
        onIssueReceived(issue)
        // Auto-expand the category when first issue of that type arrives
        setExpandedCategories(prev => new Set([...prev, issue.category]))
      },
      onStatus: (newStatus) => {
        setStatus(newStatus)
      },
      onComplete: (total) => {
        console.log('%c[PROOFREADING] Complete', 'color: #4CAF50; font-weight: bold;', { total })
        setStatus(null)
        onProofreadComplete()
        abortRef.current = null
      },
      onError: (error) => {
        console.error('[PROOFREADING] Error:', error)
        setStatus({ message: `Error: ${error}` })
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

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  // Group issues by category
  const groupedIssues = issues.reduce((acc, issue) => {
    const category = issue.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(issue)
    return acc
  }, {} as Record<string, ProofreadingIssue[]>)

  // Build chain of thought steps based on status
  const getChainOfThoughtSteps = (): ChainOfThoughtStep[] => {
    const steps: ChainOfThoughtStep[] = []
    
    // Base step - always show document extraction
    const extracting = status?.message?.toLowerCase().includes('extract') || 
                       status?.message?.toLowerCase().includes('fetch')
    const analyzing = status?.message?.toLowerCase().includes('analyz') ||
                      status?.message?.toLowerCase().includes('checking') ||
                      status?.message?.toLowerCase().includes('agent')
    
    steps.push({
      text: "Extracting document text...",
      status: !status ? 'loading' : (extracting ? 'loading' : 'completed')
    })
    
    steps.push({
      text: status?.agent ? `${status.agent} analyzing...` : "Analyzing content...",
      status: !status ? 'pending' : (analyzing ? 'loading' : (extracting ? 'pending' : 'completed'))
    })
    
    if (issues.length > 0) {
      steps.push({
        text: `Found ${issues.length} issue${issues.length !== 1 ? 's' : ''}`,
        status: 'completed'
      })
    }
    
    return steps
  }

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
            <ChainOfThought steps={getChainOfThoughtSteps()} className="w-full" />
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
                const isExpanded = expandedCategories.has(category)
                
                return (
                  <Collapsible
                    key={category}
                    open={isExpanded}
                    onOpenChange={() => toggleCategory(category)}
                    className="issue-category"
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        className="category-header w-full"
                        style={{ borderLeftColor: categoryInfo.color }}
                      >
                        <span className="category-label">{categoryInfo.label}</span>
                        <ChevronDown 
                          className={cn(
                            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                            isExpanded && "rotate-180"
                          )}
                        />
                        <span className="category-count">{categoryIssues.length}</span>
                      </button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                      <div className="category-issues">
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
                    </CollapsibleContent>
                  </Collapsible>
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
