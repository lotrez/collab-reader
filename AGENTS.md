# AGENTS.md - Developer & AI Agent Guide

## Project Overview

**Collab Reader** - Web-based EPUB reader with collaborative features
- **Backend:** Bun + Hono + PostgreSQL + Drizzle ORM
- **Storage:** MinIO (S3-compatible)
- **Frontend:** React (not yet implemented)
- **Auth:** Better Auth (planned)

## Essential Commands

```bash
# Development
bun run dev:back              # Start backend dev server
bun build ./back/index.ts --outfile ./dist/index.js  # Build for production

# Database
bun run db:generate           # Generate migrations
bun run db:push               # Apply schema changes
bun run db:studio             # Open Drizzle Studio

# Testing
bun test back/tests           # Run all tests
bun test back/tests/epub-parser.test.ts  # Run single test file

# Infrastructure
docker-compose up -d          # Start PostgreSQL + MinIO
```

## Coding Standards

### TypeScript
- **Strict mode enabled** - Check `tsconfig.json`
- **No `any` types** - Use proper typing
- **Explicit return types** - Declare function returns
- **Use type imports** - `import type { ... }` for types only

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

### Imports & Formatting
- **ES modules only** - Use `import`/`export`, no CommonJS
- **Named exports preferred** - Default exports only for main entry points
- **Group imports:** external libs → internal modules → type imports
- **No trailing commas in single-line imports**

```typescript
import { Hono } from 'hono'
import { db, books } from '../db'
import type { Book, Chapter } from '../db/schema'
```

### File Organization
```
back/
├── index.ts          # Main app entry
├── routes/           # Hono route handlers
├── services/         # Business logic
├── db/               # Drizzle schema & migrations
├── epub/             # EPUB parsing utilities
├── s3/               # S3/MinIO client
└── tests/            # Test files (bun:test)
```

**Rules:**
1. **Routes are thin** - Validate input, call services, return responses
2. **Services contain logic** - Reusable business operations
3. **Use barrel exports** - `index.ts` for cleaner imports

### Naming Conventions
- **Files:** kebab-case (`epub-parser.ts`, `book.service.ts`)
- **Functions:** camelCase (`parseEpub`, `getBook`)
- **Classes/Types:** PascalCase (`Book`, `Chapter`, `EpubParser`)
- **Constants:** SCREAMING_SNAKE_CASE (`MAX_UPLOAD_SIZE`)

### Error Handling
```typescript
// Good - Structured error responses
return c.json({ error: 'Book not found', code: 'BOOK_NOT_FOUND' }, 404)

// Good - Throwing for programmatic errors
throw new Error('Failed to parse EPUB')

// Bad - Generic unhelpful errors
throw new Error('something went wrong')
```

### Database Queries
```typescript
// Good - Use Drizzle query builder
const book = await db.query.books.findFirst({
  where: eq(books.id, bookId),
  with: { chapters: true },
})

// Good - Use transactions for multi-step operations
await db.transaction(async (tx) => {
  await tx.insert(books).values(bookData)
  await tx.insert(chapters).values(chapterData)
})

// Bad - Raw SQL (unless absolutely necessary)
```

## Frontend Development

### Tech Stack
- **Framework:** React 19 with Vite
- **Routing:** TanStack Router
- **Styling:** Tailwind CSS + shadcn/ui + Neobrutalism components
- **Theme:** Black and white (configured)

### Frontend Commands
```bash
# Development
bun run dev:front             # Start Vite dev server (port 5173)
bun run dev                   # Start both backend (3000) and frontend (5173)

# Build
bun run build                 # Build frontend for production
```

### File Organization
```
front/
├── components/
│   └── ui/                   # shadcn/ui + neobrutalism components
├── lib/
│   └── utils.ts              # Utility functions (cn helper)
├── index.css                 # Global styles + Tailwind directives
├── App.tsx                   # Root component with RouterProvider
├── router.tsx                # TanStack Router configuration
└── main.tsx                  # Entry point
```

### Neobrutalism Components

The project uses **neobrutalism.dev** components based on shadcn/ui with a black and white theme.

