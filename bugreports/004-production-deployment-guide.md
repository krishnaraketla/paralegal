# Deployment Guide 004: Production Configuration Changes

**Date:** 2025-11-28  
**Type:** Deployment Guide  
**Status:** Reference Document  

---

## Overview

This document outlines all configuration changes required when deploying the Paralegal application from localhost development to a production environment.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCTION SETUP                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐      ┌─────────────┐      ┌─────────────────────────┐    │
│   │  Frontend   │      │  Backend    │      │  OnlyOffice             │    │
│   │  (React)    │◄────►│  (FastAPI)  │◄────►│  Document Server        │    │
│   │             │      │             │      │                         │    │
│   │ app.com     │      │ api.app.com │      │ docs.app.com            │    │
│   └─────────────┘      └──────┬──────┘      └─────────────────────────┘    │
│                               │                                             │
│                               ▼                                             │
│                        ┌─────────────┐                                      │
│                        │  MongoDB    │                                      │
│                        │  Atlas      │                                      │
│                        └─────────────┘                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Environment Variables Summary

### Current Development Values → Production Values

| Variable | Development Value | Production Value |
|----------|-------------------|------------------|
| `VITE_API_URL` | `http://localhost:8000` | `https://api.yourdomain.com` |
| `VITE_ONLYOFFICE_URL` | `http://localhost:8080` | `https://docs.yourdomain.com` |
| `BACKEND_URL` | `http://backend:8000` | `https://api.yourdomain.com` |
| `BACKEND_DOCKER_URL` | `http://host.docker.internal:8000` | `https://api.yourdomain.com` |
| `ONLYOFFICE_URL` | `http://onlyoffice` | `https://docs.yourdomain.com` |
| `JWT_SECRET` | Development secret | **Strong production secret** |
| `MONGODB_URI` | Atlas dev cluster | Atlas production cluster |

---

## 2. Backend Configuration

### File: `backend/app/config.py`

All configuration is already environment-variable based, which is correct. No code changes needed.

### Production Environment Variables

```bash
# MongoDB - Use production cluster with proper credentials
MONGODB_URI=mongodb+srv://prod_user:SECURE_PASSWORD@prod-cluster.mongodb.net/?retryWrites=true&w=majority
DATABASE_NAME=paralegal_prod

# Backend URLs
# BACKEND_URL: Used for generating document download URLs in API responses
BACKEND_URL=https://api.yourdomain.com

# BACKEND_DOCKER_URL: URL that OnlyOffice uses to reach the backend
# CRITICAL: This must be accessible FROM the OnlyOffice container
BACKEND_DOCKER_URL=https://api.yourdomain.com

# OnlyOffice
ONLYOFFICE_URL=https://docs.yourdomain.com

# JWT Secret - MUST be changed in production
# Generate with: openssl rand -hex 32
ONLYOFFICE_JWT_SECRET=your-production-secret-here

# Gemini API
GEMINI_API_KEY=your-production-api-key
```

---

## 3. Frontend Configuration

### File: `frontend/.env.production`

Create this file for production builds:

```bash
VITE_API_URL=https://api.yourdomain.com
VITE_ONLYOFFICE_URL=https://docs.yourdomain.com
```

### Build Command

```bash
npm run build
```

Vite will automatically use `.env.production` during build.

---

## 4. Docker Compose for Production

### File: `docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  onlyoffice:
    image: onlyoffice/documentserver:latest
    container_name: onlyoffice-docs
    environment:
      - JWT_ENABLED=true
      - JWT_SECRET=${ONLYOFFICE_JWT_SECRET}
      - JWT_HEADER=Authorization
      # Use HTTPS in production
      - SSL_ENABLED=false  # Set to true if terminating SSL at this container
    volumes:
      - onlyoffice_data:/var/www/onlyoffice/Data
      - onlyoffice_logs:/var/log/onlyoffice
      - ./onlyoffice-plugin/paralegal:/var/www/onlyoffice/documentserver/sdkjs-plugins/paralegal
    restart: always
    # In production, expose via reverse proxy, not directly
    # ports:
    #   - "8080:80"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod  # Use production Dockerfile
    container_name: paralegal-backend
    environment:
      - MONGODB_URI=${MONGODB_URI}
      - DATABASE_NAME=${DATABASE_NAME}
      - BACKEND_URL=${BACKEND_URL}
      - BACKEND_DOCKER_URL=${BACKEND_DOCKER_URL}
      - ONLYOFFICE_URL=http://onlyoffice  # Internal Docker network
      - ONLYOFFICE_JWT_SECRET=${ONLYOFFICE_JWT_SECRET}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    depends_on:
      - onlyoffice
    restart: always
    # In production, expose via reverse proxy
    # ports:
    #   - "8000:8000"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod  # Use production Dockerfile with nginx
      args:
        - VITE_API_URL=${VITE_API_URL}
        - VITE_ONLYOFFICE_URL=${VITE_ONLYOFFICE_URL}
    container_name: paralegal-frontend
    restart: always

  # Reverse proxy for SSL termination and routing
  nginx:
    image: nginx:alpine
    container_name: paralegal-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
      - onlyoffice
    restart: always

