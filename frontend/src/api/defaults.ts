import { api } from './client'

export interface DefaultsResponse {
  user_id: string
  organization_id: string
}

let cachedDefaults: DefaultsResponse | null = null

export async function getDefaults(): Promise<DefaultsResponse> {
  if (cachedDefaults) {
    return cachedDefaults
  }
  
  const response = await api.get<DefaultsResponse>('/api/defaults')
  cachedDefaults = response.data
  return cachedDefaults
}

export async function getDefaultUserId(): Promise<string> {
  const defaults = await getDefaults()
  return defaults.user_id
}

export async function getDefaultOrgId(): Promise<string> {
  const defaults = await getDefaults()
  return defaults.organization_id
}

