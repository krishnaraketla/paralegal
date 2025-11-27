import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface UploadResponse {
  id: string
  filename: string
  stored_filename: string
  url: string
}

export interface SpellError {
  word: string
  suggestions: string[]
  paragraph: number
  context: string
}

export interface SpellcheckResponse {
  document_id: string
  error_count: number
  errors: SpellError[]
}

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

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post<UploadResponse>('/api/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

export async function getSpellcheck(documentId: string): Promise<SpellcheckResponse> {
  const response = await api.get<SpellcheckResponse>(`/api/spellcheck/${documentId}`)
  return response.data
}

export async function getOnlyOfficeConfig(documentId: string): Promise<OnlyOfficeConfig> {
  const response = await api.get<OnlyOfficeConfig>(`/api/onlyoffice/config/${documentId}`)
  return response.data
}

export async function deleteDocument(documentId: string): Promise<void> {
  await api.delete(`/api/documents/${documentId}`)
}

export interface StoredDocument {
  id: string
  filename: string
  url: string
}

export interface ListDocumentsResponse {
  documents: StoredDocument[]
}

export async function listDocuments(): Promise<StoredDocument[]> {
  const response = await api.get<ListDocumentsResponse>('/api/documents')
  return response.data.documents
}

