import { useEffect, useState, useRef, useCallback } from 'react'
import { DocumentEditor as OnlyOfficeEditor } from '@onlyoffice/document-editor-react'
import { getOnlyOfficeConfig } from '../api/onlyoffice'
import { getSpellcheck, type SpellError } from '../api/spellcheck'
import type { Document } from '../App'
import './DocumentEditor.css'

interface DocumentEditorProps {
  document: Document
  onSpellcheck: (errors: SpellError[]) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

const ONLYOFFICE_URL = import.meta.env.VITE_ONLYOFFICE_URL || 'http://localhost:8080'

export default function DocumentEditor({ 
  document, 
  onSpellcheck,
  isLoading,
  setIsLoading 
}: DocumentEditorProps) {
  const [config, setConfig] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editorReady, setEditorReady] = useState(false)
  const [editorKey, setEditorKey] = useState(0)
  const spellcheckRan = useRef(false)

  useEffect(() => {
    async function loadConfig() {
      try {
        // Reset editor state when document changes
        setEditorReady(false)
        setConfig(null)
        
        const configData = await getOnlyOfficeConfig(document.id)
        setConfig(configData as unknown as Record<string, unknown>)
        setError(null)
        // Force editor remount with new key to avoid DOM conflicts
        setEditorKey(prev => prev + 1)
      } catch (err) {
        setError('Failed to load document configuration')
        console.error('Config error:', err)
      }
    }

    loadConfig()
    spellcheckRan.current = false
  }, [document.id])

  useEffect(() => {
    async function runSpellcheck() {
      if (!editorReady || spellcheckRan.current) return
      
      spellcheckRan.current = true
      setIsLoading(true)
      
      try {
        const result = await getSpellcheck(document.id)
        onSpellcheck(result.errors)
      } catch (err) {
        console.error('Spellcheck error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    runSpellcheck()
  }, [editorReady, document.id, onSpellcheck, setIsLoading])

  // Memoize callbacks to prevent unnecessary re-renders
  const handleDocumentReady = useCallback(() => {
    setEditorReady(true)
  }, [])

  const handleError = useCallback((event: object) => {
    console.error('ONLYOFFICE error:', event)
    setError('An error occurred while loading the editor')
  }, [])

  if (error) {
    return (
      <div className="editor-error">
        <div className="error-content">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h3>Failed to Load Editor</h3>
          <p>{error}</p>
          <p className="error-hint">
            Make sure ONLYOFFICE Document Server is running at {ONLYOFFICE_URL}
          </p>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="editor-loading">
        <div className="loading-spinner" />
        <span>Loading document...</span>
      </div>
    )
  }

  return (
    <div className="editor-wrapper">
      <div key={`editor-${document.id}-${editorKey}`} className="editor-container">
        <OnlyOfficeEditor
          id="docEditor"
          documentServerUrl={ONLYOFFICE_URL}
          config={config}
          events_onDocumentReady={handleDocumentReady}
          events_onError={handleError}
        />
      </div>
    </div>
  )
}
