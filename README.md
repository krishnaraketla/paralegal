# Paralegal - Document Proofreading MVP

A document proofreading tool that allows users to upload DOCX files, run spellcheck, and edit documents using ONLYOFFICE Docs.

## Features

- **Upload DOCX files** - Drag and drop or browse to upload Word documents
- **Custom Spellcheck** - Backend spellcheck with suggestions displayed in a sidebar
- **ONLYOFFICE Editor** - Full WYSIWYG document editing with built-in spellcheck
- **Track Changes** - Review mode enabled for tracking document edits
- **Auto-save** - Documents are automatically saved via ONLYOFFICE callbacks

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│  React Frontend │────▶│  Python Backend │────▶│ ONLYOFFICE Document │
│  (Port 3000)    │     │  (Port 8000)    │     │ Server (Port 8080)  │
└─────────────────┘     └─────────────────┘     └─────────────────────┘
```

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.11+ (for local backend development)

## Quick Start with Docker

1. **Start all services:**
   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - ONLYOFFICE: http://localhost:8080

3. **Upload a DOCX file and start editing!**

## Local Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### ONLYOFFICE Document Server

Run ONLYOFFICE separately with Docker:

```bash
docker run -d -p 8080:80 --name onlyoffice-docs onlyoffice/documentserver
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/documents/upload` | POST | Upload a DOCX file |
| `GET /api/documents/{id}` | GET | Get document metadata |
| `GET /api/spellcheck/{id}` | GET | Run spellcheck on a document |
| `POST /api/onlyoffice/callback` | POST | ONLYOFFICE save callback |
| `GET /api/onlyoffice/config/{id}` | GET | Get ONLYOFFICE editor config |

## Environment Variables

### Backend
- `STORAGE_PATH` - Path to store uploaded documents (default: `./storage`)
- `ONLYOFFICE_URL` - ONLYOFFICE Document Server URL (default: `http://localhost:8080`)
- `BACKEND_URL` - Backend URL for callbacks (default: `http://localhost:8000`)

### Frontend
- `VITE_API_URL` - Backend API URL (default: `http://localhost:8000`)
- `VITE_ONLYOFFICE_URL` - ONLYOFFICE Document Server URL (default: `http://localhost:8080`)

## Project Structure

```
paralegal/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Configuration
│   │   ├── routers/
│   │   │   ├── documents.py     # Document upload/download
│   │   │   ├── spellcheck.py    # Spellcheck API
│   │   │   └── onlyoffice.py    # ONLYOFFICE callbacks
│   │   └── services/
│   │       ├── spellcheck.py    # Spellcheck logic
│   │       └── docx_parser.py   # DOCX parsing utilities
│   ├── storage/                 # Uploaded documents
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── FileUpload.tsx
│   │   │   ├── DocumentEditor.tsx
│   │   │   ├── SpellcheckSidebar.tsx
│   │   │   └── SpellcheckItem.tsx
│   │   ├── api/
│   │   │   └── documents.ts
│   │   └── hooks/
│   │       └── useSpellcheck.ts
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

## Notes

- ONLYOFFICE Document Server requires significant resources (~2GB RAM minimum)
- JWT is disabled for development; enable it in production
- The spellcheck sidebar shows custom backend results; ONLYOFFICE also provides built-in red underlines

