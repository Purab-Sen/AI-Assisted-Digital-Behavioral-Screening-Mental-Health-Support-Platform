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

COPY nginx.conf /etc/nginx/conf.d/app.conf

# =========================
# Start Script
# =========================
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]