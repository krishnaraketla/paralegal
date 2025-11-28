import { api } from './client'
import { getDefaultUserId } from './defaults'

export interface Organization {
  id: string
  name: string
  created_by: string
  created_at: string
}

export async function listOrganizations(): Promise<Organization[]> {
  const response = await api.get<Organization[]>('/api/organizations')
  return response.data
}

export async function getOrganization(orgId: string): Promise<Organization> {
  const response = await api.get<Organization>(`/api/organizations/${orgId}`)
  return response.data
}

export async function createOrganization(name: string): Promise<Organization> {
  const userId = await getDefaultUserId()
  const response = await api.post<Organization>(
    `/api/organizations?created_by=${userId}`,
    { name }
  )
  return response.data
}

export async function deleteOrganization(orgId: string): Promise<void> {
  await api.delete(`/api/organizations/${orgId}`)
}

