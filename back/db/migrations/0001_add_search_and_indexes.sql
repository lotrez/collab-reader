-- Add search_vector generated column to chapters table
ALTER TABLE "chapters" ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('english', html_content)) STORED;

-- Create GIN index for full-text search
CREATE INDEX "chapters_search_vector_idx" ON "chapters" USING GIN (search_vector);

-- Create index on book_id for faster chapter lookups
CREATE INDEX "chapters_book_id_idx" ON "chapters"("book_id");

-- Create index on spine_index for ordered chapter retrieval
CREATE INDEX "chapters_spine_index_idx" ON "chapters"("book_id", "spine_index");

-- Create index on assets for faster lookups by book
CREATE INDEX "assets_book_id_idx" ON "assets"("book_id");

-- Create index on reading_progress for user lookups (when user table is added)
CREATE INDEX "reading_progress_book_id_idx" ON "reading_progress"("book_id");

-- Create index on annotations for chapter lookups
CREATE INDEX "annotations_chapter_id_idx" ON "annotations"("chapter_id");

-- Create updated_at trigger function for books table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for books table
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for reading_progress table
CREATE TRIGGER update_reading_progress_updated_at BEFORE UPDATE ON reading_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for annotations table
CREATE TRIGGER update_annotations_updated_at BEFORE UPDATE ON annotations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
