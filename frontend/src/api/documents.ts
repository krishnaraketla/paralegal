import { api } from './client'

export interface UploadResponse {
  id: string
  filename: string
  stored_filename: string
  url: string
}

export interface StoredDocument {
  id: string
  filename: string
  url: string
}

export interface ListDocumentsResponse {
  documents: StoredDocument[]
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

export async function listDocuments(): Promise<StoredDocument[]> {
  const response = await api.get<ListDocumentsResponse>('/api/documents')
  return response.data.documents
}

export async function deleteDocument(documentId: string): Promise<void> {
  await api.delete(`/api/documents/${documentId}`)
}
