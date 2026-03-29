# =========================
# Stage 1: Build Frontend
# =========================
FROM node:20 AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --silent --no-audit --prefer-offline

COPY frontend/ .
RUN npm run build


# =========================
# Stage 2: Final Image
# =========================
FROM python:3.12-slim-bullseye

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    curl \
    build-essential \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# =========================
# Backend Setup
# =========================
COPY backend/ ./backend

RUN python -m pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r backend/requirements.txt

# =========================
# Copy Frontend Build
# =========================
COPY --from=frontend-builder /app/frontend/dist/ /usr/share/nginx/html/

# =========================
# Nginx Config (FIXED)
# =========================
RUN rm /etc/nginx/sites-enabled/default

RUN cat > /etc/nginx/conf.d/app.conf <<'EOF'
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Frontend (SPA)
    location / {
        try_files $uri /index.html;
    }

    # Backend API (FIXED HERE)
    location /api/ {
        proxy_pass http://127.0.0.1:8000;   # ❗ REMOVED TRAILING SLASH
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Swagger Docs
    location /docs {
        proxy_pass http://127.0.0.1:8000/docs;
    }
}
EOF

# =========================
# Start Script
# =========================
RUN cat > /start.sh <<'EOF'
#!/bin/bash
set -e

echo "Starting backend..."
cd /app/backend

python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 &

echo "Starting nginx..."
nginx -g "daemon off;"
EOF

RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]