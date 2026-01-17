#!/usr/bin/env bun

/**
 * Test script to verify S3/MinIO file upload functionality
 * 
 * Usage:
 *   bun run scripts/test-s3-upload.ts
 * 
 * Prerequisites:
 *   - MinIO running on localhost:9000 (via docker-compose up -d)
 *   - Bucket 'collab-reader' created in MinIO
 */

import { minio } from "../back/s3/s3";
import { readdir } from "fs/promises";
import { join } from "path";

const TEST_DATA_DIR = "./back/epub/test_data";

async function testS3Upload() {
  console.log("🧪 Testing S3/MinIO Upload\n");
  console.log("Configuration:");
  console.log(`  Endpoint: ${process.env.S3_ENDPOINT || "http://localhost:9000"}`);
  console.log(`  Bucket: ${process.env.S3_BUCKET || "collab-reader"}`);
  console.log(`  Region: ${process.env.S3_REGION || "us-east-1"}\n`);

  try {
    // Find a test file to upload
    const files = await readdir(TEST_DATA_DIR).catch(() => [] as string[]);
    const epubFiles = files.filter((file) => file.endsWith(".epub"));

    if (epubFiles.length === 0) {
      console.log("❌ No EPUB files found in", TEST_DATA_DIR);
      console.log("   Please add an .epub file to test with.");
      return;
    }

    const testFile = epubFiles[0]!;
    const testFilePath = join(TEST_DATA_DIR, testFile);

    console.log("━".repeat(80));
    console.log(`📁 Test file: ${testFile}`);
    console.log("━".repeat(80));

    // Read the file
    console.log("\n1️⃣  Reading file...");
    const fileBuffer = await Bun.file(testFilePath).arrayBuffer();
    const fileSize = fileBuffer.byteLength;
    console.log(`   ✓ File size: ${(fileSize / 1024).toFixed(2)} KB`);

    // Generate S3 key
    const timestamp = Date.now();
    const s3Key = `test-uploads/${timestamp}-${testFile}`;
    console.log(`   ✓ S3 Key: ${s3Key}`);

    // Upload to S3
    console.log("\n2️⃣  Uploading to MinIO...");
    const startTime = performance.now();

    const uploadResult = await minio.write(s3Key, fileBuffer, {
      type: "application/epub+zip",
    });

    const endTime = performance.now();
    console.log(`   ✓ Upload successful!`);
    console.log(`   ⏱️  Time taken: ${(endTime - startTime).toFixed(2)}ms`);

    // Verify upload by reading back
    console.log("\n3️⃣  Verifying upload...");
    const downloadedFile = await minio.file(s3Key);
    const downloadedBuffer = await downloadedFile.arrayBuffer();
    const downloadedSize = downloadedBuffer.byteLength;

    if (downloadedSize === fileSize) {
      console.log(`   ✓ File size matches: ${(downloadedSize / 1024).toFixed(2)} KB`);
    } else {
      console.log(`   ⚠️  Size mismatch! Original: ${fileSize}, Downloaded: ${downloadedSize}`);
    }

    // Generate public URL (for reference)
    const publicUrl = `${process.env.S3_ENDPOINT || "http://localhost:9000"}/${process.env.S3_BUCKET || "collab-reader"}/${s3Key}`;
    console.log(`   ✓ File URL: ${publicUrl}`);

    // Clean up test file
    console.log("\n4️⃣  Cleaning up...");
    await minio.delete(s3Key);
    console.log(`   ✓ Test file deleted from S3`);

    console.log("\n━".repeat(80));
    console.log("✅ All S3 upload tests passed!");
    console.log("━".repeat(80));
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    console.log("\n💡 Troubleshooting:");
    console.log("   1. Ensure MinIO is running: docker-compose up -d");
    console.log("   2. Check if bucket exists at http://localhost:9001");
    console.log("   3. Verify .env credentials match MinIO settings");
    process.exit(1);
  }
}

// Run the test
testS3Upload();
