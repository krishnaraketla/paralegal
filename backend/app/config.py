import os
from pathlib import Path

# Storage configuration
STORAGE_PATH = Path(os.getenv("STORAGE_PATH", "./storage"))
STORAGE_PATH.mkdir(parents=True, exist_ok=True)

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

