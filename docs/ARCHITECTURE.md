# Collab Reader - Architecture & Implementation Plan

## Executive Summary

Collab Reader is a collaborative web-based EPUB reader with full-text search, annotations, and reading progress tracking. This document outlines the complete technical architecture and phased implementation plan.

### Technology Stack

- **Runtime:** Bun (JavaScript runtime)
- **API Framework:** Hono (lightweight, fast)
- **Database:** PostgreSQL with Drizzle ORM
- **Storage:** MinIO (S3-compatible object storage)
- **Frontend:** React
- **Authentication:** JWT-based custom implementation
- **Deployment:** Self-hosted (Docker Compose)

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **EPUB Processing** | Unzip on upload | One-time cost, enables search/indexing, better for multiple reads |
| **HTML Storage** | PostgreSQL (per chapter) | Fast queries, full-text search, transactional consistency |
| **Asset Storage** | MinIO/S3 | Scalable, cost-effective for images/fonts/CSS |
| **Asset Serving** | API proxy (not direct S3) | Security, access control, flexibility for features |
| **Path Strategy** | Keep relative paths | Simpler HTML processing, resolve via proxy |
| **HTML Processing** | jsdom/cheerio sanitization | Safe DOM manipulation, path resolution, XSS protection |

---

## Database Schema

### PostgreSQL Schema (Drizzle ORM)

```typescript
// schema.ts

import { pgTable, uuid, text, timestamp, integer, real, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const annotationTypeEnum = pgEnum('annotation_type', ['highlight', 'note', 'bookmark']);
export const assetTypeEnum = pgEnum('asset_type', ['image', 'font', 'stylesheet', 'other']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Books table
export const books = pgTable('books', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  author: text('author'),
  publisher: text('publisher'),
  language: text('language'),
  isbn: text('isbn'),
  description: text('description'),
  coverImageUrl: text('cover_image_url'),
  originalEpubUrl: text('original_epub_url').notNull(),
  metadata: jsonb('metadata'), // Additional OPF metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Chapters table
export const chapters = pgTable('chapters', {
  id: uuid('id').defaultRandom().primaryKey(),
  bookId: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  chapterNumber: integer('chapter_number').notNull(),
  spineIndex: integer('spine_index').notNull(), // Order from EPUB spine
  title: text('title'),
  href: text('href').notNull(), // Original href from EPUB
  htmlContent: text('html_content').notNull(),
  wordCount: integer('word_count'),
  // Full-text search vector (auto-updated via trigger)
  searchVector: text('search_vector'), // tsvector type
});

// Assets table (images, fonts, CSS)
export const assets = pgTable('assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  bookId: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  assetType: assetTypeEnum('asset_type').notNull(),
  originalPath: text('original_path').notNull(), // Path in EPUB
  s3Key: text('s3_key').notNull(), // S3/MinIO key
  s3Url: text('s3_url').notNull(), // Full URL
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size'),
});

// Reading progress table
export const readingProgress = pgTable('reading_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bookId: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  chapterId: uuid('chapter_id').references(() => chapters.id, { onDelete: 'set null' }),
  scrollPosition: real('scroll_position').default(0),
  percentageComplete: real('percentage_complete').default(0),
  lastReadAt: timestamp('last_read_at').defaultNow().notNull(),
});

// Annotations table
export const annotations = pgTable('annotations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  chapterId: uuid('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
  annotationType: annotationTypeEnum('annotation_type').notNull(),
  selectionStart: integer('selection_start'), // Character offset
  selectionEnd: integer('selection_end'),
  selectedText: text('selected_text'),
  noteContent: text('note_content'),
  color: text('color'), // For highlights
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  books: many(books),
  readingProgress: many(readingProgress),
  annotations: many(annotations),
}));

export const booksRelations = relations(books, ({ one, many }) => ({
  user: one(users, { fields: [books.userId], references: [users.id] }),
  chapters: many(chapters),
  assets: many(assets),
  readingProgress: many(readingProgress),
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  book: one(books, { fields: [chapters.bookId], references: [books.id] }),
  annotations: many(annotations),
}));
```

