"""
Configuration for the proofreading agent service
"""
import os

# Google/Gemini API configuration
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

# Service configuration
AGENT_PORT = int(os.getenv("AGENT_PORT", "8001"))
STORAGE_PATH = os.getenv("STORAGE_PATH", "/app/storage")

# Backend API for document retrieval
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# MongoDB configuration (for direct document access)
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "paralegal")




