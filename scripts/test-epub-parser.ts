#!/usr/bin/env bun

/**
 * Test script for EPUB parser
 * Tests the parseEpub method and displays detailed parsing results
 * 
 * Usage:
 *   bun run scripts/test-epub-parser.ts
 *   bun run scripts/test-epub-parser.ts path/to/specific/book.epub
 */

import { parseEpub } from "../back/epub/parser";
import { readdir } from "fs/promises";
import { join } from "path";

const TEST_DATA_DIR = "./back/epub/test_data";

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Display parsed EPUB details
 */
function displayParsedEpub(result: any) {
  const { parsedEpub, newBook } = result;

  console.log("\n📋 METADATA:");
  console.log("─".repeat(80));
  console.log(`   Title:        ${parsedEpub.metadata.title}`);
  console.log(`   Author:       ${parsedEpub.metadata.author || "Unknown"}`);
  console.log(`   Publisher:    ${parsedEpub.metadata.publisher || "N/A"}`);
  console.log(`   Language:     ${parsedEpub.metadata.language || "N/A"}`);
  console.log(`   ISBN:         ${parsedEpub.metadata.isbn || "N/A"}`);
  console.log(`   EPUB Version: ${parsedEpub.metadata.epubVersion || "N/A"}`);
  
  if (parsedEpub.metadata.description) {
    const desc = parsedEpub.metadata.description.substring(0, 100);
    console.log(`   Description:  ${desc}${parsedEpub.metadata.description.length > 100 ? "..." : ""}`);
  }

  if (parsedEpub.metadata.authors && parsedEpub.metadata.authors.length > 1) {
    console.log(`   All Authors:  ${parsedEpub.metadata.authors.join(", ")}`);
  }

  if (parsedEpub.metadata.subject && parsedEpub.metadata.subject.length > 0) {
    console.log(`   Subjects:     ${parsedEpub.metadata.subject.join(", ")}`);
  }

  console.log("\n📚 STRUCTURE:");
  console.log("─".repeat(80));
  console.log(`   OPF Path:     ${parsedEpub.opfPath}`);
  console.log(`   Base Path:    ${parsedEpub.opfBasePath || "(root)"}`);
  console.log(`   Chapters:     ${parsedEpub.spine.length}`);
  console.log(`   Total Files:  ${parsedEpub.manifest.length}`);

  // Count assets by type
  const assetCounts = {
    images: 0,
    stylesheets: 0,
    fonts: 0,
    html: 0,
    other: 0,
  };

  parsedEpub.manifest.forEach((item: any) => {
    if (item.mediaType.startsWith("image/")) {
      assetCounts.images++;
    } else if (item.mediaType === "text/css") {
      assetCounts.stylesheets++;
    } else if (item.mediaType.includes("font")) {
      assetCounts.fonts++;
    } else if (item.mediaType.includes("html") || item.mediaType.includes("xhtml")) {
      assetCounts.html++;
    } else {
      assetCounts.other++;
    }
  });

  console.log(`   Images:       ${assetCounts.images}`);
  console.log(`   Stylesheets:  ${assetCounts.stylesheets}`);
  console.log(`   Fonts:        ${assetCounts.fonts}`);
  console.log(`   HTML Files:   ${assetCounts.html}`);
  console.log(`   Other:        ${assetCounts.other}`);

  if (parsedEpub.coverItem) {
    console.log(`   Cover Image:  ${parsedEpub.coverItem.href}`);
  }

  if (parsedEpub.navigationItem) {
    console.log(`   Navigation:   ${parsedEpub.navigationItem.href}`);
  }

  if (parsedEpub.ncxItem) {
    console.log(`   NCX File:     ${parsedEpub.ncxItem.href}`);
  }

  console.log("\n📖 SPINE (Reading Order):");
  console.log("─".repeat(80));
  parsedEpub.spine.slice(0, 10).forEach((item: any, index: number) => {
    const manifestItem = parsedEpub.manifest.find((m: any) => m.id === item.idref);
    const linear = item.linear ? "✓" : "✗";
    console.log(`   ${index + 1}. [${linear}] ${manifestItem?.href || item.idref}`);
  });

  if (parsedEpub.spine.length > 10) {
    console.log(`   ... and ${parsedEpub.spine.length - 10} more chapters`);
  }

  console.log("\n💾 DATABASE OBJECT (NewBook):");
  console.log("─".repeat(80));
  console.log(JSON.stringify(newBook, null, 2));
}

/**
 * Test a single EPUB file
 */
async function testSingleEpub(epubPath: string) {
  console.log("━".repeat(80));
  console.log(`📖 Testing: ${epubPath}`);
  console.log("━".repeat(80));

  try {
    // Get file size
    const file = Bun.file(epubPath);
    const size = file.size;
    console.log(`   File Size: ${formatBytes(size)}`);

    const startTime = performance.now();
    const result = await parseEpub(epubPath);
    const endTime = performance.now();

    displayParsedEpub(result);

    console.log("\n⏱️  PERFORMANCE:");
    console.log("─".repeat(80));
    console.log(`   Parsing Time: ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`\n✅ Successfully parsed!`);
  } catch (error) {
    console.error(`\n❌ Error parsing EPUB:`, error);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }
  }
}

/**
 * Test all EPUB files in test_data directory
 */
async function testAllEpubs() {
  console.log("🔍 Finding EPUB files in test_data directory...\n");

  try {
    // Get all files in test_data directory
    const files = await readdir(TEST_DATA_DIR);
    const epubFiles = files.filter((file) => file.endsWith(".epub"));

    if (epubFiles.length === 0) {
      console.log("❌ No EPUB files found in", TEST_DATA_DIR);
      console.log("\n💡 Add some EPUB files to test:");
      console.log(`   mkdir -p ${TEST_DATA_DIR}`);
      console.log(`   cp /path/to/your/book.epub ${TEST_DATA_DIR}/`);
      return;
    }

    console.log(`📚 Found ${epubFiles.length} EPUB file(s):\n`);
    epubFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    console.log();

    // Test each EPUB file
    for (const epubFile of epubFiles) {
      const epubPath = join(TEST_DATA_DIR, epubFile);
      await testSingleEpub(epubPath);
      console.log();
    }

    console.log("━".repeat(80));
    console.log("✨ All tests complete!");
    console.log("━".repeat(80));
  } catch (error) {
    if ((error as any).code === "ENOENT") {
      console.error("❌ Test data directory not found:", TEST_DATA_DIR);
      console.log("\n💡 Create the directory and add EPUB files:");
      console.log(`   mkdir -p ${TEST_DATA_DIR}`);
      console.log(`   cp /path/to/your/book.epub ${TEST_DATA_DIR}/`);
    } else {
      console.error("❌ Error reading test data directory:", error);
    }
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  console.log("📚 EPUB Parser Test Script");
  console.log("━".repeat(80));
  console.log();

  if (args.length > 0 && args[0]) {
    // Test specific EPUB file provided as argument
    const epubPath = args[0];
    await testSingleEpub(epubPath);
  } else {
    // Test all EPUBs in test_data directory
    await testAllEpubs();
  }
}

// Run the main function
main();
