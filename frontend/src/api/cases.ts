import { api } from './client'
import { getDefaultUserId } from './defaults'

export interface Case {
  id: string
  organization_id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
}

export interface CreateCaseRequest {
  name: string
  description?: string
}

export async function listCases(orgId: string): Promise<Case[]> {
  const response = await api.get<Case[]>(`/api/cases?org_id=${orgId}`)
  return response.data
}

export async function getCase(caseId: string): Promise<Case> {
  const response = await api.get<Case>(`/api/cases/${caseId}`)
  return response.data
}

export async function createCase(orgId: string, data: CreateCaseRequest): Promise<Case> {
  const userId = await getDefaultUserId()
  const response = await api.post<Case>(
    `/api/cases?org_id=${orgId}&created_by=${userId}`,
    data
  )
  return response.data
}

export async function deleteCase(caseId: string): Promise<void> {
  await api.delete(`/api/cases/${caseId}`)
}

