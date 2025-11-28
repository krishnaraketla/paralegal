import { useState } from 'react'
import type { ProofreadingIssue } from '../api/proofreading'
import ProofreadingPanel from './ProofreadingPanel'
import './Sidebar.css'

type Tool = 'proofreading' | 'summarizer'

interface SidebarProps {
  issues: ProofreadingIssue[]
  isLoading: boolean
  documentId: string
  onProofreadStart: () => void
  onIssueReceived: (issue: ProofreadingIssue) => void
  onProofreadComplete: () => void
  onApplyIssue: (issue: ProofreadingIssue) => void
  onDismissIssue: (issueId: string) => void
}

export default function Sidebar({ 
  issues, 
  isLoading, 
  documentId,
  onProofreadStart,
  onIssueReceived,
  onProofreadComplete,
  onApplyIssue,
  onDismissIssue,
}: SidebarProps) {
  const [activeTool, setActiveTool] = useState<Tool>('proofreading')

  const handleToolChange = (toolId: Tool) => {
    console.log('%c[USER ACTION] Sidebar tool changed', 'color: #9C27B0; font-weight: bold;', {
      previousTool: activeTool,
      newTool: toolId,
    })
    setActiveTool(toolId)
  }

  const tools: { id: Tool; label: string; icon: JSX.Element }[] = [
    {
      id: 'proofreading',
      label: 'Proofreading',
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
      case 'proofreading':
        return (
          <ProofreadingPanel
            issues={issues}
            isLoading={isLoading}
            documentId={documentId}
            onProofreadStart={onProofreadStart}
            onIssueReceived={onIssueReceived}
            onProofreadComplete={onProofreadComplete}
            onApplyIssue={onApplyIssue}
            onDismissIssue={onDismissIssue}
          />
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
