import { XMLParser } from "fast-xml-parser";
import * as fflate from "fflate";
import type {
  EpubContainer,
  OpfPackage,
  ParsedEpub
} from "./epub.model";
import { extractManifest, extractMetadata, extractSpine } from "./metadata";

// Configure XML parser
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "_text",
  parseAttributeValue: true,
  trimValues: true,
});

export const parseEpub = async (filePath: string) => {
  // unzip the epub file to ./temp/epub
  console.log(`Parsing EPUB file at: ${filePath}`);
  const unzippedEpub = await unzipEpub(filePath);
  console.log(JSON.stringify(Object.keys(unzippedEpub), null, 2));
}

export const createBookFromEpub = async (unzippedEpub: Record<string, Uint8Array>): Promise<ParsedEpub> => {
  // Step 1: Parse container.xml to find OPF path
  const containerPath = "META-INF/container.xml";
  const containerData = unzippedEpub[containerPath];
  
  if (!containerData) {
    throw new Error("Invalid EPUB: META-INF/container.xml not found");
  }
  
  const containerXml = new TextDecoder().decode(containerData);
  const container = xmlParser.parse(containerXml) as EpubContainer;
  
  // Extract OPF path
  const rootfile = container.container.rootfiles[0]?.rootfile?.[0];
  if (!rootfile) {
    throw new Error("Invalid EPUB: No rootfile found in container.xml");
  }
  
  const opfPath = rootfile.$["full-path"];
  const opfBasePath = opfPath.substring(0, opfPath.lastIndexOf("/")) || "";
  
  console.log(`Found OPF file at: ${opfPath}`);
  
  // Step 2: Parse OPF file
  const opfData = unzippedEpub[opfPath];
  if (!opfData) {
    throw new Error(`OPF file not found: ${opfPath}`);
  }
  
  const opfXml = new TextDecoder().decode(opfData);
  const opf = xmlParser.parse(opfXml) as OpfPackage;
  const pkg = opf.package;
  
  console.log(`Parsed OPF file, version: ${pkg.$.version}`);
  
  // Step 3: Extract metadata
  const metadata = extractMetadata(pkg.metadata[0], pkg.$.version);
  
  // Step 4: Extract manifest
  const manifest = extractManifest(pkg.manifest[0]);
  
  // Step 5: Extract spine
  const spine = extractSpine(pkg.spine[0]);
  
  // Step 6: Find cover and navigation items
  const coverItem = manifest.find(item => item.isCoverImage);
  const navigationItem = manifest.find(item => item.isNavigation);
  const ncxItem = manifest.find(item => item.mediaType === "application/x-dtbncx+xml");
  
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
}



export const unzipEpub = async (epubPath: string) => {
  // Read EPUB file as buffer
  const file = Bun.file(epubPath);
  const buffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);
  
  // Unzip the EPUB
  const unzipped = fflate.unzipSync(uint8Array);
  console.log(`Unzipped EPUB contains ${Object.keys(unzipped).length} files.`);
  return unzipped;
}
