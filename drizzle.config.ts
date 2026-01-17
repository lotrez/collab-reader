import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './back/db/schema.ts',
  out: './back/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/collab_reader',
  },
  verbose: true,
  strict: true,
});
