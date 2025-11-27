import { useState, useEffect } from 'react'
import { listDocuments, deleteDocument, type StoredDocument } from '../api/documents'
import type { Document } from '../App'
import './DocumentsPanel.css'

interface DocumentsPanelProps {
  onSelectDocument: (doc: Document) => void
  currentDocumentId?: string
  onDocumentDeleted?: () => void
}

export default function DocumentsPanel({ 
  onSelectDocument, 
  currentDocumentId,
  onDocumentDeleted 
}: DocumentsPanelProps) {
  const [documents, setDocuments] = useState<StoredDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const docs = await listDocuments()
        setDocuments(docs)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch documents:', err)
        setError('Failed to load documents')
      } finally {
        setIsLoading(false)
      }
    }
    fetchDocuments()
  }, [])

  // Auto-reset confirm state after 2 seconds
  useEffect(() => {
    if (confirmingDeleteId) {
      const timer = setTimeout(() => {
        setConfirmingDeleteId(null)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [confirmingDeleteId])

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      const docs = await listDocuments()
      setDocuments(docs)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch documents:', err)
      setError('Failed to load documents')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = (doc: StoredDocument) => {
    onSelectDocument({
      id: doc.id,
      filename: doc.filename,
      url: doc.url,
    })
  }

  const handleDeleteClick = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation()
    
    // If already confirming this doc, execute delete
    if (confirmingDeleteId === docId) {
      setConfirmingDeleteId(null)
      setDeletingId(docId)
      
      try {
        await deleteDocument(docId)
        
        // If the deleted document is currently open, close it
        if (docId === currentDocumentId && onDocumentDeleted) {
          onDocumentDeleted()
        }
        
        // Refresh the documents list
        const docs = await listDocuments()
        setDocuments(docs)
      } catch (err) {
        console.error('Failed to delete document:', err)
        setError('Failed to delete document')
      } finally {
        setDeletingId(null)
      }
    } else {
      // First click - show confirm state
      setConfirmingDeleteId(docId)
    }
  }

  return (
    <div className="documents-panel">
      <div className="panel-header">
        <h2>Documents</h2>
        <button 
          className="refresh-btn" 
          onClick={handleRefresh}
          disabled={isLoading}
          title="Refresh documents"
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
            <span>Loading documents...</span>
          </div>
        ) : error ? (
          <div className="panel-error">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
            <button className="retry-btn" onClick={handleRefresh}>
              Try Again
            </button>
          </div>
        ) : documents.length === 0 ? (
          <div className="no-documents">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span>No documents yet</span>
            <p>Upload a document to get started</p>
          </div>
        ) : (
          <div className="documents-list">
            {documents.map((doc) => (
              <div key={doc.id} className="document-item-wrapper">
                <button
                  className="document-item"
                  onClick={() => handleSelect(doc)}
                >
                  <div className="document-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <div className="document-info">
                    <span className="document-name">{doc.filename}</span>
                    <span className="document-id">{doc.id.slice(0, 8)}...</span>
                  </div>
                  <div className="document-arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </button>
                <button
                  className={`delete-btn ${confirmingDeleteId === doc.id ? 'confirming' : ''}`}
                  onClick={(e) => handleDeleteClick(e, doc.id)}
                  disabled={deletingId === doc.id}
                  title={confirmingDeleteId === doc.id ? 'Click to confirm' : 'Delete document'}
                >
                  {deletingId === doc.id ? (
                    <div className="loading-spinner-small" />
                  ) : confirmingDeleteId === doc.id ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