### SQL Migrations

```sql
-- migrations/001_create_full_text_search.sql

-- Add tsvector column for full-text search
ALTER TABLE chapters ADD COLUMN search_vector tsvector;

-- Create GIN index for fast searching
CREATE INDEX chapters_search_idx ON chapters USING GIN(search_vector);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_chapter_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', 
    COALESCE(NEW.title, '') || ' ' || 
    COALESCE(regexp_replace(NEW.html_content, '<[^>]*>', '', 'g'), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update search_vector
CREATE TRIGGER chapters_search_update 
BEFORE INSERT OR UPDATE ON chapters
FOR EACH ROW EXECUTE FUNCTION update_chapter_search_vector();
```

```sql
-- migrations/002_create_indexes.sql

-- Performance indexes
CREATE INDEX idx_books_user_id ON books(user_id);
CREATE INDEX idx_chapters_book_id ON chapters(book_id);
CREATE INDEX idx_chapters_spine_index ON chapters(book_id, spine_index);
CREATE INDEX idx_assets_book_id ON assets(book_id);
CREATE INDEX idx_reading_progress_user_book ON reading_progress(user_id, book_id);
CREATE INDEX idx_annotations_user_id ON annotations(user_id);
CREATE INDEX idx_annotations_chapter_id ON annotations(chapter_id);
```

---

## API Architecture

### Hono Server Structure

```
src/
├── index.ts                 # Entry point
├── app.ts                   # Hono app setup
├── config/
│   ├── database.ts          # Drizzle connection
│   ├── s3.ts                # MinIO/S3 client
│   └── env.ts               # Environment variables
├── middleware/
│   ├── auth.ts              # JWT authentication
│   ├── error.ts             # Error handling
│   └── cors.ts              # CORS configuration
├── routes/
│   ├── auth.routes.ts       # Auth endpoints
│   ├── books.routes.ts      # Book management
│   ├── chapters.routes.ts   # Chapter endpoints
│   ├── assets.routes.ts     # Asset proxy
│   ├── annotations.routes.ts
│   ├── progress.routes.ts
│   └── search.routes.ts
├── services/
│   ├── epub/
│   │   ├── parser.ts        # EPUB parsing
│   │   ├── sanitizer.ts     # HTML sanitization
│   │   └── extractor.ts     # Asset extraction
│   ├── storage/
│   │   ├── s3.service.ts    # S3/MinIO operations
│   │   └── db.service.ts    # Database operations
│   └── auth/
│       ├── jwt.ts           # JWT utilities
│       └── password.ts      # Password hashing
├── types/
│   └── index.ts             # TypeScript types
└── utils/
    ├── logger.ts
    └── validators.ts
```

### API Endpoints

#### Authentication

```
POST   /api/auth/register     # Create new user
POST   /api/auth/login        # Login, get JWT
POST   /api/auth/logout       # Invalidate token
GET    /api/auth/me           # Get current user
```

#### Books

```
GET    /api/books             # List user's books (paginated)
GET    /api/books/:id         # Get book metadata + chapter list
POST   /api/books/upload      # Upload EPUB file
DELETE /api/books/:id         # Delete book
```

#### Chapters

```
GET    /api/books/:bookId/chapters                    # List all chapters
GET    /api/books/:bookId/chapters/:chapterNumber     # Get chapter HTML
```

#### Assets

```
GET    /api/books/:bookId/assets/*path                # Proxy asset from S3
```

#### Reading Progress

```
GET    /api/books/:bookId/progress                    # Get reading progress
POST   /api/books/:bookId/progress                    # Update progress
```

#### Annotations

```
GET    /api/chapters/:chapterId/annotations           # List annotations
POST   /api/chapters/:chapterId/annotations           # Create annotation
PATCH  /api/annotations/:id                           # Update annotation
DELETE /api/annotations/:id                           # Delete annotation
```

#### Search

```
GET    /api/search?q={query}&bookId={optional}        # Full-text search
```

---

## EPUB Processing Pipeline

### Upload Flow

