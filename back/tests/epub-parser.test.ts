import { describe, test, expect } from "bun:test";
import * as fflate from "fflate";
import { findOpfPath, parseOpfFile, extractMetadata } from "../epub/metadata";
import { unzipEpub } from "../epub/parser";

const TEST_DATA_DIR = "./back/epub/test_data";

describe("EPUB Parser", () => {
  describe("Container XML Parsing", () => {
    test("should parse container.xml and find OPF path", async () => {
      const epubPath = `${TEST_DATA_DIR}/dumas_contes_grands_petits_enfants.epub`;
      const unzipped = await unzipEpub(epubPath);
      
      const result = findOpfPath(unzipped);
      
      expect(result.opfPath).toBe("Ops/content.opf");
      expect(result.opfBasePath).toBe("Ops");
    });

    test("should handle different base paths", async () => {
      // Test with an EPUB that might have a different structure
      const epubPath = `${TEST_DATA_DIR}/flaubert_tentation_saint_antoine.epub`;
      const unzipped = await unzipEpub(epubPath);
      
      const result = findOpfPath(unzipped);
      
      expect(result.opfPath).toBeTruthy();
      expect(result.opfPath).toContain(".opf");
      expect(result.opfBasePath).toBeTruthy();
    });
  });

  describe("OPF File Parsing", () => {
    test("should parse OPF file successfully", async () => {
      const epubPath = `${TEST_DATA_DIR}/dumas_contes_grands_petits_enfants.epub`;
      const unzipped = await unzipEpub(epubPath);
      const { opfPath } = findOpfPath(unzipped);
      const opf = parseOpfFile(unzipped, opfPath);
      
      expect(opf.package).toBeDefined();
      expect(opf.package.version).toBeTruthy();
      expect(opf.package.metadata).toBeDefined();
      expect(opf.package.manifest).toBeDefined();
      expect(opf.package.spine).toBeDefined();
    });

    test("should extract EPUB version", async () => {
      const epubPath = `${TEST_DATA_DIR}/dumas_contes_grands_petits_enfants.epub`;
      const unzipped = await unzipEpub(epubPath);
      const { opfPath } = findOpfPath(unzipped);
      const opf = parseOpfFile(unzipped, opfPath);
      
      expect(opf.package.version).toMatch(/^2\.|3\./); // EPUB 2.x or 3.x
    });

    test("should have metadata elements", async () => {
      const epubPath = `${TEST_DATA_DIR}/dumas_contes_grands_petits_enfants.epub`;
      const unzipped = await unzipEpub(epubPath);
      const { opfPath } = findOpfPath(unzipped);
      const opf = parseOpfFile(unzipped, opfPath);
      
      expect(opf.package.metadata).toBeDefined();
      expect(opf.package.metadata["dc:title"]).toBeDefined();
      expect(opf.package.manifest.item).toBeDefined();
      expect(opf.package.spine.itemref).toBeDefined();
    });
  });

  describe("Metadata Extraction", () => {
    test("should extract title from metadata", async () => {
      const epubPath = `${TEST_DATA_DIR}/dumas_contes_grands_petits_enfants.epub`;
      const unzipped = await unzipEpub(epubPath);
      const { opfPath } = findOpfPath(unzipped);
      const opf = parseOpfFile(unzipped, opfPath);
      const metadata = extractMetadata(opf.package.metadata, opf.package.version);
      
      expect(metadata.title).toBeTruthy();
      expect(metadata.title).not.toBe("Untitled");
      expect(typeof metadata.title).toBe("string");
    });

    test("should extract author if present", async () => {
      const epubPath = `${TEST_DATA_DIR}/dumas_contes_grands_petits_enfants.epub`;
      const unzipped = await unzipEpub(epubPath);
      const { opfPath } = findOpfPath(unzipped);
      const opf = parseOpfFile(unzipped, opfPath);
      const metadata = extractMetadata(opf.package.metadata, opf.package.version);
      
      expect(metadata.author).toBeDefined();
      if (metadata.author) {
        expect(typeof metadata.author).toBe("string");
      }
    });

    test("should include optional metadata fields when present", async () => {
      const epubPath = `${TEST_DATA_DIR}/dumas_contes_grands_petits_enfants.epub`;
      const unzipped = await unzipEpub(epubPath);
      const { opfPath } = findOpfPath(unzipped);
      const opf = parseOpfFile(unzipped, opfPath);
      const metadata = extractMetadata(opf.package.metadata, opf.package.version);
      
      // Check that the object has the expected structure
      expect(metadata).toHaveProperty("title");
      expect(metadata).toHaveProperty("author");
      expect(metadata).toHaveProperty("publisher");
      expect(metadata).toHaveProperty("language");
      expect(metadata).toHaveProperty("isbn");
      expect(metadata).toHaveProperty("description");
      expect(metadata).toHaveProperty("epubVersion");
    });

    test("should return 'Untitled' when title is missing", async () => {
      const epubPath = `${TEST_DATA_DIR}/dumas_contes_grands_petits_enfants.epub`;
      const unzipped = await unzipEpub(epubPath);
      const { opfPath } = findOpfPath(unzipped);
      const opf = parseOpfFile(unzipped, opfPath);
      
      // Manually remove title to test fallback
      const metadataWithoutTitle = { ...opf.package.metadata };
      delete metadataWithoutTitle["dc:title"];
      
      const metadata = extractMetadata(metadataWithoutTitle, opf.package.version);
      
      expect(metadata.title).toBe("Untitled");
    });
  });

  describe("Complete Parsing Flow", () => {
    test("should successfully parse complete EPUB structure", async () => {
      const epubPath = `${TEST_DATA_DIR}/dumas_contes_grands_petits_enfants.epub`;
      
      const unzipped = await unzipEpub(epubPath);
      
      // Step 1: Find OPF
      const { opfPath, opfBasePath } = findOpfPath(unzipped);
      expect(opfPath).toBeTruthy();
      
      // Step 2: Parse OPF
      const opf = parseOpfFile(unzipped, opfPath);
      expect(opf.package).toBeDefined();
      
      // Step 3: Extract metadata
      const metadata = extractMetadata(opf.package.metadata, opf.package.version);
      expect(metadata.title).toBeTruthy();
      
      // Step 4: Verify file structure
      expect(unzipped[opfPath]).toBeDefined();
      expect(Object.keys(unzipped).length).toBeGreaterThan(0);
    });

    test("should handle all test EPUB files", async () => {
      const { readdir } = await import("fs/promises");
      const { join } = await import("path");
      
      const files = await readdir(TEST_DATA_DIR);
      const epubFiles = files.filter((file) => file.endsWith(".epub"));
      
      expect(epubFiles.length).toBeGreaterThan(0);
      
      for (const epubFile of epubFiles) {
        const epubPath = join(TEST_DATA_DIR, epubFile);
        
        try {
          const unzipped = await unzipEpub(epubPath);
          const { opfPath } = findOpfPath(unzipped);
          const opf = parseOpfFile(unzipped, opfPath);
          
          expect(opf.package.metadata).toBeDefined();
          expect(opf.package.manifest.item).toBeDefined();
          expect(opf.package.spine.itemref).toBeDefined();
        } catch (error) {
          throw new Error(`Failed to parse ${epubFile}: ${error}`);
        }
      }
    });
  });

  describe("Error Handling", () => {
    test("should throw error if container.xml is missing", async () => {
      const unzipped = {} as Record<string, Uint8Array>;
      
      expect(() => findOpfPath(unzipped)).toThrow("META-INF/container.xml not found");
    });

    test("should throw error if rootfile is invalid", async () => {
      const unzipped = {
        "META-INF/container.xml": new TextEncoder().encode(
          '<?xml version="1.0"?><container><rootfiles></rootfiles></container>'
        ),
      } as Record<string, Uint8Array>;
      
      expect(() => findOpfPath(unzipped)).toThrow("No rootfile found");
    });

    test("should throw error if OPF file is not found", async () => {
      const epubPath = `${TEST_DATA_DIR}/dumas_contes_grands_petits_enfants.epub`;
      const unzipped = await unzipEpub(epubPath);
      
      // Modify to use non-existent OPF path
      expect(() => parseOpfFile(unzipped, "nonexistent.opf")).toThrow("OPF file not found");
    });
  });
});

describe("Utility Tests", () => {
  test("should correctly decode UTF-8 encoded files", async () => {
    const testContent = "Café au lait";
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const encoded = encoder.encode(testContent);
    const decoded = decoder.decode(encoded);
    
    expect(decoded).toBe(testContent);
  });

  test("should extract file paths from unzipped EPUB", async () => {
    const epubPath = `${TEST_DATA_DIR}/dumas_contes_grands_petits_enfants.epub`;
    const unzipped = await unzipEpub(epubPath);
    
    const keys = Object.keys(unzipped);
    
    expect(keys).toContain("mimetype");
    expect(keys).toContain("META-INF/container.xml");
    expect(keys.some(key => key.endsWith(".opf"))).toBe(true);
    expect(keys.some(key => key.endsWith(".html") || key.endsWith(".xhtml"))).toBe(true);
  });
});
