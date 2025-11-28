// API Client
export { api } from './client'

// Defaults API
export {
  getDefaults,
  getDefaultUserId,
  getDefaultOrgId,
  type DefaultsResponse,
} from './defaults'

// Organizations API
export {
  listOrganizations,
  getOrganization,
  createOrganization,
  deleteOrganization,
  type Organization,
} from './organizations'

// Cases API
export {
  listCases,
  getCase,
  createCase,
  deleteCase,
  type Case,
  type CreateCaseRequest,
} from './cases'

// Documents API
export {
  uploadDocument,
  listDocuments,
  getDocument,
  deleteDocument,
  toStoredDocument,
  type DocumentResponse,
  type StoredDocument,
  type UploadResponse,
} from './documents'

// Spellcheck API (legacy)
export {
  getSpellcheck,
  type SpellError,
  type SpellcheckResponse,
} from './spellcheck'

// Proofreading API (SSE streaming)
export {
  streamProofread,
  getCategoryInfo,
  getSeverityInfo,
  type ProofreadingIssue,
  type ProofreadingCallbacks,
} from './proofreading'

// OnlyOffice API
export {
  getOnlyOfficeConfig,
  type OnlyOfficeConfig,
} from './onlyoffice'
