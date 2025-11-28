"""
Main FastAPI application
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Database
from app.seed import seed_default_data
from app.routers import documents, spellcheck, onlyoffice, users, organizations, cases, storage


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - connect to DB on startup, disconnect on shutdown"""
    # Startup
    await Database.connect()
    await seed_default_data()
    yield
    # Shutdown
    await Database.disconnect()


app = FastAPI(
    title="Paralegal API",
    description="Document proofreading and editing API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(organizations.router, prefix="/api/organizations", tags=["organizations"])
app.include_router(cases.router, prefix="/api/cases", tags=["cases"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(spellcheck.router, prefix="/api/spellcheck", tags=["spellcheck"])
app.include_router(onlyoffice.router, prefix="/api/onlyoffice", tags=["onlyoffice"])

# Storage endpoint for serving files from GridFS
app.include_router(storage.router, prefix="/storage", tags=["storage"])


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/api/defaults")
async def get_defaults():
    """Get default user and organization IDs for MVP"""
    from app.seed import get_default_user_id, get_default_org_id
    
    return {
        "user_id": await get_default_user_id(),
        "organization_id": await get_default_org_id(),
    }
