-- Rename cover_image_path to cover_image_key in books table
ALTER TABLE "books" RENAME COLUMN "cover_image_path" TO "cover_image_key";
