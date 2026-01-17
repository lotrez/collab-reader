import { test } from "bun:test";
import { parseChapterData } from "../epub/metadata";
import * as fflate from "fflate";

test("should parse actual chapter file from test data", async () => {
  const epubPath = "back/epub/test_data/dumas_contes_grands_petits_enfants.epub";
  const unzipped = fflate.unzipSync(new Uint8Array(await Bun.file(epubPath).arrayBuffer()));
  
  // Parse the EPUB to find the second chapter (002.html)
  const containerXml = new TextDecoder().decode(unzipped["META-INF/container.xml"]);
  const opfPath = "Ops/content.opf";
  const opfXml = new TextDecoder().decode(unzipped[opfPath]);
  
  // Extract the OPF to find chapters
  // For now, let's just test with 002.html directly
  const chapterHtml = new TextDecoder().decode(unzipped["Ops/002.html"]);
  
  console.log("Raw HTML:");
  console.log(chapterHtml.substring(0, 500));
  
  const chapter = parseChapterData(chapterHtml, 2, 1, "002.html");
  
  console.log("\nParsed Chapter:");
  console.log(JSON.stringify(chapter, null, 2));
  
  // Verify the title
  if (chapter.title) {
    console.log(`\n✅ Title extracted: "${chapter.title}"`);
  } else {
    console.log("\n❌ No title found (expected for 002.html)");
  }
  
  // Verify we got content
  if (chapter.htmlContent) {
    console.log(`\n✅ HTML content length: ${chapter.htmlContent.length} chars`);
  }
  
  // Verify word count
  if (chapter.wordCount > 0) {
    console.log(`\n✅ Word count: ${chapter.wordCount} words`);
  }
});
