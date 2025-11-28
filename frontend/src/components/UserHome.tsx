import { useState, useMemo } from 'react'
import Breadcrumbs, { type BreadcrumbItem } from './Breadcrumbs'
import OrganizationsList from './OrganizationsList'
import CasesList from './CasesList'
import DocumentsList from './DocumentsList'
import type { Organization } from '../api/organizations'
import type { Case } from '../api/cases'
import type { DocumentResponse } from '../api/documents'
import './UserHome.css'

// Navigation view types
type OrganizationsView = { level: 'organizations' }
type CasesView = { level: 'cases'; org: Organization }
type DocumentsView = { level: 'documents'; org: Organization; case: Case }
type NavigationView = OrganizationsView | CasesView | DocumentsView

interface UserHomeProps {
  onSelectDocument: (doc: DocumentResponse) => void
}

export default function UserHome({ onSelectDocument }: UserHomeProps) {
  const [view, setView] = useState<NavigationView>({ level: 'organizations' })

  // Build breadcrumbs based on current view
  const breadcrumbs: BreadcrumbItem[] = useMemo(() => {
    const items: BreadcrumbItem[] = []

    // Home is always first
    items.push({
      label: 'Home',
      onClick: view.level !== 'organizations' 
        ? () => setView({ level: 'organizations' })
        : undefined,
    })

    if (view.level === 'cases' || view.level === 'documents') {
      items.push({
        label: view.org.name,
        onClick: view.level !== 'cases'
          ? () => setView({ level: 'cases', org: view.org })
          : undefined,
      })
    }

    if (view.level === 'documents') {
      items.push({
        label: view.case.name,
      })
    }

    return items
  }, [view])

  // Handle organization selection
  const handleSelectOrg = (org: Organization) => {
    setView({ level: 'cases', org })
  }

  // Handle case selection
  const handleSelectCase = (caseItem: Case) => {
    if (view.level === 'cases') {
      setView({ level: 'documents', org: view.org, case: caseItem })
    }
  }

  // Handle document selection
  const handleSelectDocument = (doc: DocumentResponse) => {
    onSelectDocument(doc)
  }

  return (
    <div className="user-home">
      <div className="user-home-header">
        <Breadcrumbs items={breadcrumbs} />
      </div>

      <div className="user-home-content">
        {view.level === 'organizations' && (
          <OrganizationsList onSelectOrg={handleSelectOrg} />
        )}

        {view.level === 'cases' && (
          <CasesList
            orgId={view.org.id}
            orgName={view.org.name}
            onSelectCase={handleSelectCase}
          />
        )}

        {view.level === 'documents' && (
          <DocumentsList
            caseId={view.case.id}
            caseName={view.case.name}
            onSelectDocument={handleSelectDocument}
          />
        )}
      </div>
    </div>
  )
}

