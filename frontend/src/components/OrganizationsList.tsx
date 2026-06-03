import { useState, useEffect } from 'react'
import { listOrganizations, createOrganization, type Organization } from '../api/organizations'
import CreateModal from './CreateModal'
import './OrganizationsList.css'

interface OrganizationsListProps {
  onSelectOrg: (org: Organization) => void
}

export default function OrganizationsList({ onSelectOrg }: OrganizationsListProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchOrganizations = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const orgs = await listOrganizations()
      setOrganizations(orgs)
    } catch (err) {
      console.error('Failed to fetch organizations:', err)
      setError('Failed to load organizations')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const handleCreate = async (name: string) => {
    await createOrganization(name)
    await fetchOrganizations()
  }

  if (isLoading) {
    return (
      <div className="list-container">
        <div className="list-loading">
          <div className="loading-spinner" />
          <span>Loading organizations...</span>
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
          <button className="btn btn-secondary" onClick={fetchOrganizations}>
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
          <h2 className="list-title">Organizations</h2>
          <span className="list-count">{organizations.length} organization{organizations.length !== 1 ? 's' : ''}</span>
        </div>
        <button className="btn btn-ghost" onClick={() => setIsModalOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Organization
        </button>
      </div>

      {organizations.length === 0 ? (
        <div className="list-empty">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <h3>No organizations yet</h3>
          <p>Create your first organization to get started</p>
          <button className="btn btn-ghost" onClick={() => setIsModalOpen(true)}>
            Create Organization
          </button>
        </div>
      ) : (
        <div className="list-grid">
          {organizations.map((org) => (
            <button
              key={org.id}
              className="list-card"
              onClick={() => onSelectOrg(org)}
            >
              <div className="card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div className="card-content">
                <span className="card-title">{org.name}</span>
                <span className="card-meta">
                  Created {new Date(org.created_at).toLocaleDateString()}
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
        title="Create Organization"
        nameLabel="Organization Name"
        namePlaceholder="Enter organization name..."
      />
    </div>
  )
}

