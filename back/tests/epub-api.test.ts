import { describe, expect, test } from "bun:test";
import * as fflate from "fflate";
import { parseEpub } from "../epub/parser";

describe("EPUB Parser API", () => {
  describe("parseEpub", () => {
    test("should parse EPUB file from buffer", async () => {
      const epubPath = "back/epub/test_data/dumas_contes_grands_petits_enfants.epub";
      
      const file = Bun.file(epubPath);
      const buffer = await file.arrayBuffer();
      const result = await parseEpub(buffer);
      
      expect(result).toBeDefined();
      expect(result.newBook).toBeDefined();
      expect(result.newBook.title).toBeTruthy();
      expect(result.parsedEpub).toBeDefined();
      expect(result.parsedEpub.metadata.title).toBeTruthy();
      expect(result.parsedEpub.manifest.length).toBeGreaterThan(0);
    });

    test("should handle invalid EPUB file", async () => {
      const invalidBuffer = new ArrayBuffer(100);
      await expect(parseEpub(invalidBuffer)).rejects.toThrow();
    });

    test("should return correct structure", async () => {
      const epubPath = "back/epub/test_data/dumas_contes_grands_petits_enfants.epub";
      const file = Bun.file(epubPath);
      const buffer = await file.arrayBuffer();
      const result = await parseEpub(buffer);
      
      expect(result).toHaveProperty("parsedEpub");
      expect(result).toHaveProperty("newBook");
      expect(result.parsedEpub).toHaveProperty("metadata");
      expect(result.parsedEpub).toHaveProperty("manifest");
      expect(result.parsedEpub).toHaveProperty("spine");
      expect(result.parsedEpub).toHaveProperty("opfPath");
      expect(result.parsedEpub).toHaveProperty("opfBasePath");
    });

    test("should extract all test EPUBs", async () => {
      const TEST_DATA_DIR = "back/epub/test_data";
      const { readdir } = await import("fs/promises");
      const { join } = await import("path");
      const files = await readdir(TEST_DATA_DIR);
      const epubFiles = files.filter((file) => file.endsWith(".epub"));
      
      expect(epubFiles.length).toBeGreaterThan(0);
      
      for (const epubFile of epubFiles) {
        const epubPath = join(TEST_DATA_DIR, epubFile);
        const file = Bun.file(epubPath);
        const buffer = await file.arrayBuffer();
        const result = await parseEpub(buffer);
        
        expect(result.newBook.title).toBeTruthy();
      }
    });
  });

  describe("Integration with unzip", () => {
    test("should work with fflate unzip", async () => {
      const epubPath = "back/epub/test_data/dumas_contes_grands_petits_enfants.epub";
      
      const file = Bun.file(epubPath);
      const buffer = await file.arrayBuffer();
      const unzipped = fflate.unzipSync(new Uint8Array(buffer));
      
      expect(Object.keys(unzipped).length).toBeGreaterThan(0);
      expect(unzipped["META-INF/container.xml"]).toBeDefined();
    });
  });

  describe("Performance", () => {
    test("should parse EPUB quickly", async () => {
      const epubPath = "back/epub/test_data/dumas_contes_grands_petits_enfants.epub";
      const file = Bun.file(epubPath);
      const buffer = await file.arrayBuffer();
      
      const startTime = performance.now();
      const result = await parseEpub(buffer);
      const endTime = performance.now();
      
      expect(result.newBook.title).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
