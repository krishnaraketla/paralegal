from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import STORAGE_PATH
from app.routers import documents, spellcheck, onlyoffice

app = FastAPI(
    title="Paralegal API",
    description="Document proofreading and editing API",
    version="1.0.0"
)

# CORS configuration - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount storage for serving documents
app.mount("/storage", StaticFiles(directory=str(STORAGE_PATH)), name="storage")

# Include routers
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(spellcheck.router, prefix="/api/spellcheck", tags=["spellcheck"])
app.include_router(onlyoffice.router, prefix="/api/onlyoffice", tags=["onlyoffice"])


@app.get("/health")
async def health_check():
    return {"status": "healthy"}

