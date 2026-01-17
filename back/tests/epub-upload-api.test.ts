import { describe, test, expect } from "bun:test";
import app from "../index";

describe("EPUB Upload API", () => {
  describe("PUT /epub/", () => {
    test("should successfully upload and parse a valid EPUB", async () => {
      const epubPath = "back/epub/test_data/dumas_contes_grands_petits_enfants.epub";
      const file = Bun.file(epubPath);
      
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await app.request("/epub", {
        method: "PUT",
        body: formData,
      });
      
      expect(res.status).toBe(200);
      
      const json = await res.json() as any;
      expect(json.message).toBe("EPUB parsed successfully");
      expect(json.parsedEpub).toBeDefined();
      expect(json.parsedEpub.parsedEpub).toBeDefined();
      expect(json.parsedEpub.newBook).toBeDefined();
      expect(json.parsedEpub.chapters).toBeDefined();
      expect(json.parsedEpub.assets).toBeDefined();
    });

    test("should return 400 when no file is provided", async () => {
      const formData = new FormData();
      
      const res = await app.request("/epub", {
        method: "PUT",
        body: formData,
      });
      
      expect(res.status).toBe(400);
      
      const json = await res.json() as { error: string };
      expect(json.error).toBe("No file provided");
    });

    test("should return 400 when file field is not a File object", async () => {
      const formData = new FormData();
      formData.append("file", "not a file");
      
      const res = await app.request("/epub", {
        method: "PUT",
        body: formData,
      });
      
      expect(res.status).toBe(400);
      
      const json = await res.json() as { error: string };
      expect(json.error).toBe("Invalid file type");
    });

    test("should handle multiple EPUB files from test_data", async () => {
      const TEST_DATA_DIR = "back/epub/test_data";
      const { readdir } = await import("fs/promises");
      const { join } = await import("path");
      
      const files = await readdir(TEST_DATA_DIR);
      const epubFiles = files.filter((file) => file.endsWith(".epub"));
      
      expect(epubFiles.length).toBeGreaterThan(0);
      
      for (const epubFile of epubFiles) {
        const epubPath = join(TEST_DATA_DIR, epubFile);
        const file = Bun.file(epubPath);
        
        const formData = new FormData();
        formData.append("file", file);
        
        const res = await app.request("/epub", {
          method: "PUT",
          body: formData,
        });
        
        expect(res.status).toBe(200);
        
        const json = await res.json() as any;
        expect(json.message).toBe("EPUB parsed successfully");
        expect(json.parsedEpub.newBook).toBeDefined();
        expect(json.parsedEpub.newBook.title).toBeTruthy();
      }
    });
  });

  describe("Performance", () => {
    test("should process EPUB upload within reasonable time", async () => {
      const epubPath = "back/epub/test_data/dumas_contes_grands_petits_enfants.epub";
      const file = Bun.file(epubPath);
      
      const formData = new FormData();
      formData.append("file", file);
      
      const startTime = performance.now();
      const res = await app.request("/epub", {
        method: "PUT",
        body: formData,
      });
      const endTime = performance.now();
      
      expect(res.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });
});
