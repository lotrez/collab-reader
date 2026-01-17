# Docker Setup Guide

This guide helps you set up the local development environment for Collab Reader using Docker.

## Prerequisites

- Docker installed and running
- Docker Compose installed (included with Docker Desktop)

## Quick Start

### 1. Copy Environment Variables

```bash
cp .env.example .env
```

Edit `.env` if you want to change any default values (optional for development).

### 2. Start Services

```bash
# Start all services (PostgreSQL + MinIO)
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### 3. Wait for Services to be Ready

The services need a few seconds to initialize. Wait about 30 seconds or check health:

```bash
# Check if PostgreSQL is ready
docker-compose exec postgres pg_isready -U postgres

# Check if MinIO is ready
curl http://localhost:9000/minio/health/live
```

### 4. Create MinIO Bucket

You need to create the bucket for storing EPUB assets:

**Option A: Using MinIO Console (Web UI)**
1. Open http://localhost:9001 in your browser
2. Login with:
   - Username: `minioadmin`
   - Password: `minioadmin`
3. Click "Buckets" → "Create Bucket"
4. Bucket Name: `collab-reader`
5. Click "Create Bucket"

**Option B: Using MinIO Client (mc)**
```bash
# Install MinIO client
# macOS/Linux: brew install minio/stable/mc
# Windows: Download from https://min.io/docs/minio/windows/reference/minio-mc.html

# Configure alias
mc alias set local http://localhost:9000 minioadmin minioadmin

# Create bucket
mc mb local/collab-reader

# Verify
mc ls local
```

## Service Access

| Service | URL | Credentials |
|---------|-----|-------------|
| PostgreSQL | `localhost:5432` | User: `postgres`<br>Password: `postgres`<br>Database: `collab_reader` |
| MinIO API | `http://localhost:9000` | Access Key: `minioadmin`<br>Secret Key: `minioadmin` |
| MinIO Console | `http://localhost:9001` | Username: `minioadmin`<br>Password: `minioadmin` |

## Useful Commands

### Start/Stop Services

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v

# Restart services
docker-compose restart
```

### View Logs

```bash
# All services
docker-compose logs -f

# PostgreSQL only
docker-compose logs -f postgres

# MinIO only
docker-compose logs -f minio
```

### Database Operations

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d collab_reader

# Run SQL file
docker-compose exec -T postgres psql -U postgres -d collab_reader < schema.sql

# Backup database
docker-compose exec postgres pg_dump -U postgres collab_reader > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres -d collab_reader < backup.sql
```

### MinIO Operations

```bash
# List all buckets
mc ls local

# List files in bucket
mc ls local/collab-reader

# Copy file to bucket
mc cp file.epub local/collab-reader/

# Remove file from bucket
mc rm local/collab-reader/file.epub
```

## Troubleshooting

### PostgreSQL Connection Issues

```bash
# Check if container is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres pg_isready -U postgres

# Connect manually
docker-compose exec postgres psql -U postgres
```

### MinIO Connection Issues

```bash
# Check if container is running
docker-compose ps minio

# Check MinIO logs
docker-compose logs minio

# Test API endpoint
curl http://localhost:9000/minio/health/live

# Test Console
curl http://localhost:9001
```

### Port Conflicts

If ports 5432, 9000, or 9001 are already in use:

1. Edit `.env` file
2. Change the port numbers:
   ```env
   POSTGRES_PORT=5433
   MINIO_API_PORT=9002
   MINIO_CONSOLE_PORT=9003
   ```
3. Restart services: `docker-compose down && docker-compose up -d`

### Reset Everything

To start fresh (WARNING: deletes all data):

```bash
# Stop and remove containers, networks, and volumes
docker-compose down -v

# Start fresh
docker-compose up -d

# Don't forget to recreate the MinIO bucket!
```

## Production Notes

For production deployment:

1. **Change all passwords** in `.env`:
   - `POSTGRES_PASSWORD`
   - `MINIO_ROOT_PASSWORD`
   - `JWT_SECRET`

2. **Enable SSL/TLS** for both PostgreSQL and MinIO

3. **Use managed services** instead:
   - AWS RDS for PostgreSQL
   - AWS S3 instead of MinIO

4. **Set up backups** for PostgreSQL

5. **Configure proper access controls** for MinIO buckets

6. **Use environment-specific .env files** (`.env.production`)
