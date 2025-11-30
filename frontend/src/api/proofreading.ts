/**
 * Proofreading API with SSE streaming support
 * Connects to the agent service for multi-agent proofreading
 */

export interface ProofreadingIssue {
  id: string
  type: 'replacement' | 'comment' | 'highlight'
  category: 'spelling' | 'grammar' | 'consistency' | 'formatting'
  severity: 'error' | 'warning' | 'suggestion'
  find: string
  replace?: string
  paragraph_hint?: number
  explanation: string
}

export interface ProofreadingStatus {
  message: string
  agent?: string
}

export interface ProofreadingCallbacks {
  onIssue: (issue: ProofreadingIssue) => void
  onStatus?: (status: ProofreadingStatus) => void
  onComplete: (total: number) => void
  onError?: (error: string) => void
}

// Agent service URL (separate from main backend)
const AGENT_URL = import.meta.env.VITE_AGENT_URL || 'http://localhost:8001'

/**
 * Stream proofreading issues from the agent service using Server-Sent Events.
 * Returns an abort function to cancel the stream.
 */
export function streamProofread(
  documentId: string,
  callbacks: ProofreadingCallbacks
): () => void {
  const url = `${AGENT_URL}/proofread/${documentId}`
  
  console.log('%c[SSE] Starting proofreading stream', 'color: #2196F3; font-weight: bold;', { url })
  
  const eventSource = new EventSource(url)
  
  // Handle status events (agent thinking/progress)
  eventSource.addEventListener('status', (event) => {
    try {
      const status: ProofreadingStatus = JSON.parse(event.data)
      console.log('%c[SSE] Status update', 'color: #9C27B0;', status)
      callbacks.onStatus?.(status)
    } catch (e) {
      console.error('[SSE] Failed to parse status:', e)
    }
  })
  
  // Handle issue events
  eventSource.addEventListener('issue', (event) => {
    try {
      const issue: ProofreadingIssue = JSON.parse(event.data)
      console.log('%c[SSE] Issue received', 'color: #4CAF50;', issue)
      callbacks.onIssue(issue)
    } catch (e) {
      console.error('[SSE] Failed to parse issue:', e)
    }
  })
  
  // Handle completion
  eventSource.addEventListener('done', (event) => {
    try {
      const data = JSON.parse(event.data)
      console.log('%c[SSE] Proofreading complete', 'color: #2196F3; font-weight: bold;', data)
      callbacks.onComplete(data.total || 0)
    } catch (e) {
      console.error('[SSE] Failed to parse done event:', e)
      callbacks.onComplete(0)
    }
    eventSource.close()
  })
  
  // Handle errors
  eventSource.addEventListener('error', (event) => {
    // Check if this is a custom error event from our backend
    if (event instanceof MessageEvent && event.data) {
      try {
        const data = JSON.parse(event.data)
        console.error('%c[SSE] Backend error', 'color: #f44336;', data)
        callbacks.onError?.(data.error || 'Unknown error')
      } catch {
        console.error('%c[SSE] Connection error', 'color: #f44336;')
        callbacks.onError?.('Connection error')
      }
    } else {
      // Connection error
      console.error('%c[SSE] Connection error', 'color: #f44336;', event)
      callbacks.onError?.('Connection error')
    }
    eventSource.close()
  })
  
  // Return abort function
  return () => {
    console.log('%c[SSE] Aborting proofreading stream', 'color: #FF9800;')
    eventSource.close()
  }
}

/**
 * Get category display info
 */
export function getCategoryInfo(category: ProofreadingIssue['category']) {
  switch (category) {
    case 'spelling':
      return { label: 'Spelling', color: '#e74c3c' }
    case 'grammar':
      return { label: 'Grammar', color: '#f39c12' }
    case 'consistency':
      return { label: 'Fact/Logic', color: '#9b59b6' }
    case 'formatting':
      return { label: 'Formatting', color: '#3498db' }
    default:
      return { label: 'Other', color: '#95a5a6' }
  }
}

/**
 * Get severity display info
 */
export function getSeverityInfo(severity: ProofreadingIssue['severity']) {
  switch (severity) {
    case 'error':
      return { label: 'Error', color: '#e74c3c', icon: '✕' }
    case 'warning':
      return { label: 'Warning', color: '#f39c12', icon: '!' }
    case 'suggestion':
      return { label: 'Suggestion', color: '#3498db', icon: '💡' }
    default:
      return { label: 'Info', color: '#95a5a6', icon: 'i' }
  }
}

