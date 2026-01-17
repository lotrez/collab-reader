import { relations } from 'drizzle-orm';
import { boolean, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';


export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

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
  isbn: text('isbn').unique(),
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


export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

export const booksRelations = relations(books, ({ many }) => ({
  chapters: many(chapters),
  assets: many(assets),
}))

export const chaptersRelations = relations(chapters, ({ one }) => ({
  book: one(books, {
    fields: [chapters.bookId],
    references: [books.id],
  }),
}))

export const assetsRelations = relations(assets, ({ one }) => ({
  book: one(books, {
    fields: [assets.bookId],
    references: [books.id],
  }),
}))


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
