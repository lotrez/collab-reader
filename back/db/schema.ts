import { pgTable, uuid, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Books Table
 * Stores EPUB metadata and book information
 */
export const books = pgTable('books', {
  id: uuid('id').defaultRandom().primaryKey(),
  // TODO: Add userId reference once Google OAuth is implemented
  // userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Metadata
  title: text('title').notNull(),
  author: text('author'),
  publisher: text('publisher'),
  language: text('language'),
  isbn: text('isbn'),
  description: text('description'),
  coverImagePath: text('cover_image_path'), // S3 key for cover image
  
  // EPUB specific
  epubVersion: text('epub_version'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Chapters Table
 * Stores individual chapter HTML content with full-text search capability
 */
export const chapters = pgTable('chapters', {
  id: uuid('id').defaultRandom().primaryKey(),
  bookId: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  
  // Chapter metadata
  chapterNumber: integer('chapter_number').notNull(), // User-facing chapter number
  spineIndex: integer('spine_index').notNull(), // Order in EPUB spine
  title: text('title'), // Chapter title if available
  href: text('href').notNull(), // Original path in EPUB
  
  // Content
  htmlContent: text('html_content').notNull(),
  wordCount: integer('word_count'),
  
  // Full-text search (added via migration)
  // searchVector will be added as a generated column in migration
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Assets Table
 * Tracks images, fonts, CSS, and other static files stored in S3
 */
export const assets = pgTable('assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  bookId: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  
  // File information
  originalPath: text('original_path').notNull(), // Path in original EPUB
  s3Key: text('s3_key').notNull().unique(), // S3 object key
  s3Url: text('s3_url').notNull(), // Full S3 URL
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size'), // Size in bytes
  
  // Timestamps
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

/**
 * Reading Progress Table
 * Tracks where users left off in each book
 */
export const readingProgress = pgTable('reading_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  // TODO: Add userId reference once Google OAuth is implemented
  // userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bookId: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  chapterId: uuid('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
  
  // Progress tracking
  scrollPosition: integer('scroll_position').default(0), // Scroll position within chapter
  progressPercent: integer('progress_percent').default(0), // Overall book progress (0-100)
  
  // Timestamps
  lastReadAt: timestamp('last_read_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Annotations Table
 * Stores highlights, notes, and bookmarks
 */
export const annotations = pgTable('annotations', {
  id: uuid('id').defaultRandom().primaryKey(),
  // TODO: Add userId reference once Google OAuth is implemented
  // userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  chapterId: uuid('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
  
  // Annotation type
  type: text('type').notNull(), // 'highlight', 'note', 'bookmark'
  
  // Position information
  startOffset: integer('start_offset').notNull(),
  endOffset: integer('end_offset').notNull(),
  selectedText: text('selected_text'),
  
  // Content
  noteContent: text('note_content'), // User's note if type is 'note'
  color: text('color'), // Highlight color
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports for use in application code
export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;

export type Chapter = typeof chapters.$inferSelect;
export type NewChapter = typeof chapters.$inferInsert;

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;

export type ReadingProgress = typeof readingProgress.$inferSelect;
export type NewReadingProgress = typeof readingProgress.$inferInsert;

export type Annotation = typeof annotations.$inferSelect;
export type NewAnnotation = typeof annotations.$inferInsert;
