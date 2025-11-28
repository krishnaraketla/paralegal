import { useState } from 'react'
import UserHome from './components/UserHome'
import DocumentEditor from './components/DocumentEditor'
import Sidebar from './components/Sidebar'
import type { DocumentResponse } from './api/documents'
import type { SpellError } from './api/spellcheck'
import './App.css'

// Document type for the editor (compatible with both old and new API)
export interface Document {
  id: string
  filename: string
  url: string
}

function App() {
  const [document, setDocument] = useState<Document | null>(null)
  const [spellErrors, setSpellErrors] = useState<SpellError[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSelectDocument = (doc: DocumentResponse) => {
    setDocument({
      id: doc.id,
      filename: doc.original_filename,
      url: doc.url,
    })
    setSpellErrors([])
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
          <UserHome onSelectDocument={handleSelectDocument} />
        ) : (
          <div className="editor-layout">
            <div className="editor-container">
              <DocumentEditor
                key={document.id}
                document={document}
              />
            </div>
            <Sidebar
              spellErrors={spellErrors}
              isLoading={isLoading}
              documentId={document.id}
              onRefresh={() => {
                setIsLoading(true)
              }}
            />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
