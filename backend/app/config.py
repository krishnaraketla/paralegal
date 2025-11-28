import os

# MongoDB configuration
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "paralegal")

# ONLYOFFICE configuration
ONLYOFFICE_URL = os.getenv("ONLYOFFICE_URL", "http://localhost:8080")

# Backend URL (for ONLYOFFICE callbacks)
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# JWT secret for ONLYOFFICE Document Server
# This must match the secret configured in OnlyOffice Document Server
# Run: docker exec onlyoffice-docs sudo documentserver-jwt-status.sh to get the secret
ONLYOFFICE_JWT_SECRET = os.getenv("ONLYOFFICE_JWT_SECRET", "")

# URL that OnlyOffice (in Docker) uses to reach the backend
# Use host.docker.internal on Mac/Windows to reach host from Docker container
BACKEND_DOCKER_URL = os.getenv("BACKEND_DOCKER_URL", "http://host.docker.internal:8000")

# Allowed file extensions
ALLOWED_EXTENSIONS = {".docx"}

# Gemini AI configuration for spellcheck
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