```
1. Client uploads EPUB file
   ↓
2. Validate file (check mimetype, size limits)
   ↓
3. Unzip EPUB in memory (using JSZip)
   ↓
4. Parse META-INF/container.xml → locate content.opf
   ↓
5. Parse content.opf:
   - Extract metadata (title, author, etc.)
   - Parse manifest (all files)
   - Parse spine (reading order)
   - Parse guide/navigation
   ↓
6. Process chapters:
   - For each spine item:
     a. Extract HTML content
     b. Parse with jsdom
     c. Sanitize (remove scripts, dangerous elements)
     d. Keep relative paths intact
     e. Calculate word count
     f. Store in chapters table
   ↓
7. Process assets:
   - For each image/font/CSS:
     a. Extract file from EPUB
     b. Determine MIME type
     c. Upload to MinIO (key: assets/{bookId}/{path})
     d. Store mapping in assets table
   ↓
8. Process cover image:
   - Extract cover from metadata or guide
   - Upload to MinIO (key: covers/{bookId}.{ext})
   - Store URL in books table
   ↓
9. Upload original EPUB:
   - Store to MinIO (key: originals/{bookId}.epub)
   - Store URL in books table
   ↓
10. Return book ID and metadata to client
```

### EPUB Parser Implementation

```typescript
// src/services/epub/parser.ts

import JSZip from 'jszip';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXml = promisify(parseString);

export interface EpubMetadata {
  title: string;
  author?: string;
  publisher?: string;
  language?: string;
  isbn?: string;
  description?: string;
}

export interface EpubManifestItem {
  id: string;
  href: string;
  mediaType: string;
}

export interface EpubSpineItem {
  idref: string;
  linear?: boolean;
}

export interface ParsedEpub {
  metadata: EpubMetadata;
  manifest: EpubManifestItem[];
  spine: EpubSpineItem[];
  opfBasePath: string; // Directory containing OPF file
  zip: JSZip; // Keep zip for extracting files
}

export class EpubParser {
  async parse(buffer: ArrayBuffer): Promise<ParsedEpub> {
    const zip = await JSZip.loadAsync(buffer);
    
    // 1. Find container.xml
    const containerFile = zip.file('META-INF/container.xml');
    if (!containerFile) {
      throw new Error('Invalid EPUB: META-INF/container.xml not found');
    }
    
    const containerXml = await containerFile.async('text');
    const container = await parseXml(containerXml);
    
    // 2. Extract OPF path
    const opfPath = container.container.rootfiles[0].rootfile[0].$['full-path'];
    const opfBasePath = opfPath.substring(0, opfPath.lastIndexOf('/'));
    
    // 3. Parse OPF file
    const opfFile = zip.file(opfPath);
    if (!opfFile) {
      throw new Error(`OPF file not found: ${opfPath}`);
    }
    
    const opfXml = await opfFile.async('text');
    const opf = await parseXml(opfXml);
    const pkg = opf.package;
    
    // 4. Extract metadata
    const metadata = this.extractMetadata(pkg.metadata[0]);
    
    // 5. Extract manifest
    const manifest = this.extractManifest(pkg.manifest[0]);
    
    // 6. Extract spine
    const spine = this.extractSpine(pkg.spine[0]);
    
    return {
      metadata,
      manifest,
      spine,
      opfBasePath,
      zip,
    };
  }
  
  private extractMetadata(metadataNode: any): EpubMetadata {
    return {
      title: metadataNode['dc:title']?.[0] || 'Untitled',
      author: metadataNode['dc:creator']?.[0]?._ || metadataNode['dc:creator']?.[0],
      publisher: metadataNode['dc:publisher']?.[0],
      language: metadataNode['dc:language']?.[0],
      isbn: metadataNode['dc:identifier']?.[0]?._ || metadataNode['dc:identifier']?.[0],
      description: metadataNode['dc:description']?.[0],
    };
  }
  
  private extractManifest(manifestNode: any): EpubManifestItem[] {
    return manifestNode.item.map((item: any) => ({
      id: item.$.id,
      href: item.$.href,
      mediaType: item.$['media-type'],
    }));
  }
  
  private extractSpine(spineNode: any): EpubSpineItem[] {
    return spineNode.itemref.map((item: any) => ({
      idref: item.$.idref,
      linear: item.$.linear !== 'no',
    }));
  }
  
  async extractFile(zip: JSZip, path: string): Promise<Buffer> {
    const file = zip.file(path);
    if (!file) {
      throw new Error(`File not found in EPUB: ${path}`);
    }
    return await file.async('nodebuffer');
  }
}
```

