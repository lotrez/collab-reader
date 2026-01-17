import { Hono } from "hono"
import { parseEpub } from "../epub/parser"

const app = new Hono()

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
  const parsedEpub = parseEpub(buffer)
  return c.json({ message: 'EPUB parsed successfully', parsedEpub })
})

export default app