import { randomUUIDv7 } from "bun";
import { XMLParser } from "fast-xml-parser";
import type { NewBook } from "../db/schema";
import { minio } from "../s3/s3";
import type {
	DublinCoreElement,
	EpubContainer,
	EpubManifestItem,
	EpubMetadata,
	EpubSpineItem,
	OpfPackage,
	ParsedChapter,
	ParsedEpub,
} from "./epub.model";

// Configure XML parser
const xmlParser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: "",
	textNodeName: "_text",
	parseAttributeValue: false,
	trimValues: true,
});

/**
 * Find OPF file path from container.xml
 */
export function findOpfPath(unzippedEpub: Record<string, Uint8Array>): {
	opfPath: string;
	opfBasePath: string;
} {
	const containerPath = "META-INF/container.xml";
	const containerData = unzippedEpub[containerPath];

	if (!containerData) {
		throw new Error("Invalid EPUB: META-INF/container.xml not found");
	}

	const containerXml = new TextDecoder().decode(containerData);
	const container = xmlParser.parse(containerXml) as EpubContainer;

	// Extract OPF path
	const rootfile = container.container.rootfiles.rootfile;
	if (!rootfile) {
		throw new Error("Invalid EPUB: No rootfile found in container.xml");
	}

	const opfPath = rootfile["full-path"];
	const opfBasePath = opfPath.substring(0, opfPath.lastIndexOf("/")) || "";

	console.log(`Found OPF file at: ${opfPath}`);

	return { opfPath, opfBasePath };
}

/**
 * Parse OPF file and extract package data
 */
export function parseOpfFile(
	unzippedEpub: Record<string, Uint8Array>,
	opfPath: string,
): OpfPackage {
	const opfData = unzippedEpub[opfPath];
	if (!opfData) {
		throw new Error(`OPF file not found: ${opfPath}`);
	}

	const opfXml = new TextDecoder().decode(opfData);
	const opf = xmlParser.parse(opfXml) as OpfPackage;

	console.log(`Parsed OPF file, version: ${opf.package.version}`);

	return opf;
}

/**
 * Create NewBook object from EpubMetadata for database insertion
 */
export function createNewBookFromMetadata(
	metadata: EpubMetadata,
): Omit<NewBook, "userId" | "coverImageKey"> {
	return {
		title: metadata.title,
		author: metadata.author,
		publisher: metadata.publisher,
		language: metadata.language,
		isbn: metadata.isbn,
		description: metadata.description,
		epubVersion: metadata.epubVersion,
		createdAt: new Date(),
		updatedAt: new Date(),
	};
}

export const uploadCoverImage = async (
	unzippedEpub: Record<string, Uint8Array>,
	parsedEpub: ParsedEpub,
): Promise<string | null> => {
	try {
		if (parsedEpub.spine.length === 0) {
			console.warn("No spine items found");
			return null;
		}

		const firstSpineItem = parsedEpub.spine[0];
		if (!firstSpineItem) {
			console.warn("First spine item is undefined");
			return null;
		}

		const manifestItem = parsedEpub.manifest.find(
			(item) => item.id === firstSpineItem.idref,
		);

		if (!manifestItem) {
			console.warn(
				`Manifest item not found for spine ID: ${firstSpineItem.idref}`,
			);
			return null;
		}

		const htmlPath = `${parsedEpub.opfBasePath ? `${parsedEpub.opfBasePath}/` : ""}${manifestItem.href}`;
		const htmlData = unzippedEpub[htmlPath];

		if (!htmlData) {
			console.warn(`HTML file not found: ${htmlPath}`);
			return null;
		}

		const htmlContent = new TextDecoder().decode(htmlData);
		const htmlDir = htmlPath.substring(0, htmlPath.lastIndexOf("/")) || "";

		const xmlParser = new XMLParser({
			ignoreAttributes: false,
			attributeNamePrefix: "",
			textNodeName: "_text",
		});

		const parsedHtml = xmlParser.parse(htmlContent) as any;

		const findFirstImage = (node: any): string | null => {
			if (!node) {
				return null;
			}

			if (node.img) {
				const images = Array.isArray(node.img) ? node.img : [node.img];
				for (const img of images) {
					if (img.src) {
						return img.src;
					}
				}
			}

			if (node.html) {
				const found = findFirstImage(node.html);
				if (found) {
					return found;
				}
			}

			if (node.body) {
				const found = findFirstImage(node.body);
				if (found) {
					return found;
				}
			}

			if (node.div) {
				const divs = Array.isArray(node.div) ? node.div : [node.div];
				for (const div of divs) {
					const found = findFirstImage(div);
					if (found) {
						return found;
					}
				}
			}

			if (node.p) {
				const paragraphs = Array.isArray(node.p) ? node.p : [node.p];
				for (const p of paragraphs) {
					const found = findFirstImage(p);
					if (found) {
						return found;
					}
				}
			}

			return null;
		};

		const imageSrc = findFirstImage(parsedHtml);

		if (!imageSrc) {
			console.warn("No image found in first spine item");
			return null;
		}

		const resolvedImagePath = htmlDir ? `${htmlDir}/${imageSrc}` : imageSrc;

		const imageData = unzippedEpub[resolvedImagePath];

		if (!imageData) {
			console.warn(`Image file not found: ${resolvedImagePath}`);
			return null;
		}

		const extension = imageSrc.substring(imageSrc.lastIndexOf("."));
		const s3Key = `books/covers/${randomUUIDv7()}${extension}`;

		await minio.write(s3Key, imageData, {
			type: "image/jpeg",
		});

		console.log(`Uploaded cover image to MinIO: ${s3Key}`);
		return s3Key;
	} catch (error) {
		console.error("Error uploading cover image:", error);
		return null;
	}
};

