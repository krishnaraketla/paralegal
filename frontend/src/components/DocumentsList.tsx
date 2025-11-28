import { useState, useEffect, useCallback } from 'react'
import { listDocuments, uploadDocument, deleteDocument, type DocumentResponse } from '../api/documents'
import './DocumentsList.css'

interface DocumentsListProps {
  caseId: string
  caseName: string
  onSelectDocument: (doc: DocumentResponse) => void
}

export default function DocumentsList({ caseId, caseName, onSelectDocument }: DocumentsListProps) {
  const [documents, setDocuments] = useState<DocumentResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  const fetchDocuments = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const docs = await listDocuments(caseId)
      setDocuments(docs)
    } catch (err) {
      console.error('Failed to fetch documents:', err)
      setError('Failed to load documents')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [caseId])

  // Auto-reset confirm state after 2 seconds
  useEffect(() => {
    if (confirmingDeleteId) {
      const timer = setTimeout(() => {
        setConfirmingDeleteId(null)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [confirmingDeleteId])

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setUploadError('Please upload a .docx file')
      return
    }

    setUploadError(null)
    setIsUploading(true)

    try {
      await uploadDocument(caseId, file)
      await fetchDocuments()
    } catch (err) {
      setUploadError('Failed to upload file. Please try again.')
      console.error('Upload error:', err)
    } finally {
      setIsUploading(false)
    }
  }, [caseId])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }, [handleFile])

  const handleDeleteClick = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation()
    
    if (confirmingDeleteId === docId) {
      setConfirmingDeleteId(null)
      setDeletingId(docId)
      
      try {
        await deleteDocument(docId)
        await fetchDocuments()
      } catch (err) {
        console.error('Failed to delete document:', err)
        setError('Failed to delete document')
      } finally {
        setDeletingId(null)
      }
    } else {
      setConfirmingDeleteId(docId)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="list-container">
        <div className="list-loading">
          <div className="loading-spinner" />
          <span>Loading documents...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="list-container">
        <div className="list-error">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
          <button className="btn btn-secondary" onClick={fetchDocuments}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="list-container">
      <div className="list-header">
        <div className="list-header-info">
          <h2 className="list-title">Documents</h2>
          <span className="list-count">{documents.length} document{documents.length !== 1 ? 's' : ''} in {caseName}</span>
        </div>
        <label className="btn btn-primary upload-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Upload Document
          <input
            type="file"
            accept=".docx"
            onChange={handleInputChange}
            disabled={isUploading}
            className="upload-input"
          />
        </label>
      </div>

      {/* Upload dropzone */}
      <div
        className={`upload-dropzone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isUploading ? (
          <>
            <div className="loading-spinner" />
            <span>Uploading...</span>
          </>
        ) : (
          <>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Drop .docx files here to upload</span>
          </>
        )}
      </div>

      {uploadError && (
        <div className="upload-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {uploadError}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="list-empty">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <h3>No documents yet</h3>
          <p>Upload your first document to get started</p>
        </div>
      ) : (
        <div className="file-list">
          {/* Column headers */}
          <div className="file-list-header">
            <div className="col-name">Name</div>
            <div className="col-date">Date Added</div>
            <div className="col-date">Date Modified</div>
            <div className="col-kind">Kind</div>
            <div className="col-actions"></div>
          </div>

          {/* File rows */}
          <div className="file-list-body">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="file-row"
                onClick={() => onSelectDocument(doc)}
              >
                <div className="col-name">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="file-name">{doc.original_filename}</span>
                </div>
                <div className="col-date">{formatDate(doc.created_at)}</div>
                <div className="col-date">{formatDate(doc.updated_at)}</div>
                <div className="col-kind">Word Document</div>
                <div className="col-actions">
                  <button
                    className={`delete-btn ${confirmingDeleteId === doc.id ? 'confirming' : ''}`}
                    onClick={(e) => handleDeleteClick(e, doc.id)}
                    disabled={deletingId === doc.id}
                    title={confirmingDeleteId === doc.id ? 'Click to confirm' : 'Delete document'}
                  >
                    {deletingId === doc.id ? (
                      <div className="loading-spinner-small" />
                    ) : confirmingDeleteId === doc.id ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
