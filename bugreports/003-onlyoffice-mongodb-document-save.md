# Feature Report 003: OnlyOffice Document Save to MongoDB

**Date:** 2025-11-28  
**Type:** Feature Implementation  
**Status:** Implemented  

---

## Summary

Enabled document saving from OnlyOffice editor back to MongoDB GridFS, allowing edits made in the browser-based editor to persist and be available to other users/applications that access the database directly.

---

## Background

The paralegal application uses:
- **OnlyOffice Document Server** for browser-based DOCX editing
- **MongoDB GridFS** for document storage
- **FastAPI backend** to bridge the two systems

Documents were being loaded correctly from MongoDB into OnlyOffice, but saves were failing with a "Connection refused" error.

---

## Problem Analysis

### Symptom
When users attempted to save documents in OnlyOffice, they received:
> "An error occurred while saving the file. Please use the 'Download as' option to save the file to a drive or try again later."

### Root Cause
The OnlyOffice callback mechanism was failing due to a Docker networking issue:

1. When a document is saved, OnlyOffice sends a callback to the backend with a `url` field containing the location to download the updated document
2. OnlyOffice was sending URLs like: `http://localhost:8080/cache/files/data/.../output.docx`
3. The backend container tried to fetch from `localhost:8080`, but inside the container, `localhost` refers to the backend container itself—not the OnlyOffice container
4. Result: `Connection refused` error

### Error Log Evidence
```
Error saving document: HTTPConnectionPool(host='localhost', port=8080): Max retries exceeded 
with url: /cache/files/data/...output.docx 
(Caused by NewConnectionError: Failed to establish a new connection: [Errno 111] Connection refused)
```

---

## Solution

### Implementation
Modified the OnlyOffice callback handler to rewrite the download URL, replacing `localhost:8080` with the Docker service name `onlyoffice`.

### Code Change
**File:** `backend/app/routers/onlyoffice.py`

```python
# Status 2 or 6 means document is ready for saving
if status in [2, 6]:
    download_url = body.get("url")
    
    if not download_url:
        return JSONResponse(content={"error": 1}, status_code=200)
    
    # Rewrite localhost URLs to use Docker internal network hostname
    # OnlyOffice sends URLs with localhost:8080, but from the backend container
    # we need to use the Docker service name 'onlyoffice' to reach it
    download_url = download_url.replace("localhost:8080", "onlyoffice")
    download_url = download_url.replace("127.0.0.1:8080", "onlyoffice")
    
    try:
        # Download the updated document from ONLYOFFICE
        response = requests.get(download_url, timeout=30)
        # ... rest of save logic
```

---

## Document Save Flow (After Fix)

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐     ┌─────────────┐
│  User edits │────▶│ OnlyOffice      │────▶│ Backend     │────▶│ MongoDB     │
│  & saves    │     │ sends callback  │     │ downloads & │     │ GridFS      │
│             │     │ with status 2/6 │     │ stores file │     │             │
└─────────────┘     └─────────────────┘     └─────────────┘     └─────────────┘
                           │                       │
                           │  url: localhost:8080  │
                           │  ──────────────────▶  │
                           │                       │
                           │  Rewritten to:        │
                           │  url: onlyoffice      │
                           │  ──────────────────▶  │
                           │                       ▼
                           │              ┌─────────────────┐
                           │              │ GET from        │
                           │              │ onlyoffice/     │
                           │              │ cache/files/... │
                           │              └─────────────────┘
```

---

## OnlyOffice Callback Status Codes

| Status | Meaning |
|--------|---------|
| 0 | No document with the key identifier could be found |
| 1 | Document is being edited |
| 2 | Document is ready for saving |
| 3 | Document saving error has occurred |
| 4 | Document is closed with no changes |
| 6 | Document is being edited, but current state is saved (forcesave) |
| 7 | Error has occurred while force saving the document |

The save handler triggers on status **2** (document closed and ready to save) and status **6** (forcesave while editing).

---

## Testing

1. Open a document in the OnlyOffice editor
2. Make edits to the document
3. Save using Ctrl+S or the save button
4. Verify in backend logs: successful callback without "Connection refused" error
5. Another user/application downloading the document from MongoDB should see the changes

---

## Configuration Dependencies

The following configurations in `docker-compose.yml` enable this feature:

```yaml
backend:
  environment:
    - BACKEND_URL=http://backend:8000
    # BACKEND_DOCKER_URL defaults to http://host.docker.internal:8000
    # This is used for the callbackUrl sent to OnlyOffice
```

The OnlyOffice editor config includes:
```python
"customization": {
    "autosave": True,
    "forcesave": True,  # Enables immediate save callbacks
    # ...
}
```

---

## Alternative Solutions Considered

1. **Configure OnlyOffice DS_SERVER_HOST** - Would require adding environment variable to OnlyOffice container and restart
2. **Use host.docker.internal everywhere** - Less reliable across different Docker environments
3. **URL rewriting in backend (chosen)** - Simple, no container restart required, works immediately

---

## Related Files

- `backend/app/routers/onlyoffice.py` - Callback handler and config generation
- `backend/app/routers/storage.py` - File retrieval from GridFS
- `backend/app/routers/documents.py` - Document CRUD operations
- `backend/app/database.py` - MongoDB/GridFS connection management

