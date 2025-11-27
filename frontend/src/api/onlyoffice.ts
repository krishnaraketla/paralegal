import { api } from './client'

export interface OnlyOfficeConfig {
  document: {
    fileType: string
    key: string
    title: string
    url: string
    permissions: {
      edit: boolean
      download: boolean
      print: boolean
      review: boolean
      comment: boolean
    }
  }
  editorConfig: {
    mode: string
    callbackUrl: string
    lang: string
    customization: Record<string, unknown>
  }
  documentType: string
}

export async function getOnlyOfficeConfig(
  documentId: string, 
  filename?: string,
  sessionKey?: string
): Promise<OnlyOfficeConfig> {
  const params: Record<string, string> = {}
  if (filename) params.filename = filename
  if (sessionKey) params.session_key = sessionKey
  
  const response = await api.get<OnlyOfficeConfig>(`/api/onlyoffice/config/${documentId}`, { params })
  return response.data
}

