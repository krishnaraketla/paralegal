import { useState } from 'react'
import type { Document } from '../App'
import type { SpellError } from '../api/spellcheck'
import SpellcheckPanel from './SpellcheckPanel'
import DocumentsPanel from './DocumentsPanel'
import './Sidebar.css'

type Tool = 'documents' | 'spellcheck' | 'proofreader' | 'summarizer'

interface SidebarProps {
  spellErrors: SpellError[]
  isLoading: boolean
  documentId: string
  onRefresh: () => void
  onSelectDocument: (doc: Document) => void
  onDocumentDeleted: () => void
}

export default function Sidebar({ 
  spellErrors, 
  isLoading, 
  documentId,
  onRefresh,
  onSelectDocument,
  onDocumentDeleted
}: SidebarProps) {
  const [activeTool, setActiveTool] = useState<Tool>('documents')

  const handleToolChange = (toolId: Tool) => {
    console.log('%c[USER ACTION] Sidebar tool changed', 'color: #9C27B0; font-weight: bold;', {
      previousTool: activeTool,
      newTool: toolId,
    })
    setActiveTool(toolId)
  }

  const tools: { id: Tool; label: string; icon: JSX.Element }[] = [
    {
      id: 'documents',
      label: 'Documents',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      )
    },
    {
      id: 'spellcheck',
      label: 'Spellcheck',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v6" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
          <path d="M5 10l7 10 7-10" />
          <path d="M17 17l4 4" />
          <path d="M21 17l-4 4" />
        </svg>
      )
    },
    {
      id: 'proofreader',
      label: 'Proofreader',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    },
    {
      id: 'summarizer',
      label: 'Summarizer',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      )
    }
  ]

  const renderPanel = () => {
    switch (activeTool) {
      case 'documents':
        return (
          <DocumentsPanel 
            onSelectDocument={onSelectDocument}
            currentDocumentId={documentId}
            onDocumentDeleted={onDocumentDeleted}
          />
        )
      case 'spellcheck':
        return (
          <SpellcheckPanel
            errors={spellErrors}
            isLoading={isLoading}
            documentId={documentId}
            onRefresh={onRefresh}
          />
        )
      case 'proofreader':
        return (
          <div className="coming-soon-panel">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <h3>Proofreader</h3>
            <p>AI-powered proofreading agents coming soon.</p>
          </div>
        )
      case 'summarizer':
        return (
          <div className="coming-soon-panel">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
            <h3>Summarizer</h3>
            <p>Document summarization coming soon.</p>
          </div>
        )
    }
  }

  return (
    <aside className="sidebar">
      <nav className="sidebar-rail">
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`rail-btn ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => handleToolChange(tool.id)}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </nav>
      <div className="sidebar-panel">
        {renderPanel()}
      </div>
    </aside>
  )
}

