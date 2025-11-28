import { api } from './client'
import { getDefaultUserId } from './defaults'

export interface DocumentResponse {
  id: string
  case_id: string
  original_filename: string
  created_by: string
  created_at: string
  updated_at: string
  url: string
}

// Legacy type for backwards compatibility
export interface StoredDocument {
  id: string
  filename: string
  url: string
}

export interface UploadResponse {
  id: string
  filename: string
  stored_filename: string
  url: string
}

export async function uploadDocument(caseId: string, file: File): Promise<DocumentResponse> {
  const userId = await getDefaultUserId()
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post<DocumentResponse>(
    `/api/documents?case_id=${caseId}&created_by=${userId}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )

  return response.data
}

export async function listDocuments(caseId: string): Promise<DocumentResponse[]> {
  const response = await api.get<DocumentResponse[]>(`/api/documents?case_id=${caseId}`)
  return response.data
}

export async function getDocument(docId: string): Promise<DocumentResponse> {
  const response = await api.get<DocumentResponse>(`/api/documents/${docId}`)
  return response.data
}

export async function deleteDocument(docId: string): Promise<void> {
  await api.delete(`/api/documents/${docId}`)
}

// Helper to convert to legacy format if needed
export function toStoredDocument(doc: DocumentResponse): StoredDocument {
  return {
    id: doc.id,
    filename: doc.original_filename,
    url: doc.url,
  }
}