### HTML Sanitizer

```typescript
// src/services/epub/sanitizer.ts

import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

export class HtmlSanitizer {
  private purify: any;
  
  constructor() {
    const window = new JSDOM('').window;
    this.purify = createDOMPurify(window as any);
  }
  
  sanitize(html: string): string {
    // Configure DOMPurify
    const config = {
      ALLOWED_TAGS: [
        'p', 'div', 'span', 'br', 'hr',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'dl', 'dt', 'dd',
        'table', 'thead', 'tbody', 'tr', 'td', 'th',
        'a', 'strong', 'em', 'u', 'i', 'b', 's', 'sub', 'sup',
        'img', 'figure', 'figcaption',
        'blockquote', 'pre', 'code',
        'section', 'article', 'header', 'footer', 'nav', 'aside',
      ],
      ALLOWED_ATTR: [
        'href', 'src', 'alt', 'title',
        'class', 'id', 'style',
        'width', 'height',
        'rowspan', 'colspan',
      ],
      ALLOW_DATA_ATTR: false,
      KEEP_CONTENT: true,
    };
    
    return this.purify.sanitize(html, config);
  }
  
  stripToText(html: string): string {
    const dom = new JSDOM(html);
    return dom.window.document.body.textContent || '';
  }
  
  countWords(html: string): number {
    const text = this.stripToText(html);
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
}
```

---

## Asset Serving Strategy

### Proxy Endpoint Implementation

```typescript
// src/routes/assets.routes.ts

import { Hono } from 'hono';
import { s3Service } from '../services/storage/s3.service';
import { db } from '../config/database';
import { assets, books } from '../db/schema';
import { eq, and } from 'drizzle-orm';

const assetsRouter = new Hono();

assetsRouter.get('/books/:bookId/assets/*', async (c) => {
  const bookId = c.req.param('bookId');
  const assetPath = c.req.param('*'); // Wildcard captures everything after /assets/
  
  // 1. Verify user has access to this book
  const userId = c.get('userId'); // From auth middleware
  const book = await db.query.books.findFirst({
    where: and(
      eq(books.id, bookId),
      eq(books.userId, userId)
    ),
  });
  
  if (!book) {
    return c.json({ error: 'Book not found' }, 404);
  }
  
  // 2. Look up asset in database
  const asset = await db.query.assets.findFirst({
    where: and(
      eq(assets.bookId, bookId),
      eq(assets.originalPath, assetPath)
    ),
  });
  
  if (!asset) {
    return c.json({ error: 'Asset not found' }, 404);
  }
  
  // 3. Stream from S3/MinIO
  try {
    const stream = await s3Service.getObjectStream(asset.s3Key);
    
    // 4. Set appropriate headers
    c.header('Content-Type', asset.mimeType);
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    c.header('Content-Length', asset.fileSize?.toString() || '');
    
    // 5. Stream to client
    return c.body(stream);
  } catch (error) {
    console.error('Error streaming asset:', error);
    return c.json({ error: 'Failed to load asset' }, 500);
  }
});

export { assetsRouter };
```

### S3/MinIO Service

```typescript
// src/services/storage/s3.service.ts

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

class S3Service {
  private client: S3Client;
  private bucket: string;
  
  constructor() {
    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
      },
      forcePathStyle: true, // Required for MinIO
    });
    
    this.bucket = process.env.S3_BUCKET || 'collab-reader';
  }
  
  async uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
    
    return this.getPublicUrl(key);
  }
  
  async getObjectStream(key: string): Promise<Readable> {
    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
    
    return response.Body as Readable;
  }
  
  async deleteFile(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
  }
  
  getPublicUrl(key: string): string {
    const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
    return `${endpoint}/${this.bucket}/${key}`;
  }
}

export const s3Service = new S3Service();
```

