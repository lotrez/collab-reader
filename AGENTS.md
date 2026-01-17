# AGENTS.md - Developer & AI Agent Guide

## Project Overview

**Collab Reader** is a web-based EPUB reader with collaborative features, built with:
- **Backend:** Bun + Hono + PostgreSQL + Drizzle ORM
- **Storage:** MinIO (S3-compatible)
- **Frontend:** React
- **Auth:** Google OAuth (planned - not yet implemented)

## Quick Reference

### Essential Documents
- **[Architecture Plan](./docs/ARCHITECTURE.md)** - Complete technical architecture, database schema, API specs, and implementation phases

### Key Commands

```bash
# Start infrastructure (PostgreSQL + MinIO)
docker-compose up -d

# Install dependencies
bun install

# Run database migrations
bun drizzle-kit push

# Development server
bun run dev

# Build for production
bun build ./src/index.ts --outfile ./dist/index.js

# Run tests
bun test
```

---

## Architecture Quick Reference

### Core Decisions

| Aspect | Decision | Why |
|--------|----------|-----|
| **EPUB Processing** | Unzip on upload | One-time cost, enables search/indexing, better for multiple reads |
| **HTML Storage** | PostgreSQL (per chapter) | Fast queries, full-text search, transactional consistency |
| **Asset Storage** | MinIO/S3 | Scalable, cost-effective for binary files |
| **Asset Serving** | API proxy (not direct S3) | Security, access control, user-specific permissions |
| **Path Resolution** | Keep relative paths in HTML | Simpler processing, resolve via proxy at runtime |

### Database Schema Summary

**Core Tables:**
- `users` - User accounts and authentication (TODO: Add after implementing Google OAuth)
- `books` - EPUB metadata (title, author, cover, etc.)
- `chapters` - Individual chapter HTML content with full-text search
- `assets` - Image/font/CSS file mappings to S3
- `reading_progress` - Track where users left off
- `annotations` - Highlights, notes, and bookmarks

**Note:** User authentication tables are pending implementation. Google OAuth will be integrated before user-related foreign keys are added to other tables.

