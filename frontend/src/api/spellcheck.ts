import { api } from './client'

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

export async function getSpellcheck(documentId: string): Promise<SpellcheckResponse> {
  const response = await api.get<SpellcheckResponse>(`/api/spellcheck/${documentId}`)
  return response.data
}

