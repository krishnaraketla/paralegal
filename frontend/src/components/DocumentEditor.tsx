import { useEffect, useState, useRef, useCallback } from 'react'
import { getOnlyOfficeConfig } from '../api/onlyoffice'
import type { Document } from '../App'
import './DocumentEditor.css'

interface DocumentEditorProps {
  document: Document
}

const ONLYOFFICE_URL = import.meta.env.VITE_ONLYOFFICE_URL || 'http://localhost:8080'

export default function DocumentEditor({ document }: DocumentEditorProps) {
  const [error, setError] = useState<string | null>(null)
  const [iframeKey, setIframeKey] = useState(() => `iframe-${document.id}-${Date.now()}`)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const configLoadedRef = useRef(false)

  // Reset iframe when document changes
  useEffect(() => {
    configLoadedRef.current = false
    setIframeKey(`iframe-${document.id}-${Date.now()}`)
    setError(null)
  }, [document.id])

  // Load config and send to iframe
  const loadAndSendConfig = useCallback(async () => {
    // Guard against duplicate loads
    if (configLoadedRef.current) return
    configLoadedRef.current = true

    const editorId = `editor-${document.id}-${Date.now()}`
    
    try {
      const config = await getOnlyOfficeConfig(document.id, document.filename, editorId)
      
      // Send config to iframe
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: 'INIT_EDITOR',
          config,
          documentServerUrl: ONLYOFFICE_URL,
          editorId,
        }, '*')
      }
      
      setError(null)
    } catch (err) {
      console.error('Config error:', err)
      setError('Failed to load document configuration')
      configLoadedRef.current = false // Allow retry on error
    }
  }, [document.id, document.filename])

  // Handle messages from iframe
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const data = event.data
      
      switch (data.type) {
        case 'IFRAME_READY':
          loadAndSendConfig()
          break
        case 'EDITOR_ERROR':
          console.error('OnlyOffice editor error:', data.error)
          setError('An error occurred while loading the editor')
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [loadAndSendConfig])

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

  return (
    <div className="editor-wrapper">
      <div className="editor-container">
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src="/editor.html"
          title="Document Editor"
          className="editor-iframe"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  )
}
