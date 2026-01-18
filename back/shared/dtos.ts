import type {
  Book,
  Chapter,
  ReadingProgress,
  Annotation
} from '../db/schema';

export type BookResponse = {
  id: string;
  title: string;
  author: string | null;
  publisher: string | null;
  language: string | null;
  isbn: string | null;
  description: string | null;
  coverImageKey: string | null;
  epubVersion: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ChapterListResponse = {
  spineIndex: number;
  title: string | null;
};

export type BookDetailResponse = BookResponse & {
  chapters: ChapterListResponse[];
};

export type ChapterContentResponse = {
  id: string;
  bookId: string;
  chapterNumber: number;
  spineIndex: number;
  title: string | null;
  href: string;
  htmlContent: string;
  wordCount: number | null;
  createdAt: Date;
};

export type ReadingProgressResponse = {
  id: string;
  bookId: string;
  chapterId: string;
  scrollPosition: number;
  progressPercent: number;
  lastReadAt: Date;
  updatedAt: Date;
};

export type AnnotationResponse = {
  id: string;
  chapterId: string;
  type: 'highlight' | 'note' | 'bookmark';
  startOffset: number;
  endOffset: number;
  selectedText: string | null;
  noteContent: string | null;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BooksListResponse = {
  books: BookResponse[];
};

export type UploadBookResponse = {
  book: BookResponse;
  chaptersCount: number;
};
