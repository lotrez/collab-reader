import { Hono } from "hono"
import { eq } from "drizzle-orm"
import { assets, books, chapters, db } from "../db"
import { parseEpub } from "../epub/parser"
import { minio } from "../s3/s3"

const app = new Hono()

app.get('/:id', async (c) => {
  const bookId = c.req.param('id')
  
  const book = await db.query.books.findFirst({
    where: eq(books.id, bookId),
  })
  
  if (!book) {
    return c.json({ error: 'Book not found' }, 404)
  }
  
  return c.json(book)
})

app.get('/:bookId/chapters/:index', async (c) => {
  const bookId = c.req.param('bookId')
  const chapterIndex = parseInt(c.req.param('index'))
  
  if (isNaN(chapterIndex)) {
    return c.json({ error: 'Invalid chapter index' }, 400)
  }
  
  const chapter = await db.query.chapters.findFirst({
    where: eq(chapters.spineIndex, chapterIndex),
  })
  
  if (!chapter) {
    return c.json({ error: 'Chapter not found' }, 404)
  }
  
  return c.json(chapter)
})

app.put('/', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']
  // file to ArrayBuffer
  if (!file) {
    return c.json({ error: 'No file provided' }, 400)
  }
  if(!(file instanceof File)) {
    return c.json({ error: 'Invalid file type' }, 400)
  }
  const buffer = await file.arrayBuffer()
  const parsedEpub = await parseEpub(buffer)
  // create book in db
  const insertedBook = await db.insert(books).values(parsedEpub.newBook).returning().then(res => res[0])
  // if the book was not inserted, return error
  if (!insertedBook) {
    return c.json({ error: 'Failed to insert book into database' }, 500)
  }
  const bookId = insertedBook.id
  // insert chapters into db
  await db.insert(chapters).values(parsedEpub.chapters.map(chapter => ({
    ...chapter,
    bookId: bookId,
  })))
  // add all assets to s3 and add them to the assets table
  for (const [originalPath, data] of Object.entries(parsedEpub.assets)) {
    const s3Key = `books/${bookId}/assets/${originalPath}`
    // upload to s3
    await minio.write(s3Key, data, {
      type: 'application/octet-stream',
      
    })
    await db.insert(assets).values({
      bookId: bookId,
      originalPath: originalPath,
      mimeType: 'application/octet-stream',
      s3Key: s3Key,
      fileSize: data.byteLength,
    })
  }
  return c.json({ book: insertedBook, chaptersCount: parsedEpub.chapters.length })
})

export default app