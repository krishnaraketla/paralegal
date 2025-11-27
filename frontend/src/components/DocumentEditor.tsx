import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
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
  const spellcheckRan = useRef(false)
  const editorInstanceRef = useRef<any | null>(null)
  
  // Generate a unique editor ID once per component mount
  // This ensures OnlyOffice gets a fresh instance each time
  const editorId = useMemo(() => `docEditor-${Date.now()}-${Math.random().toString(36).slice(2)}`, [])

  // Clean up OnlyOffice editor instance when this component unmounts
  useEffect(() => {
    return () => {
      try {
        // Prefer the instance we captured, but also fall back to the global map
        const globalEditor = (window as any)?.DocEditor
        const instanceFromRef = editorInstanceRef.current
        const instanceFromGlobal = globalEditor?.instances?.[editorId]
        const instance = instanceFromRef || instanceFromGlobal

        if (instance && typeof instance.destroyEditor === 'function') {
          instance.destroyEditor()
        }

        if (globalEditor?.instances && globalEditor.instances[editorId]) {
          delete globalEditor.instances[editorId]
        }
      } catch (cleanupError) {
        console.error('Failed to clean up ONLYOFFICE instance', cleanupError)
      } finally {
        editorInstanceRef.current = null
      }
    }
  }, [editorId])

  useEffect(() => {
    async function loadConfig() {
      try {
        setEditorReady(false)
        const configData = await getOnlyOfficeConfig(document.id, document.filename)
        setConfig(configData as unknown as Record<string, unknown>)
        setError(null)
      } catch (err) {
        setError('Failed to load document configuration')
        console.error('Config error:', err)
      }
    }

    loadConfig()
    spellcheckRan.current = false
  }, [document.id, document.filename])

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
  const handleAppReady = useCallback((instance: object) => {
    editorInstanceRef.current = instance
  }, [])

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
      <div className="editor-container">
        <OnlyOfficeEditor
          id={editorId}
          documentServerUrl={ONLYOFFICE_URL}
          config={config}
          events_onAppReady={handleAppReady}
          events_onDocumentReady={handleDocumentReady}
          events_onError={handleError}
        />
      </div>
    </div>
  )
}
