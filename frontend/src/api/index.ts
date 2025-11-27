// API Client
export { api } from './client'

// Documents API
export {
  uploadDocument,
  listDocuments,
  deleteDocument,
  type UploadResponse,
  type StoredDocument,
  type ListDocumentsResponse,
} from './documents'

// Spellcheck API
export {
  getSpellcheck,
  type SpellError,
  type SpellcheckResponse,
} from './spellcheck'

// OnlyOffice API
export {
  getOnlyOfficeConfig,
  type OnlyOfficeConfig,
} from './onlyoffice'