**See [ARCHITECTURE.md](./docs/ARCHITECTURE.md#database-schema) for complete schema with TypeScript definitions.**

### API Endpoints Summary

```
Auth:       POST   /api/auth/register, /login, /logout
Books:      GET    /api/books (list)
            GET    /api/books/:id (details)
            POST   /api/books/upload (EPUB)
            DELETE /api/books/:id
Chapters:   GET    /api/books/:bookId/chapters/:number
Assets:     GET    /api/books/:bookId/assets/*path (proxy)
Progress:   GET    /api/books/:bookId/progress
            POST   /api/books/:bookId/progress
Annotations:GET    /api/chapters/:chapterId/annotations
            POST   /api/chapters/:chapterId/annotations
            PATCH  /api/annotations/:id
            DELETE /api/annotations/:id
Search:     GET    /api/search?q={query}&bookId={optional}
```

---

## Coding Standards

### TypeScript

- **Strict mode enabled** - All TypeScript strict checks on
- **No any types** - Use proper typing or unknown
- **Use Zod for validation** - Validate all API inputs
- **Explicit return types** - Always declare function return types

```typescript
// Good
export async function getBook(id: string): Promise<Book | null> {
  return await db.query.books.findFirst({ where: eq(books.id, id) });
}

// Bad
export async function getBook(id) {
  return await db.query.books.findFirst({ where: eq(books.id, id) });
}
```

### File Organization

```
src/
├── routes/          # Hono route handlers (one file per resource)
├── services/        # Business logic (epub, storage, auth, search)
├── middleware/      # Request/response middleware (auth, error, cors)
├── db/              # Drizzle schema and migrations
├── config/          # Configuration (database, s3, env)
├── types/           # Shared TypeScript types
└── utils/           # Helper functions (logger, validators)
```

**Rules:**
1. **Routes** are thin - they validate input and call services
2. **Services** contain business logic - reusable across routes
3. **One file per concern** - don't create god files
4. **Index exports** - use barrel exports (index.ts) for cleaner imports

### Naming Conventions

- **Files:** kebab-case (`epub-parser.ts`, `auth.routes.ts`)
- **Classes:** PascalCase (`EpubParser`, `HtmlSanitizer`)
- **Functions:** camelCase (`parseEpub`, `sanitizeHtml`)
- **Constants:** SCREAMING_SNAKE_CASE (`MAX_UPLOAD_SIZE`, `JWT_SECRET`)
- **Interfaces/Types:** PascalCase (`Book`, `Chapter`, `EpubMetadata`)

### Error Handling

```typescript
// Good - Specific error types
export class EpubParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EpubParseError';
  }
}

// Good - Structured error responses
return c.json({ 
  error: 'Book not found',
  code: 'BOOK_NOT_FOUND',
  details: { bookId } 
}, 404);

// Bad - Generic errors
throw new Error('something went wrong');
```

### Database Queries

```typescript
// Good - Use Drizzle query builder
const book = await db.query.books.findFirst({
  where: eq(books.id, bookId),
  with: { chapters: true },
});

// Good - Use transactions for multi-step operations
await db.transaction(async (tx) => {
  await tx.insert(books).values(bookData);
  await tx.insert(chapters).values(chapterData);
});

// Bad - Raw SQL strings (unless absolutely necessary)
const result = await db.execute(sql`SELECT * FROM books WHERE id = ${bookId}`);
```

---

## Development Workflow

### Starting a New Feature

1. **Read the Architecture Doc** - Understand how your feature fits
2. **Check existing code** - Look for similar patterns to follow
3. **Update database schema** if needed:
   ```bash
   # Edit src/db/schema.ts
   # Generate migration
   bun drizzle-kit generate
   # Apply migration
   bun drizzle-kit push
   ```
4. **Write service layer** - Business logic first
5. **Create routes** - Wire up HTTP endpoints
6. **Add validation** - Use Zod schemas for input validation
7. **Test manually** - Use Thunder Client, Postman, or curl
8. **Write tests** - Unit tests for services, integration tests for routes

### Testing Philosophy

- **Unit tests:** Test business logic in isolation (services, utils)
- **Integration tests:** Test API endpoints with real database
- **Avoid mocking:** Use test database instead of mocks when possible
- **Test happy path + edge cases:** Success and failure scenarios

```typescript
// Example unit test
import { describe, test, expect } from 'bun:test';
import { EpubParser } from './epub-parser';

describe('EpubParser', () => {
  test('should parse valid EPUB metadata', async () => {
    const parser = new EpubParser();
    const buffer = await Bun.file('test/fixtures/sample.epub').arrayBuffer();
    const result = await parser.parse(buffer);
    
    expect(result.metadata.title).toBe('Sample Book');
    expect(result.spine.length).toBeGreaterThan(0);
  });
  
  test('should throw error for invalid EPUB', async () => {
    const parser = new EpubParser();
    const buffer = new ArrayBuffer(0);
    
    await expect(parser.parse(buffer)).rejects.toThrow('Invalid EPUB');
  });
});
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/add-book-collections

# Make changes, commit frequently
git add .
git commit -m "feat: add book collections schema"

# Push and create PR
git push origin feature/add-book-collections
```

**Commit Messages:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

---

## Common Tasks & Patterns

### Adding a New API Endpoint

**Example: Add endpoint to get book statistics**

1. **Create route handler:**

```typescript
// src/routes/books.routes.ts

booksRouter.get('/:id/stats', authMiddleware, async (c) => {
  const bookId = c.req.param('id');
  const userId = c.get('userId');
  
  // Validate access
  const book = await db.query.books.findFirst({
    where: and(eq(books.id, bookId), eq(books.userId, userId)),
  });
  
  if (!book) {
    return c.json({ error: 'Book not found' }, 404);
  }
  
  // Call service
  const stats = await bookService.getBookStats(bookId);
  
  return c.json(stats);
});
```

2. **Create service method:**

```typescript
// src/services/book.service.ts

export class BookService {
  async getBookStats(bookId: string) {
    const chapters = await db.query.chapters.findMany({
      where: eq(chapters.bookId, bookId),
    });
    
    const totalWords = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
    
    return {
      chapterCount: chapters.length,
      totalWords,
      estimatedReadingTime: Math.ceil(totalWords / 250), // minutes
    };
  }
}

export const bookService = new BookService();
```

### Adding a New Database Table

1. **Update schema:**

```typescript
// src/db/schema.ts

export const bookCollections = pgTable('book_collections', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const bookCollectionItems = pgTable('book_collection_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  collectionId: uuid('collection_id').notNull().references(() => bookCollections.id, { onDelete: 'cascade' }),
  bookId: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  addedAt: timestamp('added_at').defaultNow().notNull(),
});
```

2. **Generate and apply migration:**

```bash
bun drizzle-kit generate
bun drizzle-kit push
```

### Processing an EPUB File

```typescript
// High-level flow
const parser = new EpubParser();
const sanitizer = new HtmlSanitizer();

// 1. Parse EPUB
const parsed = await parser.parse(epubBuffer);

// 2. Create book record
const bookId = generateId();
await db.insert(books).values({
  id: bookId,
  userId,
  ...parsed.metadata,
});

// 3. Process chapters
for (const [index, spineItem] of parsed.spine.entries()) {
  const manifestItem = parsed.manifest.find(m => m.id === spineItem.idref);
  const htmlBuffer = await parser.extractFile(parsed.zip, manifestItem.href);
  const htmlContent = sanitizer.sanitize(htmlBuffer.toString());
  
  await db.insert(chapters).values({
    bookId,
    chapterNumber: index + 1,
    spineIndex: index,
    htmlContent,
    href: manifestItem.href,
    wordCount: sanitizer.countWords(htmlContent),
  });
}

// 4. Upload assets
for (const asset of parsed.manifest.filter(isAsset)) {
  const buffer = await parser.extractFile(parsed.zip, asset.href);
  const s3Key = `assets/${bookId}/${asset.href}`;
  const s3Url = await s3Service.uploadFile(s3Key, buffer, asset.mediaType);
  
  await db.insert(assets).values({
    bookId,
    originalPath: asset.href,
    s3Key,
    s3Url,
    mimeType: asset.mediaType,
    fileSize: buffer.length,
  });
}
```

### Implementing Full-Text Search

```typescript
// Search query
const results = await db
  .select({
    bookId: books.id,
    chapterId: chapters.id,
    snippet: sql<string>`ts_headline('english', ${chapters.htmlContent}, to_tsquery('english', ${query}))`,
    rank: sql<number>`ts_rank(${chapters.searchVector}, to_tsquery('english', ${query}))`,
  })
  .from(chapters)
  .innerJoin(books, eq(chapters.bookId, books.id))
  .where(
    and(
      eq(books.userId, userId),
      sql`${chapters.searchVector} @@ to_tsquery('english', ${query})`
    )
  )
  .orderBy(sql`rank DESC`)
  .limit(50);
```

---

## Key Technical Decisions & Rationale

### Why Unzip on Upload?

**Decision:** Process EPUB completely on upload and store extracted content.

**Alternatives considered:**
- On-the-fly unzipping (decompress when user requests chapter)
- Hybrid (extract metadata on upload, chapters on-demand)

**Why this choice:**
- Users read books multiple times → one-time processing cost
- Enables full-text search across all content
- Allows pre-processing (sanitization, word count, etc.)
- Better performance for small user base (1-10 users)
- Simpler client implementation

**Trade-off:** Higher storage usage (acceptable at small scale)

### Why Store HTML in Database?

**Decision:** Store chapter HTML in PostgreSQL text columns.

**Alternatives considered:**
- Store all content (HTML + assets) in S3
- Store HTML as files on disk

**Why this choice:**
- PostgreSQL excels at full-text search (tsvector)
- Transactional consistency with metadata
- Fast queries for chapter retrieval
- Easy to version/modify content
- Chapter HTML is typically small (10-500KB)

**Trade-off:** Database size grows with books (mitigated by chapter-level storage)

### Why Proxy Assets Instead of Direct S3?

**Decision:** Serve assets through API proxy, not direct S3 URLs.

**Alternatives considered:**
- Public S3 bucket with direct links
- Pre-signed S3 URLs

**Why this choice:**
- **Security:** Verify user has access to book before serving
- **Flexibility:** Can add watermarking, analytics, rate limiting
- **Control:** Can revoke access without changing S3
- **Privacy:** Users can't share asset URLs directly

**Trade-off:** Slight performance overhead (mitigated with caching headers)

### Why Drizzle ORM?

**Decision:** Use Drizzle ORM for database access.

**Alternatives considered:**
- Prisma (full-featured ORM)
- Kysely (query builder)
- Raw SQL with postgres driver

**Why this choice:**
- TypeScript-first with excellent type inference
- Lightweight (no runtime overhead)
- Excellent Bun support
- Simple migration system
- No code generation step required
- Good balance of type safety and flexibility

### Why Hono?

**Decision:** Use Hono for HTTP framework.

**Alternatives considered:**
- Elysia (Bun-native, very fast)
- Express (familiar)
- Fastify (mature, fast)

**Why this choice:**
- Extremely lightweight and fast
- Works with multiple runtimes (portable)
- Clean, intuitive API
- Built-in TypeScript support
- Middleware ecosystem growing
- Good documentation

---

## Environment Setup for New Developers

### Prerequisites
- Bun installed (https://bun.sh)
- Docker & Docker Compose
- Git

### First-Time Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd collab-reader

# 2. Install dependencies
bun install

# 3. Copy environment template
cp .env.example .env
# Edit .env with your settings

# 4. Start infrastructure
docker-compose up -d

# 5. Wait for services to be ready (30 seconds)
sleep 30

# 6. Run database migrations
bun drizzle-kit push

# 7. Create MinIO bucket
# Open http://localhost:9001
# Login: minioadmin / minioadmin
# Create bucket: collab-reader
# Set policy: private

# 8. Start development server
bun run dev

# 9. Test API
curl http://localhost:3000/health
```

### Useful Development URLs

- **API Server:** http://localhost:3000
- **MinIO Console:** http://localhost:9001 (admin/admin)
- **PostgreSQL:** localhost:5432 (postgres/postgres)
- **Drizzle Studio:** `bun drizzle-kit studio` → http://localhost:4983

---

## Troubleshooting

### Common Issues

**Issue: Database connection fails**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check connection string
echo $DATABASE_URL

# Test connection
bun drizzle-kit push
```

**Issue: MinIO upload fails**
```bash
# Check if MinIO is running
docker ps | grep minio

# Verify bucket exists
# Open http://localhost:9001 and check buckets

# Test S3 connection
bun run test:s3  # (create this test script)
```

**Issue: EPUB parsing fails**
```bash
# Check file is valid EPUB
unzip -t path/to/file.epub

# Check mimetype file exists
unzip -l path/to/file.epub | grep mimetype

# Enable debug logging
DEBUG=epub:* bun run dev
```

**Issue: Full-text search returns no results**
```sql
-- Check if search_vector is populated
SELECT id, title, search_vector FROM chapters LIMIT 5;

-- Manually trigger update
UPDATE chapters SET html_content = html_content;

-- Test search directly
SELECT * FROM chapters 
WHERE search_vector @@ to_tsquery('english', 'search & term');
```

---

## Performance Considerations

### Database Optimization

- **Indexes created:** See [ARCHITECTURE.md - migrations/002_create_indexes.sql](./docs/ARCHITECTURE.md#sql-migrations)
- **Connection pooling:** Drizzle handles this automatically
- **Query optimization:** Use `EXPLAIN ANALYZE` for slow queries

### Asset Serving

- **Cache headers:** Set `Cache-Control: public, max-age=31536000, immutable`
- **CDN (future):** Add CloudFlare or similar in front of API
- **Compression:** Enable gzip/brotli at reverse proxy level

### Upload Processing

- **Stream processing:** Use streams to avoid loading entire EPUB in memory
- **Background jobs (future):** Move processing to queue (BullMQ, etc.)
- **Rate limiting:** Limit uploads to prevent abuse

---

## Security Checklist

Before deploying to production:

- [ ] Change JWT_SECRET to cryptographically random string (32+ chars)
- [ ] Update all default passwords (PostgreSQL, MinIO)
- [ ] Enable HTTPS (use Let's Encrypt)
- [ ] Set secure CORS policy (whitelist frontend domain)
- [ ] Add rate limiting to all endpoints
- [ ] Validate all file uploads (size, type, content)
- [ ] Sanitize all HTML before storage
- [ ] Use prepared statements (Drizzle does this automatically)
- [ ] Enable PostgreSQL SSL connections
- [ ] Review S3 bucket permissions
- [ ] Add CSP headers to frontend
- [ ] Enable database backups
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Review all authentication flows
- [ ] Add logging for security events

---

## Resources & References

### Documentation
- **[Complete Architecture Guide](./docs/ARCHITECTURE.md)** - Full technical specification
- **Drizzle ORM:** https://orm.drizzle.team
- **Hono Framework:** https://hono.dev
- **Bun Runtime:** https://bun.sh/docs
- **EPUB 3.0 Spec:** http://idpf.org/epub/30

### Tools
- **Drizzle Studio:** Visual database browser (`bun drizzle-kit studio`)
- **MinIO Console:** S3 bucket management (http://localhost:9001)
- **PostgreSQL CLI:** `docker exec -it collab-reader-db psql -U postgres -d collab_reader`

### Sample EPUB Files (for testing)
- https://www.gutenberg.org/ (free public domain books)
- https://standardebooks.org/ (high-quality EPUB files)

---

## Contributing

When working on this project:

1. **Read this guide first** - Understand architecture and patterns
2. **Follow coding standards** - Consistency is key
3. **Write tests** - Cover new functionality
4. **Update documentation** - Keep AGENTS.md and ARCHITECTURE.md current
5. **Ask questions** - Use GitHub issues or discussions

### For AI Agents

When assisting with this project:

- **Always reference** `/docs/ARCHITECTURE.md` for technical details
- **Follow established patterns** - Don't introduce new architectural approaches without discussion
- **Maintain consistency** - Match existing code style and structure
- **Consider security** - Validate inputs, sanitize outputs, check permissions
- **Test your changes** - Verify functionality before marking complete
- **Update documentation** - Reflect changes in relevant docs

---

## Quick Start for AI Agents

**Scenario: User asks you to implement a feature**

1. **Read context:**
   - Review [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for relevant sections
   - Check existing code for similar patterns
   - Identify which phase this feature belongs to

2. **Plan implementation:**
   - Database changes? Update schema and create migration
   - New service? Create in appropriate services/ directory
   - New endpoint? Add to relevant routes/ file
   - Frontend changes? Note dependencies with React app

3. **Implement:**
   - Follow established patterns and conventions
   - Add proper TypeScript types
   - Include error handling
   - Add input validation with Zod

4. **Test:**
   - Write unit tests for services
   - Manually test endpoints
   - Verify database changes
   - Check integration with existing features

5. **Document:**
   - Update this file if adding new patterns
   - Add code comments for complex logic
   - Update ARCHITECTURE.md if changing core design

---

**Last Updated:** January 2026  
**Maintained by:** Collab Reader Development Team