---

## Authentication System

### JWT Implementation

```typescript
// src/services/auth/jwt.ts

import jwt from '@tannin/jwt'; // Bun-compatible JWT library
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export interface JwtPayload {
  userId: string;
  email: string;
}

export async function generateToken(payload: JwtPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as JwtPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}
```

### Auth Middleware

```typescript
// src/middleware/auth.ts

import { Context, Next } from 'hono';
import { verifyToken } from '../services/auth/jwt';

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const token = authHeader.substring(7);
  
  try {
    const payload = await verifyToken(token);
    c.set('userId', payload.userId);
    c.set('userEmail', payload.email);
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
}
```

---

## Full-Text Search Implementation

### Search Service

```typescript
// src/services/search.service.ts

import { db } from '../config/database';
import { books, chapters } from '../db/schema';
import { sql, eq, and } from 'drizzle-orm';

export interface SearchResult {
  bookId: string;
  bookTitle: string;
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  snippet: string;
  rank: number;
}

export class SearchService {
  async search(userId: string, query: string, bookId?: string): Promise<SearchResult[]> {
    const tsQuery = this.buildTsQuery(query);
    
    const results = await db
      .select({
        bookId: books.id,
        bookTitle: books.title,
        chapterId: chapters.id,
        chapterTitle: chapters.title,
        chapterNumber: chapters.chapterNumber,
        snippet: sql<string>`ts_headline('english', ${chapters.htmlContent}, ${tsQuery}, 'MaxWords=50, MinWords=25')`,
        rank: sql<number>`ts_rank(${chapters.searchVector}, ${tsQuery})`,
      })
      .from(chapters)
      .innerJoin(books, eq(chapters.bookId, books.id))
      .where(
        and(
          eq(books.userId, userId),
          bookId ? eq(books.id, bookId) : undefined,
          sql`${chapters.searchVector} @@ ${tsQuery}`
        )
      )
      .orderBy(sql`ts_rank(${chapters.searchVector}, ${tsQuery}) DESC`)
      .limit(50);
    
    return results;
  }
  
  private buildTsQuery(query: string): any {
    // Convert search query to tsquery format
    // "hello world" -> "hello & world"
    const terms = query.trim().split(/\s+/).join(' & ');
    return sql`to_tsquery('english', ${terms})`;
  }
}
```

---

## Development Phases

### Phase 1: Project Setup & Infrastructure (Week 1)

**Goal:** Set up development environment with PostgreSQL, MinIO, and Hono API server.

**Tasks:**
1. Create Docker Compose file for PostgreSQL + MinIO
2. Install dependencies (Hono, Drizzle, S3 client, etc.)
3. Configure environment variables
4. Set up Drizzle ORM with migrations
5. Create initial database schema
6. Test database connection
7. Test MinIO connection

**Deliverables:**
- `docker-compose.yml` running PostgreSQL + MinIO
- `drizzle.config.ts` configured
- Database migrations created and run
- `.env` file with all required variables

### Phase 2: Authentication System (Week 1-2)

**Goal:** Implement user registration, login, and JWT-based authentication.