#### Installing Components

Use the shadcn CLI to install neobrutalism components:

```bash
# Install a button component with neobrutalism style
bunx shadcn@latest add https://neobrutalism.dev/r/button.json

# Install a card component
bunx shadcn@latest add https://neobrutalism.dev/r/card.json
```

Visit [neobrutalism.dev](https://www.neobrutalism.dev) to find available components and their installation URLs.

#### Using Components

```typescript
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Neobrutalism Card</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Content here</p>
        <Button>Click me</Button>
      </CardContent>
    </Card>
  )
}
```

#### Theme Configuration

The black and white theme is pre-configured in `front/index.css`:

```css
@layer base {
  :root {
    --background: 0 0% 100%;      /* White background */
    --foreground: 0 0% 0%;        /* Black text */
    /* ... other variables are black/white */
  }

  .dark {
    --background: 0 0% 0%;       /* Black background */
    --foreground: 0 0% 100%;      /* White text */
    /* ... inverted for dark mode */
  }
}
```

#### Available Styles

Neobrutalism components support:
- Default: Black border, white background
- Dark mode: White border, black background
- Shadows: Offset shadow effect
- Hover states with shadow reduction

### TanStack Router

Use file-based routing defined in `front/router.tsx`:

```typescript
import { createRouter, createRootRoute, createRoute } from '@tanstack/react-router'

const rootRoute = createRootRoute({
  component: () => <div>Root layout</div>,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Index,
})

function Index() {
  return <div>Home page</div>
}

const routeTree = rootRoute.addChildren([indexRoute])
export const router = createRouter({ routeTree })
```

Add new routes by creating route definitions and adding them to `routeTree`.

### Styling Guidelines

- **Use Tailwind utility classes** for layout and spacing
- **Use neobrutalism components** for UI elements (buttons, cards, inputs)
- **Custom styles** go in `front/index.css` using Tailwind's `@layer` directives
- **Dark mode** support built-in with `.dark` class

```typescript
// Good - Using neobrutalism components
import { Button } from '@/components/ui/button'
<Button className="w-full">Submit</Button>

// Good - Using Tailwind utilities
<div className="flex gap-4 p-6 rounded-lg">Content</div>
```

## Testing

Use **bun:test** for all tests:

```typescript
import { describe, test, expect } from 'bun:test'

describe('EpubParser', () => {
  test('should parse valid EPUB', async () => {
    const result = await parseEpub(buffer)
    expect(result.metadata.title).toBe('Sample Book')
  })
})
```

- **Unit tests:** Test services/utils in isolation
- **Integration tests:** Test API endpoints with real database
- **Test files:** Place in `back/tests/` with `.test.ts` extension
- **Run single test:** `bun test back/tests/epub-parser.test.ts`

## Development Workflow

1. **Check existing code** - Look for similar patterns
2. **Update schema** if needed → Edit `back/db/schema.ts` → `bun run db:push`
3. **Write service layer** - Business logic first
4. **Create routes** - Wire up HTTP endpoints in `back/routes/`
5. **Write tests** - Unit tests for services, integration for routes
6. **Test manually** - Use curl, Postman, or Thunder Client

## Technical Decisions

| Aspect | Decision |
|--------|----------|
| EPUB Processing | Unzip on upload (one-time cost, enables search) |
| HTML Storage | PostgreSQL text columns (fast queries, full-text search) |
| Asset Storage | MinIO/S3 (scalable, cost-effective) |
| Asset Serving | API proxy (security, access control) |
| ORM | Drizzle (lightweight, excellent TypeScript) |
| Framework | Hono (fast, portable, clean API) |

## Architecture Reference

**See `/docs/ARCHITECTURE.md` for:**
- Complete database schema
- API endpoint specifications
- Implementation phases
- EPUB processing workflow

## Quick Start for AI Agents

When implementing a feature:
1. Read `/docs/ARCHITECTURE.md` for context
2. Check existing code for patterns to follow
3. Follow strict TypeScript typing (no `any`)
4. Write tests using `bun:test`
5. Keep routes thin, put logic in services
6. Update this file if adding new patterns
