import { describe, test, expect } from 'bun:test'
import { uploadCoverImage } from '../epub/parser'
import { unzipEpub } from '../epub/parser'
import type { ParsedEpub } from '../epub/epub.model'
import { minio } from '../s3/s3'
import { file } from 'bun'

describe('uploadCoverImage', () => {
	test('should extract and upload cover image from first spine item', async () => {
		const epubPath = import.meta.dir + '/../epub/test_data/alabordage.epub'
		const epubBuffer = await file(epubPath).arrayBuffer()

		const unzippedEpub = await unzipEpub(epubBuffer)

		const bookId = 'test-book-id-123'

		const mockParsedEpub: any = {
			metadata: {
				title: 'A l abordage',
				author: 'Anders Bengtson',
			},
			manifest: [
				{
					id: 'titlepage',
					href: 'titlepage.xhtml',
					mediaType: 'application/xhtml+xml',
				},
				{
					id: 'id1',
					href: 'page_1.xhtml',
					mediaType: 'application/xhtml+xml',
				},
			],
			spine: [
				{
					idref: 'titlepage',
					linear: true,
				},
			],
			opfPath: 'content.opf',
			opfBasePath: '',
		}

		const s3Key = await uploadCoverImage(unzippedEpub, mockParsedEpub, bookId)

		expect(s3Key).not.toBeNull()
		expect(s3Key).toContain('books/test-book-id-123/cover')
	})

	test('should extract cover from unzipped_epub test data', async () => {
		const epubPath = import.meta.dir + '/../epub/test_data/eliot_moulin_floss_1.epub'
		const epubBuffer = await file(epubPath).arrayBuffer()

		const unzippedEpub = await unzipEpub(epubBuffer)

		const bookId = 'test-book-id-456'

		const mockParsedEpub: any = {
			metadata: {
				title: 'Le Moulin sur la Floss - Tome I',
				author: 'George Eliot',
			},
			manifest: [
				{
					id: 'id001',
					href: '001.html',
					mediaType: 'application/xhtml+xml',
				},
				{
					id: 'id002',
					href: '002.html',
					mediaType: 'application/xhtml+xml',
				},
			],
			spine: [
				{
					idref: 'id001',
					linear: true,
				},
			],
			opfPath: 'Ops/content.opf',
			opfBasePath: 'Ops',
		}

		const s3Key = await uploadCoverImage(unzippedEpub, mockParsedEpub, bookId)

		expect(s3Key).not.toBeNull()
		expect(s3Key).toContain('books/test-book-id-456/cover')
	})

	test('should return null when spine is empty', async () => {
		const unzippedEpub: Record<string, Uint8Array> = {}

		const mockParsedEpub: any = {
			metadata: {
				title: 'Test Book',
			},
			manifest: [],
			spine: [],
			opfPath: 'content.opf',
			opfBasePath: '',
		}

		const bookId = 'test-book-id-empty'
		const s3Key = await uploadCoverImage(unzippedEpub, mockParsedEpub, bookId)

		expect(s3Key).toBeNull()
	})

	test('should return null when first spine item HTML file not found', async () => {
		const unzippedEpub: Record<string, Uint8Array> = {}

		const mockParsedEpub: any = {
			metadata: {
				title: 'Test Book',
			},
			manifest: [
				{
					id: 'chapter1',
					href: 'missing.html',
					mediaType: 'application/xhtml+xml',
				},
			],
			spine: [
				{
					idref: 'chapter1',
					linear: true,
				},
			],
			opfPath: 'content.opf',
			opfBasePath: '',
		}

		const bookId = 'test-book-id-missing'
		const s3Key = await uploadCoverImage(unzippedEpub, mockParsedEpub, bookId)

		expect(s3Key).toBeNull()
	})

	test('should return null when first spine item has no images', async () => {
		const htmlContent = `<?xml version="1.0" encoding="utf-8"?>
<html>
<body>
<p>Some text without images</p>
</body>
</html>`

		const unzippedEpub: Record<string, Uint8Array> = {
			'chapter1.html': new TextEncoder().encode(htmlContent),
		}

		const mockParsedEpub: any = {
			metadata: {
				title: 'Test Book',
			},
			manifest: [
				{
					id: 'chapter1',
					href: 'chapter1.html',
					mediaType: 'application/xhtml+xml',
				},
			],
			spine: [
				{
					idref: 'chapter1',
					linear: true,
				},
			],
			opfPath: 'content.opf',
			opfBasePath: '',
		}

		const bookId = 'test-book-id-no-image'
		const s3Key = await uploadCoverImage(unzippedEpub, mockParsedEpub, bookId)

		expect(s3Key).toBeNull()
	})
})
