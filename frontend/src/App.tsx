import { useState } from 'react'
import FileUpload from './components/FileUpload'
import DocumentEditor from './components/DocumentEditor'
import Sidebar from './components/Sidebar'
import type { SpellError } from './api/spellcheck'
import './App.css'

export interface Document {
  id: string
  filename: string
  url: string
}

function App() {
  const [document, setDocument] = useState<Document | null>(null)
  const [spellErrors, setSpellErrors] = useState<SpellError[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleUpload = (doc: Document) => {
    setDocument(doc)
    setSpellErrors([])
  }

  const handleSpellcheck = (errors: SpellError[]) => {
    setSpellErrors(errors)
  }

  const handleClose = () => {
    setDocument(null)
    setSpellErrors([])
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1 className="logo">Paralegal</h1>
          <span className="tagline">Document Proofreading</span>
        </div>
        {document && (
          <div className="header-actions">
            <span className="document-name">{document.filename}</span>
            <button className="btn btn-secondary" onClick={handleClose}>
              Close
            </button>
          </div>
        )}
      </header>

      <main className="main">
        {!document ? (
          <FileUpload onUpload={handleUpload} />
        ) : (
          <div className="editor-layout">
            <div className="editor-container">
              <DocumentEditor
                document={document}
                onSpellcheck={handleSpellcheck}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            </div>
            <Sidebar
              spellErrors={spellErrors}
              isLoading={isLoading}
              documentId={document.id}
              onRefresh={() => {
                setIsLoading(true)
              }}
              onSelectDocument={handleUpload}
              onDocumentDeleted={handleClose}
            />
          </div>
        )}
      </main>
    </div>
  )
}

export default App

