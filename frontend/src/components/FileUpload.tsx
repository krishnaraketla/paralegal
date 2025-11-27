import { useState, useCallback, useEffect } from 'react'
import { uploadDocument, listDocuments, type StoredDocument } from '../api/documents'
import type { Document } from '../App'
import './FileUpload.css'

interface FileUploadProps {
  onUpload: (document: Document) => void
}

export default function FileUpload({ onUpload }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingFiles, setExistingFiles] = useState<StoredDocument[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(true)

  useEffect(() => {
    async function fetchExistingFiles() {
      try {
        const files = await listDocuments()
        setExistingFiles(files)
      } catch (err) {
        console.error('Failed to fetch existing files:', err)
      } finally {
        setIsLoadingFiles(false)
      }
    }
    fetchExistingFiles()
  }, [])

  const handleFile = useCallback(async (file: File) => {
    console.log('%c[USER ACTION] File selected for upload', 'color: #9C27B0; font-weight: bold;', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    })

    if (!file.name.toLowerCase().endsWith('.docx')) {
      console.log('%c[USER ACTION] Upload rejected - invalid file type', 'color: #FF9800; font-weight: bold;', {
        fileName: file.name,
      })
      setError('Please upload a .docx file')
      return
    }

    setError(null)
    setIsUploading(true)

    try {
      const result = await uploadDocument(file)
      console.log('%c[USER ACTION] File upload successful', 'color: #9C27B0; font-weight: bold;', {
        documentId: result.id,
        filename: result.filename,
      })
      onUpload({
        id: result.id,
        filename: result.filename,
        url: result.url,
      })
    } catch (err) {
      setError('Failed to upload file. Please try again.')
      console.error('Upload error:', err)
    } finally {
      setIsUploading(false)
    }
  }, [onUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      console.log('%c[USER ACTION] File dropped', 'color: #9C27B0; font-weight: bold;', {
        fileName: file.name,
      })
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
  }, [handleFile])

  const handleSelectExisting = useCallback((file: StoredDocument) => {
    console.log('%c[USER ACTION] Existing file selected', 'color: #9C27B0; font-weight: bold;', {
      documentId: file.id,
      filename: file.filename,
    })
    onUpload({
      id: file.id,
      filename: file.filename,
      url: file.url,
    })
  }, [onUpload])

  return (
    <div className="upload-container">
      <div className="upload-content">
        <div
          className={`dropzone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            accept=".docx"
            onChange={handleInputChange}
            disabled={isUploading}
            id="file-input"
            className="file-input"
          />
          
          <div className="dropzone-content">
            {isUploading ? (
              <>
                <div className="upload-spinner" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <div className="upload-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <polyline points="9 15 12 12 15 15" />
                  </svg>
                </div>
                <span className="dropzone-text">
                  Drag and drop your <strong>.docx</strong> file here
                </span>
                <span className="dropzone-or">or</span>
                <label htmlFor="file-input" className="btn btn-primary">
                  Browse Files
                </label>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="upload-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* Existing Files Section */}
        {!isLoadingFiles && existingFiles.length > 0 && (
          <div className="existing-files-section">
            <div className="existing-files-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span>Or select from existing files</span>
            </div>
            <div className="existing-files-list">
              {existingFiles.map((file) => (
                <button
                  key={file.id}
                  className="existing-file-item"
                  onClick={() => handleSelectExisting(file)}
                >
                  <div className="file-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <div className="file-info">
                    <span className="file-name">{file.filename}</span>
                    <span className="file-id">{file.id.slice(0, 8)}...</span>
                  </div>
                  <div className="file-arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoadingFiles && (
          <div className="existing-files-loading">
            <div className="loading-spinner-small" />
            <span>Loading existing files...</span>
          </div>
        )}
      </div>
    </div>
  )
}

