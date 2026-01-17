# Collab Reader - Quick Setup Guide

## Prerequisites

- Bun installed (https://bun.sh)
- Docker & Docker Compose
- Git

## Quick Start (5 minutes)

### 1. Clone and Setup Environment

```bash
# Clone the repository (if not already done)
git clone <repo-url>
cd collab-reader

# Copy environment variables
cp .env.example .env

# Install dependencies
bun install
```

### 2. Start Infrastructure Services

```bash
# Start PostgreSQL and MinIO
docker-compose up -d

# Wait for services to be healthy (about 10 seconds)
docker-compose ps
```

### 3. Initialize MinIO Bucket

**Windows (PowerShell):**
```powershell
.\scripts\init-minio.ps1
```

**Linux/macOS:**
```bash
./scripts/init-minio.sh
```

**Manual Setup:**
1. Open http://localhost:9001
2. Login: `minioadmin` / `minioadmin`
3. Create bucket: `collab-reader`

### 4. Run Database Migrations

```bash
# Generate migration files (if needed)
bun drizzle-kit generate

# Apply migrations
bun drizzle-kit push
```

### 5. Start Development Server

```bash
bun run dev
```

The API will be available at http://localhost:3000

## Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| **API Server** | http://localhost:3000 | - |
| **PostgreSQL** | localhost:5432 | User: `postgres`<br>Password: `postgres`<br>Database: `collab_reader` |
| **MinIO API** | http://localhost:9000 | Access: `minioadmin`<br>Secret: `minioadmin` |
| **MinIO Console** | http://localhost:9001 | Login: `minioadmin`<br>Password: `minioadmin` |

## Testing the Setup

### Test EPUB Parsing

```bash
# Run the test script
bun run scripts/test-epub-unzip.ts
```

This will parse all EPUB files in `back/epub/test_data/` and display statistics.

### Test Database Connection

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d collab_reader

# Inside psql:
\dt          # List tables
\q           # Exit
```

### Test MinIO

```bash
# Check MinIO health
curl http://localhost:9000/minio/health/live

# Open MinIO Console
# Navigate to http://localhost:9001
```

## Common Commands

### Docker Services

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Check status
docker-compose ps
```

### Database

```bash
# Run migrations
bun drizzle-kit push

# Open Drizzle Studio (database browser)
bun drizzle-kit studio

# Connect to database
docker-compose exec postgres psql -U postgres -d collab_reader
```

### Development

```bash
# Start dev server
bun run dev

# Run tests
bun test

# Build for production
bun build ./src/index.ts --outfile ./dist/index.js
```

## Project Structure

```
collab-reader/
├── back/
│   └── epub/              # EPUB parsing logic
│       ├── parser.ts      # Main parser
│       ├── epub.model.ts  # TypeScript models
│       └── test_data/     # Test EPUB files
├── scripts/               # Utility scripts
│   ├── test-epub-unzip.ts # EPUB parsing test
│   ├── init-minio.sh      # MinIO setup (Linux/macOS)
│   └── init-minio.ps1     # MinIO setup (Windows)
├── docs/                  # Documentation
│   └── ARCHITECTURE.md    # Full architecture guide
├── .env                   # Environment variables (git-ignored)
├── .env.example           # Environment template
├── docker-compose.yml     # Infrastructure services
├── AGENTS.md             # Developer & AI guide
└── DOCKER_SETUP.md       # Detailed Docker guide
```

## Troubleshooting

### Port Already in Use

If ports 5432, 9000, or 9001 are taken:

1. Edit `.env`:
   ```env
   POSTGRES_PORT=5433
   MINIO_API_PORT=9002
   MINIO_CONSOLE_PORT=9003
   ```
2. Restart: `docker-compose down && docker-compose up -d`

### PostgreSQL Connection Failed

```bash
# Check if running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Restart
docker-compose restart postgres
```

### MinIO Connection Failed

```bash
# Check if running
docker-compose ps minio

# View logs
docker-compose logs minio

# Test health
curl http://localhost:9000/minio/health/live
```

### Reset Everything

```bash
# Stop and remove all data (WARNING: destructive!)
docker-compose down -v

# Start fresh
docker-compose up -d

# Re-initialize MinIO bucket
.\scripts\init-minio.ps1  # Windows
./scripts/init-minio.sh   # Linux/macOS
```

## Next Steps

1. **Read the docs:**
   - [AGENTS.md](./AGENTS.md) - Developer guide and patterns
   - [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Complete technical spec

2. **Start building:**
   - Set up database schema (Drizzle migrations)
   - Create API routes (Hono)
   - Implement EPUB processing service

3. **Test with real data:**
   - Upload EPUB files
   - Extract and store content
   - Test full-text search

## Support

For issues or questions:
- Check [DOCKER_SETUP.md](./DOCKER_SETUP.md) for detailed Docker guide
- Review [AGENTS.md](./AGENTS.md) for coding patterns
- See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for technical details

---

**Happy Coding!**
