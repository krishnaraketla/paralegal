import { useState, useCallback, useRef } from 'react'
import UserHome from './components/UserHome'
import DocumentEditor from './components/DocumentEditor'
import Sidebar from './components/Sidebar'
import type { DocumentResponse } from './api/documents'
import type { ProofreadingIssue } from './api/proofreading'
import './App.css'

// Document type for the editor (compatible with both old and new API)
export interface Document {
  id: string
  filename: string
  url: string
}

function App() {
  const [document, setDocument] = useState<Document | null>(null)
  const [issues, setIssues] = useState<ProofreadingIssue[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const editorRef = useRef<{ applyIssue: (issue: ProofreadingIssue) => void } | null>(null)

  const handleSelectDocument = (doc: DocumentResponse) => {
    setDocument({
      id: doc.id,
      filename: doc.original_filename,
      url: doc.url,
    })
    setIssues([])
    setIsLoading(false)
  }

  const handleClose = () => {
    setDocument(null)
    setIssues([])
    setIsLoading(false)
  }

  const handleProofreadStart = useCallback(() => {
    setIsLoading(true)
    setIssues([])
  }, [])

  const handleIssueReceived = useCallback((issue: ProofreadingIssue) => {
    setIssues(prev => [...prev, issue])
  }, [])

  const handleProofreadComplete = useCallback(() => {
    setIsLoading(false)
  }, [])

  const handleApplyIssue = useCallback((issue: ProofreadingIssue) => {
    if (editorRef.current) {
      editorRef.current.applyIssue(issue)
    }
  }, [])

  const handleDismissIssue = useCallback((issueId: string) => {
    setIssues(prev => prev.filter(i => i.id !== issueId))
  }, [])

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1 className="logo">Paralegal</h1>
          <span className="tagline">Document Proofreading</span>
        </div>
        {document && (
          <div className="header-actions">
            <span className="document-name">{document.filename}</span>
            <button className="btn btn-secondary" onClick={handleClose}>
              Close
            </button>
          </div>
        )}
      </header>

      <main className="main">
        {!document ? (
          <UserHome onSelectDocument={handleSelectDocument} />
        ) : (
          <div className="editor-layout">
            <div className="editor-container">
              <DocumentEditor
                key={document.id}
                document={document}
                ref={editorRef}
              />
            </div>
            <Sidebar
              issues={issues}
              isLoading={isLoading}
              documentId={document.id}
              onProofreadStart={handleProofreadStart}
              onIssueReceived={handleIssueReceived}
              onProofreadComplete={handleProofreadComplete}
              onApplyIssue={handleApplyIssue}
              onDismissIssue={handleDismissIssue}
            />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