/**
 * Extract and normalize metadata from OPF Dublin Core elements
 */
export function extractMetadata(
	metadataNode: any,
	epubVersion: string,
): EpubMetadata {
	// Helper to extract text from Dublin Core elements
	const getDcText = (
		element: string | DublinCoreElement | undefined,
	): string | undefined => {
		if (!element) return undefined;
		if (typeof element === "string") return element;
		return (element as any)._text || element._ || undefined;
	};

	// Helper to extract all authors
	const getAuthors = (creators: any): string[] => {
		if (!creators) return [];

		// Handle both array and single object cases
		const creatorsArray = Array.isArray(creators) ? creators : [creators];
		return creatorsArray
			.map((c: any) => getDcText(c))
			.filter((a): a is string => !!a);
	};

	const dcMetadata = metadataNode;
	const title = getDcText(dcMetadata["dc:title"]) || "Untitled";
	const authors = getAuthors(dcMetadata["dc:creator"]);
	const author = authors[0];
	const publisher = getDcText(dcMetadata["dc:publisher"]);
	const language = getDcText(dcMetadata["dc:language"]);
	const isbn = getDcText(dcMetadata["dc:identifier"]);
	const description = getDcText(dcMetadata["dc:description"]);
	const date = getDcText(dcMetadata["dc:date"]);
	const rights = getDcText(dcMetadata["dc:rights"]);

	// Extract subjects as array
	const subjects = dcMetadata["dc:subject"]
		? (Array.isArray(dcMetadata["dc:subject"])
				? dcMetadata["dc:subject"]
						.map((s: string | DublinCoreElement) => getDcText(s))
						.filter((s: string | undefined): s is string => !!s)
				: [getDcText(dcMetadata["dc:subject"])]
			).filter((s: string | undefined): s is string => !!s)
		: [];

	// Find cover image ID from meta tags
	let coverImageId: string | undefined;
	if (dcMetadata.meta) {
		const metas = Array.isArray(dcMetadata.meta)
			? dcMetadata.meta
			: [dcMetadata.meta];
		const coverMeta = metas.find(
			(m: any) => m.name === "cover" || m.property === "cover-image",
		);
		coverImageId = coverMeta?.content || coverMeta?.["#text"];
	}

	console.log(`Extracted metadata: ${title} by ${author}`);

	return {
		title,
		author,
		authors: authors.length > 0 ? authors : undefined,
		publisher,
		language,
		isbn,
		description,
		subject: subjects.length > 0 ? subjects : undefined,
		date,
		rights,
		coverImageId,
		epubVersion,
	};
}

/**
 * Extract and normalize manifest items
 */
export function extractManifest(manifestNode: any): EpubManifestItem[] {
	// Handle both cases: manifestNode.item is array or single object
	// Also handle case where manifestNode itself is already the manifest object
	const items = Array.isArray(manifestNode.item)
		? manifestNode.item
		: [manifestNode.item];

	return items.map((item: any) => {
		const properties = item.properties ? item.properties.split(" ") : [];
		const isNavigation = properties.includes("nav");
		const isCoverImage = properties.includes("cover-image");

		return {
			id: item.id,
			href: item.href,
			mediaType: item["media-type"],
			properties,
			isNavigation,
			isCoverImage,
		};
	});
}
/**
 * Extract and normalize spine items
 */
export function extractSpine(spineNode: any): EpubSpineItem[] {
	const itemrefs = Array.isArray(spineNode.itemref)
		? spineNode.itemref
		: [spineNode.itemref];

	return itemrefs.map((itemref: any) => ({
		idref: itemref.idref,
		linear: itemref.linear !== "no",
	}));
}

/**
 * Parse chapter HTML content and extract data
 */
export function parseChapterData(
	htmlContent: string,
	chapterNumber: number,
	spineIndex: number,
	href: string,
): ParsedChapter {
	// Debug: log raw HTML
	if (process.env.DEBUG) {
		console.log(
			`    Raw HTML (first 200 chars): "${htmlContent.substring(0, 200)}"`,
		);
	}

	// Parse HTML using the same XML parser for consistency
	const parsedHtml = xmlParser.parse(htmlContent) as any;

	// Debug: log parsed structure
	if (process.env.DEBUG) {
		console.log(
			`    Parsed HTML structure:`,
			JSON.stringify(parsedHtml, null, 2),
		);
	}

	// Extract title from <title> tag
	const title = parsedHtml.html?.head?.title;

	// Debug: log extracted title
	if (process.env.DEBUG) {
		console.log(`    Extracted title:`, title);
		console.log(`    Type:`, typeof title);
	}

	// Count words in the content
	// Better word count: only count words in the <body> section
	const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/is);
	const bodyContent = bodyMatch?.[1] || htmlContent;

	// Remove HTML tags and normalize whitespace
	const cleanContent = bodyContent
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	// Split into words and filter empty strings
	const words = cleanContent.split(" ").filter((word) => word.length > 0);
	const wordCount = words.length;

	console.log(
		`  Chapter ${chapterNumber}: "${title || "Untitled"}" (${wordCount} words)`,
	);

	return {
		chapterNumber,
		spineIndex,
		title,
		href,
		htmlContent: htmlContent.trim(),
		wordCount,
	};
}
