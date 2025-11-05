FROM python:3.10-slim

WORKDIR /app

# Install system dependencies using a cache mount for apt
RUN --mount=type=cache,id=apt-cache,target=/var/cache/apt \
    apt-get update && apt-get install -y \
    gcc \
    curl \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install Python dependencies using a cache mount for pip
# We remove --no-cache-dir to allow pip to use the cache
RUN --mount=type=cache,id=pip-cache,target=/root/.cache/pip \
    pip install -r requirements.txt

COPY . .

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app
RUN chown -R app:app /app
USER app

EXPOSE 8000

# Fixed health check with proper port
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/docs || exit 1

# Use PORT environment variable with fallback
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]