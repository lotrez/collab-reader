import * as fflate from "fflate";
import type { NewChapter } from "../db";
import type { EpubManifestItem, ParsedEpub } from "./epub.model";
import {
	createNewBookFromMetadata,
	extractManifest,
	extractMetadata,
	extractSpine,
	findOpfPath,
	parseChapterData,
	parseOpfFile,
	uploadCoverImage,
} from "./metadata";

export const parseEpub = async (epubFile: ArrayBuffer) => {
	const unzippedEpub = await unzipEpub(epubFile);
	console.log(
		`Unzipped EPUB contains ${Object.keys(unzippedEpub).length} files.`,
	);

	const parsedEpub = await extractEpubInfo(unzippedEpub);
	const newBook = createNewBookFromMetadata(parsedEpub.metadata);

	console.log("NewBook object ready for database insertion:");
	console.log(JSON.stringify(newBook, null, 2));

	const chapters = await parseChapters(
		parsedEpub.spine,
		parsedEpub.manifest,
		parsedEpub.opfBasePath,
		unzippedEpub,
	);
	const assets = parseAssets(
		unzippedEpub,
		parsedEpub.manifest,
		parsedEpub.opfBasePath,
	);
	const coverImageKey = await uploadCoverImage(unzippedEpub, parsedEpub);

	console.log(
		`Parsed ${chapters.length} chapters and ${Object.keys(assets).length} assets.`,
	);
	return { parsedEpub, newBook, chapters, assets, unzippedEpub, coverImageKey };
};

export const parseAssets = (
	unzippedEpub: Record<string, Uint8Array>,
	manifest: EpubManifestItem[],
	opfBasePath: string,
) => {
	const assets: Record<string, Uint8Array> = {};

	for (const item of manifest) {
		// Skip HTML content files
		if (
			item.mediaType === "application/xhtml+xml" ||
			item.mediaType === "text/html"
		) {
			continue;
		}

		// Construct full file path
		const assetPath = `${opfBasePath ? `${opfBasePath}/` : ""}${item.href}`;
		const assetData = unzippedEpub[assetPath];
		if (assetData) {
			assets[item.href] = assetData;
		} else {
			console.warn(`Asset file not found: ${assetPath}`);
		}
	}

	return assets;
};

export const parseChapters = async (
	spineItems: ParsedEpub["spine"],
	manifest: EpubManifestItem[],
	opfBasePath: string,
	unzippedEpub: Record<string, Uint8Array>,
) => {
	const newChapters: Omit<NewChapter, "bookId">[] = [];
	for (const [index, spineItem] of spineItems.entries()) {
		// Look up the manifest item to get the actual file path (href)
		const manifestItem = manifest.find((item) => item.id === spineItem.idref);
		if (!manifestItem) {
			console.warn(`Manifest item not found for spine ID: ${spineItem.idref}`);
			continue;
		}

		// Construct full file path: opfBasePath + "/" + href
		const chapterPath = `${opfBasePath ? `${opfBasePath}/` : ""}${manifestItem.href}`;
		const chapterString = new TextDecoder().decode(unzippedEpub[chapterPath]);
		if (!chapterString) {
			console.warn(`Chapter file not found: ${chapterPath}`);
			continue;
		}
		console.log(
			"100 first characters of chapter content:",
			chapterString.slice(0, 100),
		);
		const chapterData = parseChapterData(
			chapterString,
			index + 1,
			index,
			manifestItem.href,
		);
		if (!chapterData) {
			console.warn(`Chapter file not found: ${chapterPath}`);
			continue;
		}
		newChapters.push({
			title: chapterData.title,
			wordCount: chapterData.wordCount,
			chapterNumber: chapterData.chapterNumber,
			href: manifestItem.href,
			htmlContent: chapterData.htmlContent,
			spineIndex: index,
		});
	}
	return newChapters;
};

export const extractEpubInfo = async (
	unzippedEpub: Record<string, Uint8Array>,
): Promise<ParsedEpub> => {
	// Step 1: Find OPF path from container.xml
	const { opfPath, opfBasePath } = findOpfPath(unzippedEpub);

	// Step 2: Parse OPF file
	const opf = parseOpfFile(unzippedEpub, opfPath);
	const pkg = opf.package;

	// Step 3: Extract metadata
	const metadata = extractMetadata(pkg.metadata, pkg.version);

	// Step 4: Extract manifest
	const manifest = extractManifest(pkg.manifest);

	// Step 5: Extract spine
	const spine = extractSpine(pkg.spine);

	// Step 6: Find cover and navigation items
	const coverItem = manifest.find((item) => item.isCoverImage);
	const navigationItem = manifest.find((item) => item.isNavigation);
	const ncxItem = manifest.find(
		(item) => item.mediaType === "application/x-dtbncx+xml",
	);

	return {
		metadata,
		manifest,
		spine,
		opfPath,
		opfBasePath,
		coverItem,
		navigationItem,
		ncxItem,
	};
};

export const unzipEpub = async (epubBuffer: ArrayBuffer) => {
	const uint8Array = new Uint8Array(epubBuffer);

	// Unzip the EPUB
	const unzipped = fflate.unzipSync(uint8Array);
	console.log(`Unzipped EPUB contains ${Object.keys(unzipped).length} files.`);
	return unzipped;
};
