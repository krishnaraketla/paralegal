import { useState, useEffect } from 'react'
import { listDocuments, type StoredDocument } from '../api/documents'
import type { Document } from '../App'
import './DocumentsPanel.css'

interface DocumentsPanelProps {
  onSelectDocument: (doc: Document) => void
}

export default function DocumentsPanel({ onSelectDocument }: DocumentsPanelProps) {
  const [documents, setDocuments] = useState<StoredDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
              <button
                key={doc.id}
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