**Tasks:**
1. Create User model and migration
2. Implement password hashing (using Bun's built-in crypto)
3. Build auth service (register, login, logout)
4. Create JWT utilities (sign, verify)
5. Build auth middleware for protected routes
6. Create auth routes (`/api/auth/*`)
7. Test authentication flow

**Deliverables:**
- Working registration and login endpoints
- JWT authentication middleware
- Protected route example

### Phase 3: EPUB Processing Core (Week 2)

**Goal:** Build EPUB parser and HTML sanitizer.

**Tasks:**
1. Install EPUB dependencies (jszip, xml2js, jsdom, dompurify)
2. Implement EPUB parser (container.xml, OPF parsing)
3. Implement HTML sanitizer with DOMPurify
4. Create asset extractor
5. Write unit tests for parser
6. Test with sample EPUB files

**Deliverables:**
- Functional EPUB parser
- HTML sanitization working
- Asset extraction working
- Test coverage for core parsing

### Phase 4: Book Storage & Upload (Week 3)

**Goal:** Implement EPUB upload endpoint with complete processing pipeline.

**Tasks:**
1. Create Book, Chapter, Asset models and migrations
2. Implement S3 service (upload, download, delete)
3. Build upload endpoint (`POST /api/books/upload`)
4. Process EPUB: extract metadata, chapters, assets
5. Store chapters in database with full-text search
6. Upload assets to MinIO
7. Store original EPUB
8. Test complete upload flow

**Deliverables:**
- Working upload endpoint
- EPUB fully processed and stored
- Assets in MinIO
- Chapters searchable in database

### Phase 5: Reader API (Week 3-4)

**Goal:** Build API endpoints for reading books.

**Tasks:**
1. Implement book listing endpoint (`GET /api/books`)
2. Implement book details endpoint (`GET /api/books/:id`)
3. Implement chapter retrieval (`GET /api/books/:id/chapters/:num`)
4. Implement asset proxy (`GET /api/books/:id/assets/*`)
5. Add pagination to book list
6. Add caching headers for assets
7. Test all endpoints

**Deliverables:**
- Complete reader API
- Asset proxy with proper caching
- Pagination working

### Phase 6: Reading Features (Week 4)

**Goal:** Add progress tracking, annotations, and search.

**Tasks:**
1. Create ReadingProgress and Annotations models
2. Implement progress tracking endpoints
3. Implement annotation CRUD endpoints
4. Implement full-text search endpoint
5. Add search ranking and snippets
6. Test all features

**Deliverables:**
- Progress tracking working
- Annotations (highlights, notes) working
- Full-text search working with snippets

### Phase 7: Frontend (React) (Week 5-6)

**Goal:** Build React frontend for the reader.

**Tasks:**
1. Set up React project (Vite + TypeScript)
2. Create authentication UI (login, register)
3. Build library view (book list)
4. Build book upload UI
5. Create reader component (chapter display)
6. Implement pagination between chapters
7. Add annotation UI (highlight, notes)
8. Add search UI
9. Implement progress tracking
10. Polish UI/UX

**Deliverables:**
- Complete React application
- Functional EPUB reader
- All features integrated

---

## Environment Configuration

### `.env` File

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/collab_reader

# S3/MinIO
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=collab-reader
S3_REGION=us-east-1

# JWT
JWT_SECRET=your-super-secret-key-change-in-production

# Upload
MAX_UPLOAD_SIZE=52428800  # 50MB in bytes
```

### `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: collab-reader-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: collab_reader
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  minio:
    image: minio/minio:latest
    container_name: collab-reader-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"    # S3 API
      - "9001:9001"    # MinIO Console
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

### Package Dependencies

```json
{
  "dependencies": {
    "hono": "^4.0.0",
    "@hono/node-server": "^1.8.0",
    "drizzle-orm": "^0.33.0",
    "postgres": "^3.4.0",
    "@aws-sdk/client-s3": "^3.515.0",
    "jszip": "^3.10.1",
    "xml2js": "^0.6.2",
    "jsdom": "^24.0.0",
    "dompurify": "^3.0.9",
    "jose": "^5.2.0",
    "mime-types": "^2.1.35",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/jsdom": "^21.1.6",
    "@types/xml2js": "^0.4.14",
    "@types/dompurify": "^3.0.5",
    "@types/mime-types": "^2.1.4",
    "drizzle-kit": "^0.24.0",
    "typescript": "^5.3.3"
  }
}
```

---

## Deployment Guide

### Local Development Setup

1. **Start infrastructure:**
   ```bash
   docker-compose up -d
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Run migrations:**
   ```bash
   bun drizzle-kit push
   ```

4. **Create MinIO bucket:**
   - Open http://localhost:9001
   - Login: minioadmin / minioadmin
   - Create bucket named "collab-reader"
   - Set access policy to private

5. **Start development server:**
   ```bash
   bun run dev
   ```

### Production Deployment (Self-Hosted)

1. **Server requirements:**
   - Linux server (Ubuntu 22.04+ recommended)
   - Docker & Docker Compose
   - 2GB+ RAM
   - 20GB+ storage

2. **Update environment variables:**
   - Change JWT_SECRET to secure random string
   - Update database credentials
   - Configure domain/SSL

3. **Set up reverse proxy (Nginx):**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Set up SSL with Let's Encrypt:**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

5. **Run with process manager (PM2 or systemd):**
   ```bash
   bun build ./src/index.ts --outfile ./dist/index.js
   pm2 start dist/index.js --name collab-reader
   ```

---

## File Structure

```
collab-reader/
├── .env
├── .gitignore
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── README.md
├── AGENTS.md
├── docs/
│   └── ARCHITECTURE.md          # This file
├── src/
│   ├── index.ts
│   ├── app.ts
│   ├── config/
│   │   ├── database.ts
│   │   ├── s3.ts
│   │   └── env.ts
│   ├── db/
│   │   ├── schema.ts
│   │   └── migrations/
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── error.ts
│   │   └── cors.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── books.routes.ts
│   │   ├── chapters.routes.ts
│   │   ├── assets.routes.ts
│   │   ├── annotations.routes.ts
│   │   ├── progress.routes.ts
│   │   └── search.routes.ts
│   ├── services/
│   │   ├── epub/
│   │   │   ├── parser.ts
│   │   │   ├── sanitizer.ts
│   │   │   └── extractor.ts
│   │   ├── storage/
│   │   │   ├── s3.service.ts
│   │   │   └── db.service.ts
│   │   ├── auth/
│   │   │   ├── jwt.ts
│   │   │   └── password.ts
│   │   └── search.service.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── logger.ts
│       └── validators.ts
└── frontend/                    # React app (separate)
    ├── src/
    ├── public/
    └── package.json
```

---

## Security Considerations

1. **Authentication:**
   - Use strong JWT secrets (32+ characters, random)
   - Implement token refresh mechanism
   - Add rate limiting on auth endpoints
   - Hash passwords with bcrypt/argon2

2. **File Upload:**
   - Validate EPUB mimetype
   - Limit file size (50MB default)
   - Scan for malicious content
   - Sanitize all HTML before storage

3. **API Security:**
   - Enable CORS with whitelist
   - Add rate limiting (e.g., 100 req/min per user)
   - Validate all inputs with Zod
   - Use prepared statements (Drizzle handles this)

4. **S3/MinIO:**
   - Keep buckets private
   - Use IAM policies (in production)
   - Validate user access before serving assets
   - Consider encryption at rest

5. **Database:**
   - Use connection pooling
   - Enable SSL for production
   - Regular backups
   - Implement soft deletes for important data

---

## Testing Strategy

1. **Unit Tests:**
   - EPUB parser
   - HTML sanitizer
   - JWT utilities
   - Database models

2. **Integration Tests:**
   - API endpoints
   - Upload flow
   - Search functionality
   - Auth flow

3. **E2E Tests:**
   - Complete user journey
   - Upload → Read → Annotate → Search

4. **Performance Tests:**
   - Large EPUB handling (10MB+)
   - Concurrent uploads
   - Search response time
   - Asset serving speed

---

## Future Enhancements

1. **Features:**
   - Collaborative reading (share books)
   - Book collections/shelves
   - Reading statistics
   - Export annotations
   - Text-to-speech
   - Offline reading (PWA)

2. **Performance:**
   - Redis caching layer
   - CDN for assets
   - Database query optimization
   - Lazy loading chapters

3. **Admin:**
   - User management
   - Usage analytics
   - Storage monitoring
   - Backup automation

---

## Support & Resources

- **EPUB Specification:** http://idpf.org/epub/30
- **Drizzle ORM Docs:** https://orm.drizzle.team
- **Hono Documentation:** https://hono.dev
- **MinIO Documentation:** https://min.io/docs
- **PostgreSQL Full-Text Search:** https://www.postgresql.org/docs/current/textsearch.html