volumes:
  onlyoffice_data:
  onlyoffice_logs:
```

---

## 5. CORS Configuration

### File: `backend/app/main.py`

Update CORS for production:

```python
# Production CORS configuration
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS[0] else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
```

### Environment Variable

```bash
ALLOWED_ORIGINS=https://app.yourdomain.com,https://docs.yourdomain.com
```

---

## 6. OnlyOffice Callback URL Handling

### Current Fix (Development)

The current URL rewriting in `onlyoffice.py` handles Docker internal networking:

```python
download_url = download_url.replace("localhost:8080", "onlyoffice")
download_url = download_url.replace("127.0.0.1:8080", "onlyoffice")
```

### Production Consideration

In production, OnlyOffice will likely use the public URL. Update the rewriting to handle your production domain:

```python
# Rewrite OnlyOffice download URLs for Docker internal network
# In production, OnlyOffice may use the public URL
download_url = download_url.replace("localhost:8080", "onlyoffice")
download_url = download_url.replace("127.0.0.1:8080", "onlyoffice")
download_url = download_url.replace("docs.yourdomain.com", "onlyoffice")
```

Or better, use an environment variable:

```python
import os
ONLYOFFICE_PUBLIC_URL = os.getenv("ONLYOFFICE_PUBLIC_URL", "localhost:8080")
ONLYOFFICE_INTERNAL_URL = os.getenv("ONLYOFFICE_INTERNAL_URL", "onlyoffice")

# In callback handler:
download_url = download_url.replace(ONLYOFFICE_PUBLIC_URL, ONLYOFFICE_INTERNAL_URL)
```

---

## 7. SSL/HTTPS Configuration

### Requirements

1. **Frontend**: Must be served over HTTPS
2. **Backend API**: Must be served over HTTPS
3. **OnlyOffice**: Must be served over HTTPS (or browser will block mixed content)

### Nginx Configuration Example

```nginx
# /nginx/nginx.conf

upstream frontend {
    server frontend:3000;
}

upstream backend {
    server backend:8000;
}

upstream onlyoffice {
    server onlyoffice:80;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name app.yourdomain.com api.yourdomain.com docs.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# Frontend
server {
    listen 443 ssl;
    server_name app.yourdomain.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}

# Backend API
server {
    listen 443 ssl;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    client_max_body_size 100M;  # For document uploads
    
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# OnlyOffice Document Server
server {
    listen 443 ssl;
    server_name docs.yourdomain.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    location / {
        proxy_pass http://onlyoffice;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 8. Security Checklist

### Before Deployment

- [ ] **JWT Secret**: Generate a new, strong secret for production
  ```bash
  openssl rand -hex 32
  ```

- [ ] **MongoDB Credentials**: Use production credentials with least-privilege access

- [ ] **API Keys**: Use production API keys (Gemini, etc.)

- [ ] **CORS Origins**: Restrict to specific domains

- [ ] **SSL Certificates**: Obtain and configure SSL certificates (Let's Encrypt recommended)

- [ ] **Environment Variables**: Never commit production secrets to git

- [ ] **Firewall Rules**: Only expose necessary ports (80, 443)

- [ ] **Rate Limiting**: Consider adding rate limiting to API endpoints

---

## 9. MongoDB Atlas Configuration

### Network Access

Add your production server IP to the Atlas IP whitelist:
- Atlas Dashboard → Network Access → Add IP Address

### Database User

Create a dedicated production user with limited permissions:
- Atlas Dashboard → Database Access → Add New Database User
- Give `readWrite` access only to the `paralegal_prod` database

---

## 10. Health Checks & Monitoring

### Endpoints to Monitor

| Service | Health Endpoint | Expected Response |
|---------|-----------------|-------------------|
| Backend | `GET /health` | `{"status": "healthy"}` |
| OnlyOffice | `GET /healthcheck` | `true` |
| Frontend | `GET /` | 200 OK |

### Recommended Monitoring

- Set up uptime monitoring for all three endpoints
- Configure alerts for API errors (5xx responses)
- Monitor MongoDB Atlas metrics

---

## 11. Deployment Checklist

1. [ ] Set up production domain DNS records
2. [ ] Obtain SSL certificates
3. [ ] Create `.env.production` files (DO NOT commit to git)
4. [ ] Update CORS allowed origins
5. [ ] Configure nginx reverse proxy
6. [ ] Set up MongoDB Atlas production cluster
7. [ ] Update OnlyOffice JWT secret
8. [ ] Build frontend with production environment
9. [ ] Deploy with `docker-compose -f docker-compose.prod.yml up -d`
10. [ ] Verify all health endpoints
11. [ ] Test document upload, edit, and save flow
12. [ ] Set up monitoring and alerting

---

## Related Reports

- [003 - OnlyOffice MongoDB Document Save](./003-onlyoffice-mongodb-document-save.md) - Document save implementation details
- [001 - OnlyOffice Document Switching](./001-onlyoffice-document-switching.md)
- [002 - OnlyOffice Plugin Cross-Origin Communication](./002-onlyoffice-plugin-cross-origin-communication.md)

