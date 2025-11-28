<!-- 25a7717a-8f64-4e33-b1fa-69a5968c3c01 96bf380d-2bff-4198-b1ec-2255f2646980 -->
# Frontend User Home Navigation Plan

## Overview

Replace the `FileUpload` component with a `UserHome` component that provides navigation:

**Organizations → Cases → Documents** with breadcrumbs.

## Navigation Structure

```
Home (Organizations list)
├── Create Organization button
└── [Organization] 
    ├── Breadcrumb: Home > Org Name
    ├── Create Case button  
    └── [Case]
        ├── Breadcrumb: Home > Org Name > Case Name
        ├── Upload Document button
        └── [Document] → Opens in Editor
```

## New Components

| Component | Purpose |

|-----------|---------|

| `UserHome.tsx` | Container with navigation state and breadcrumbs |

| `Breadcrumbs.tsx` | Clickable breadcrumb trail |

| `OrganizationsList.tsx` | List organizations, create new |

| `CasesList.tsx` | List cases in an org, create new |

| `DocumentsList.tsx` | List documents in a case, upload new |

| `CreateModal.tsx` | Reusable modal for creating org/case |

## New API Clients

Create `frontend/src/api/` files:

- `organizations.ts` - CRUD for organizations
- `cases.ts` - CRUD for cases  
- `defaults.ts` - Fetch default user/org IDs

Update `documents.ts` to use new endpoints with `case_id`.

## State Management

`UserHome` manages navigation state:

```typescript
type View = 
  | { level: 'organizations' }
  | { level: 'cases', orgId: string, orgName: string }
  | { level: 'documents', orgId: string, orgName: string, caseId: string, caseName: string }
```

Breadcrumbs derived from this state.

## Key Changes to Existing Files

| File | Changes |

|------|---------|

| [App.tsx](frontend/src/App.tsx) | Replace `FileUpload` with `UserHome`, pass `onSelectDocument` |

| [documents.ts](frontend/src/api/documents.ts) | Update to use new API (requires `case_id`) |

| [DocumentsPanel.tsx](frontend/src/components/DocumentsPanel.tsx) | Update to fetch by case_id or remove (functionality in UserHome) |

## Design Notes

- Keep existing warm cream/beige color palette
- Cards for each item with hover states
- Empty states with helpful prompts
- Loading states while fetching
- Modal dialogs for create forms

### To-dos

- [x] Create database.py with Motor client, GridFS, and connection management
- [x] Create Pydantic models for User, Organization, Membership, Case, Document
- [x] Create users router with basic CRUD
- [x] Create organizations router with CRUD and membership management
- [x] Create cases router scoped to organizations
- [x] Rewrite documents router to use MongoDB + GridFS, scoped to cases
- [x] Update OnlyOffice callback to save files to GridFS
- [x] Replace StaticFiles with streaming endpoint for GridFS files
- [x] Add startup event to seed default user and organization
- [x] Update config.py and docker-compose.yml with MongoDB settings
- [x] Create database.py with Motor client, GridFS, and connection management
- [ ] Create API clients: organizations.ts, cases.ts, defaults.ts
- [ ] Update documents.ts API to work with case_id parameter
- [ ] Create Breadcrumbs component
- [ ] Create reusable CreateModal component for org/case creation
- [ ] Create OrganizationsList component
- [ ] Create CasesList component
- [ ] Create DocumentsList component with upload
- [ ] Create UserHome container component with navigation state
- [ ] Update App.tsx to use UserHome instead of FileUpload
- [ ] Remove or repurpose FileUpload and old DocumentsPanel