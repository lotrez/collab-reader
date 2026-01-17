#!/usr/bin/env bun

import { parseEpub } from "../back/epub/parser";
import { readdir } from "fs/promises";
import { join } from "path";

const TEST_DATA_DIR = "./back/epub/test_data";

async function testParseAllEpubs() {
  console.log("🔍 Finding EPUB files in test_data directory...\n");

  try {
    // Get all files in test_data directory
    const files = await readdir(TEST_DATA_DIR);
    const epubFiles = files.filter((file) => file.endsWith(".epub"));

    if (epubFiles.length === 0) {
      console.log("❌ No EPUB files found in", TEST_DATA_DIR);
      return;
    }

    console.log(`📚 Found ${epubFiles.length} EPUB file(s):\n`);

    // Test each EPUB file
    for (const epubFile of epubFiles) {
      const epubPath = join(TEST_DATA_DIR, epubFile);

      console.log("━".repeat(80));
      console.log(`📖 Testing: ${epubFile}`);
      console.log("━".repeat(80));

      try {
        const startTime = performance.now();
        await parseEpub(epubPath);
        const endTime = performance.now();

        console.log(`\n✅ Successfully parsed!`);
        console.log(`   ⏱️  Time taken: ${(endTime - startTime).toFixed(2)}ms\n`);
      } catch (error) {
        console.error(`❌ Error parsing ${epubFile}:`, error);
        console.log("\n");
      }
    }

    console.log("━".repeat(80));
    console.log("✨ Test complete!");
    console.log("━".repeat(80));
  } catch (error) {
    console.error("❌ Error reading test data directory:", error);
  }
}

// Run the test
testParseAllEpubs();
