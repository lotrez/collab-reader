import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppContext } from "..";
import { assets, books, chapters, db } from "../db";
import { parseEpub } from "../epub/parser";
import { minio } from "../s3/s3";
import type {
  BookDetailResponse,
  BookResponse,
  BooksListResponse,
  ChapterContentResponse,
  ChapterListResponse,
  UploadBookResponse,
} from "../shared/dtos";

const app = new Hono<AppContext>();

app.get("/:id", async (c) => {
	const bookId = c.req.param("id");

	const book = await db.query.books.findFirst({
		where: eq(books.id, bookId),
		with: {
			chapters: {
				orderBy: chapters.spineIndex,
			},
		},
	});

	if (!book) {
		return c.json({ error: "Book not found" }, 404);
	}

	const chaptersList: ChapterListResponse[] = book.chapters.map((ch: any) => ({
		spineIndex: ch.spineIndex,
		title: ch.title,
	}));

	const response: BookDetailResponse = {
		...book,
		chapters: chaptersList,
	};

	return c.json(response);
});

app.get("/:bookId/chapters/:index", async (c) => {
	const bookId = c.req.param("bookId");
	const chapterIndex = parseInt(c.req.param("index"), 10);

	if (Number.isNaN(chapterIndex)) {
		return c.json({ error: "Invalid chapter index" }, 400);
	}

	const chapter = await db.query.chapters.findFirst({
		where: and(
			eq(chapters.bookId, bookId),
			eq(chapters.spineIndex, chapterIndex),
		),
	});

	if (!chapter) {
		return c.json({ error: "Chapter not found" }, 404);
	}

	const response: ChapterContentResponse = chapter;

	return c.json(response);
});

app.get("/", async (c) => {
	const user = c.get("user");

	if (!user) {
		return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
	}

	const userBooks = await db.query.books.findMany({
		where: eq(books.userId, user.id),
		orderBy: (books) => books.createdAt,
	});

	const response: BooksListResponse = { books: userBooks };

	return c.json(response);
});

app.put("/", async (c) => {
	const user = c.get("user");

	if (!user) {
		return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
	}

	const body = await c.req.parseBody();
	const file = body.file;

	if (!file) {
		return c.json({ error: "No file provided" }, 400);
	}
	if (!(file instanceof File)) {
		return c.json({ error: "Invalid file type" }, 400);
	}

	const buffer = await file.arrayBuffer();
	const parsedEpub = await parseEpub(buffer);

	const insertedBook = await db
		.insert(books)
		.values({
			...parsedEpub.newBook,
			userId: user.id,
		})
		.returning()
		.then((res) => res[0]);

	if (!insertedBook) {
		return c.json({ error: "Failed to insert book into database" }, 500);
	}

	const bookId = insertedBook.id;

	await db.insert(chapters).values(
		parsedEpub.chapters.map((chapter) => ({
			...chapter,
			bookId,
		})),
	);

	for (const [originalPath, data] of Object.entries(parsedEpub.assets)) {
		const s3Key = `books/${bookId}/assets/${originalPath}`;

		await minio.write(s3Key, data, {
			type: "application/octet-stream",
		});

		await db.insert(assets).values({
			bookId,
			originalPath,
			mimeType: "application/octet-stream",
			s3Key,
			fileSize: data.byteLength,
		});
	}

	const response: UploadBookResponse = {
		book: insertedBook,
		chaptersCount: parsedEpub.chapters.length,
	};

	return c.json(response);
});

export default app;
