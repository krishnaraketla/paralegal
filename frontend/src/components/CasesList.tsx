import { useState, useEffect } from 'react'
import { listCases, createCase, type Case } from '../api/cases'
import CreateModal from './CreateModal'
import './CasesList.css'

interface CasesListProps {
  orgId: string
  orgName: string
  onSelectCase: (caseItem: Case) => void
}

export default function CasesList({ orgId, orgName, onSelectCase }: CasesListProps) {
  const [cases, setCases] = useState<Case[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchCases = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const casesList = await listCases(orgId)
      setCases(casesList)
    } catch (err) {
      console.error('Failed to fetch cases:', err)
      setError('Failed to load cases')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCases()
  }, [orgId])

  const handleCreate = async (name: string, description?: string) => {
    await createCase(orgId, { name, description })
    await fetchCases()
  }

  if (isLoading) {
    return (
      <div className="list-container">
        <div className="list-loading">
          <div className="loading-spinner" />
          <span>Loading cases...</span>
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
          <button className="btn btn-secondary" onClick={fetchCases}>
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
          <h2 className="list-title">Cases</h2>
          <span className="list-count">{cases.length} case{cases.length !== 1 ? 's' : ''} in {orgName}</span>
        </div>
        <button className="btn btn-ghost" onClick={() => setIsModalOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Case
        </button>
      </div>

      {cases.length === 0 ? (
        <div className="list-empty">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <h3>No cases yet</h3>
          <p>Create your first case to organize documents</p>
          <button className="btn btn-ghost" onClick={() => setIsModalOpen(true)}>
            Create Case
          </button>
        </div>
      ) : (
        <div className="list-grid">
          {cases.map((caseItem) => (
            <button
              key={caseItem.id}
              className="list-card"
              onClick={() => onSelectCase(caseItem)}
            >
              <div className="card-icon case-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="card-content">
                <span className="card-title">{caseItem.name}</span>
                {caseItem.description && (
                  <span className="card-description">{caseItem.description}</span>
                )}
                <span className="card-meta">
                  Created {new Date(caseItem.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="card-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}

      <CreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreate}
        title="Create Case"
        nameLabel="Case Name"
        namePlaceholder="Enter case name..."
        showDescription={true}
        descriptionLabel="Description"
        descriptionPlaceholder="Enter case description (optional)..."
      />
    </div>
  )
}

