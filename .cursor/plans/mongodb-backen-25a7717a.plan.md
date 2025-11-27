<!-- 25a7717a-8f64-4e33-b1fa-69a5968c3c01 9bb3a257-b734-406d-b03d-fb41eebe20bf -->
# MongoDB Backend Architecture Plan

## Data Model

```
Users
├── _id: ObjectId
├── email: string (unique)
├── name: string
└── created_at: datetime

Organizations
├── _id: ObjectId
├── name: string
├── created_by: ObjectId (ref: Users)
└── created_at: datetime

Memberships (users <-> orgs many-to-many)
├── _id: ObjectId
├── user_id: ObjectId
├── organization_id: ObjectId
└── joined_at: datetime

Cases
├── _id: ObjectId
├── organization_id: ObjectId
├── name: string
├── description: string
├── created_by: ObjectId
└── created_at: datetime

Documents
├── _id: ObjectId
├── case_id: ObjectId
├── original_filename: string
├── gridfs_file_id: ObjectId
├── created_by: ObjectId
├── created_at: datetime
└── updated_at: datetime
```

## Key Implementation Details

### MongoDB Setup

- Use **Motor** (async MongoDB driver) with existing FastAPI
- Add `motor` and `pymongo` to requirements (pymongo already present)
- Atlas connection string via `MONGODB_URI` env var
- Create indexes on foreign keys and `email`

### GridFS File Storage

- Replace filesystem storage with GridFS
- Replace `StaticFiles` mount with dynamic streaming endpoint at `/storage/{doc_id}`
- OnlyOffice callback will download and save to GridFS instead of filesystem

### Key File Changes

| File | Changes |

|------|---------|

| [backend/app/config.py](backend/app/config.py) | Add `MONGODB_URI`, remove `STORAGE_PATH` |

| [backend/app/database.py](backend/app/database.py) | **New** - Motor client, GridFS setup |

| [backend/app/models/](backend/app/models/) | Pydantic models for each entity |

| [backend/app/routers/documents.py](backend/app/routers/documents.py) | Rewrite: CRUD with MongoDB + GridFS |

| [backend/app/routers/onlyoffice.py](backend/app/routers/onlyoffice.py) | Update callback to save to GridFS |

| [backend/app/main.py](backend/app/main.py) | Remove StaticFiles, add `/storage/{doc_id}` streaming route, add new routers |

| [docker-compose.yml](docker-compose.yml) | Add `MONGODB_URI` env var, remove `document_storage` volume |

### New Routers

- `routers/users.py` - User CRUD (minimal for MVP)
- `routers/organizations.py` - Org CRUD + membership management
- `routers/cases.py` - Case CRUD within orgs

### MVP Default Data

- Seed a default user on startup: `Default User <default@paralegal.local>`
- Seed a default organization: `Default Organization`
- Auto-assign default user to default org

### API Structure (proposed)

```
GET/POST   /api/users
GET/POST   /api/organizations
POST       /api/organizations/{org_id}/members  (add user)
GET/POST   /api/organizations/{org_id}/cases
GET/POST   /api/cases/{case_id}/documents
GET        /storage/{doc_id}  (stream from GridFS)
```

## What You Still Need to Think About

1. **Atlas Setup**: Create a free M0 cluster, get connection string
2. **Frontend Updates**: Will need to update document fetching to include case context
3. **Document Listing**: Currently lists all docs - will need to scope by case
4. **Auth (later)**: When ready, add JWT auth, protect routes, use real user context

## Out of Scope for This Plan

- Authentication/login (MVP uses default user)
- Role-based permissions
- Document versioning
- Frontend changes (separate task)

### To-dos

- [ ] Create database.py with Motor client, GridFS, and connection management
- [ ] Create Pydantic models for User, Organization, Membership, Case, Document
- [ ] Create users router with basic CRUD
- [ ] Create organizations router with CRUD and membership management
- [ ] Create cases router scoped to organizations
- [ ] Rewrite documents router to use MongoDB + GridFS, scoped to cases
- [ ] Update OnlyOffice callback to save files to GridFS
- [ ] Replace StaticFiles with streaming endpoint for GridFS files
- [ ] Add startup event to seed default user and organization
- [ ] Update config.py and docker-compose.yml with MongoDB settings