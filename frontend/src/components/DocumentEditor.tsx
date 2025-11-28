import { useEffect, useState, useRef, useCallback, useImperativeHandle, forwardRef } from 'react'
import { getOnlyOfficeConfig } from '../api/onlyoffice'
import type { Document } from '../App'
import type { ProofreadingIssue } from '../api/proofreading'
import './DocumentEditor.css'

interface DocumentEditorProps {
  document: Document
}

export interface DocumentEditorRef {
  applyIssue: (issue: ProofreadingIssue) => void
  searchAndSelect: (text: string) => void
}

const ONLYOFFICE_URL = import.meta.env.VITE_ONLYOFFICE_URL || 'http://localhost:8080'

const DocumentEditor = forwardRef<DocumentEditorRef, DocumentEditorProps>(
  function DocumentEditor({ document }, ref) {
    const [error, setError] = useState<string | null>(null)
    const [pluginReady, setPluginReady] = useState(false)
    const [iframeKey, setIframeKey] = useState(() => `iframe-${document.id}-${Date.now()}`)
    const iframeRef = useRef<HTMLIFrameElement | null>(null)
    const configLoadedRef = useRef(false)

    // Reset iframe when document changes
    useEffect(() => {
      configLoadedRef.current = false
      setPluginReady(false)
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

    // Apply an issue to the document via iframe (uses Automation API)
    const applyIssue = useCallback((issue: ProofreadingIssue) => {
      if (iframeRef.current?.contentWindow) {
        console.log('%c[EDITOR] Sending APPLY_ISSUE to iframe', 'color: #9C27B0; font-weight: bold;', issue)
        iframeRef.current.contentWindow.postMessage({
          type: 'APPLY_ISSUE',
          issue
        }, '*')
      } else {
        console.warn('[EDITOR] Cannot apply issue - iframe not ready')
      }
    }, [])

    // Search and select text in the document (uses plugin)
    const searchAndSelect = useCallback((text: string) => {
      if (iframeRef.current?.contentWindow) {
        console.log('%c[EDITOR] Sending SEARCH_AND_SELECT to iframe', 'color: #2196F3; font-weight: bold;', { text })
        iframeRef.current.contentWindow.postMessage({
          type: 'SEARCH_AND_SELECT',
          text
        }, '*')
      } else {
        console.warn('[EDITOR] Cannot search - iframe not ready')
      }
    }, [])

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      applyIssue,
      searchAndSelect
    }), [applyIssue, searchAndSelect])

    // Handle messages from iframe
    useEffect(() => {
      function handleMessage(event: MessageEvent) {
        const data = event.data
        
        switch (data.type) {
          case 'IFRAME_READY':
            loadAndSendConfig()
            break
          case 'PLUGIN_READY':
            console.log('%c[EDITOR] Plugin ready for communication', 'color: #4CAF50; font-weight: bold;')
            setPluginReady(true)
            break
          case 'CONNECTOR_READY':
            console.log('%c[EDITOR] Automation API connector ready', 'color: #4CAF50; font-weight: bold;')
            break
          case 'CONNECTOR_UNAVAILABLE':
            console.log('[EDITOR] Automation API unavailable, using plugin instead:', data.reason)
            break
          case 'SEARCH_AND_SELECT_SENT':
            console.log('%c[EDITOR] Search command sent to plugin', 'color: #2196F3;', data.text)
            break
          case 'SEARCH_AND_SELECT_ERROR':
            console.warn('[EDITOR] Search failed:', data.error)
            break
          case 'APPLY_ISSUE_RESULT':
            if (data.success) {
              console.log('%c[EDITOR] Issue applied successfully', 'color: #4CAF50;', data.issueId)
            } else {
              console.warn('[EDITOR] Issue application failed:', data.error)
            }
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
        {pluginReady && (
          <div className="plugin-status" title="Plugin connected">
            <span className="status-dot"></span>
          </div>
        )}
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
)

export default DocumentEditor
