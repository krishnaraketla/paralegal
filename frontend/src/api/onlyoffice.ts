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

export async function getOnlyOfficeConfig(documentId: string): Promise<OnlyOfficeConfig> {
  const response = await api.get<OnlyOfficeConfig>(`/api/onlyoffice/config/${documentId}`)
  return response.data
}

