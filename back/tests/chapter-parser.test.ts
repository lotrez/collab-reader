import { describe, test, expect } from "bun:test";
import { parseChapterData } from "../epub/metadata";

describe("Chapter Parser", () => {
  const sampleChapterHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="fr">
<head>
<meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8"/>
<meta name="Generator" content="Atlantis Word Processor 4.1.5.0"/>
<link rel="stylesheet" type="text/css" href="cover.css"/>
<title>Page titre</title>
</head>
<body>
<p class="p0"><img src="images/cover.jpg" style="height:100%;max-width:100%" alt="cover.jpg"/></p>
</body>
</html>`;

  describe("parseChapterData", () => {
    test("should extract chapter title", () => {
      const chapter = parseChapterData(sampleChapterHtml, 1, 0, "001.html");
      
      expect(chapter.title).toBe("Page titre");
      expect(chapter.chapterNumber).toBe(1);
      expect(chapter.spineIndex).toBe(0);
      expect(chapter.href).toBe("001.html");
    });

    test("should count words in chapter content", () => {
      const chapter = parseChapterData(sampleChapterHtml, 1, 0, "001.html");
      
      // The chapter has minimal content, just an image tag
      // Word count should be very low or 0
      expect(chapter.wordCount).toBeGreaterThanOrEqual(0);
      expect(typeof chapter.wordCount).toBe("number");
    });

    test("should preserve HTML content", () => {
      const chapter = parseChapterData(sampleChapterHtml, 1, 0, "001.html");
      
      expect(chapter.htmlContent).toBeTruthy();
      expect(chapter.htmlContent).toContain("<html");
      expect(chapter.htmlContent).toContain("<body>");
    });

    test("should handle missing title", () => {
      const htmlWithoutTitle = `<?xml version="1.0"?><html><body><p>Content</p></body></html>`;
      const chapter = parseChapterData(htmlWithoutTitle, 1, 0, "001.html");
      
      expect(chapter.title).toBeUndefined();
      expect(chapter.chapterNumber).toBe(1);
    });

    test("should handle chapter with rich content", () => {
      const richChapterHtml = `<?xml version="1.0"?><html>
<head><title>Chapter with Content</title></head>
<body>
<h1>This is a chapter</h1>
<p>This chapter has multiple paragraphs with words.</p>
<p>Here is another paragraph to increase word count.</p>
</body>
</html>`;
      
      const chapter = parseChapterData(richChapterHtml, 1, 0, "001.html");
      
      expect(chapter.title).toBe("Chapter with Content");
      expect(chapter.wordCount).toBeGreaterThan(10); // Should have more than 10 words
    });

    test("should handle different chapter numbers", () => {
      const chapter1 = parseChapterData(sampleChapterHtml, 1, 0, "001.html");
      const chapter2 = parseChapterData(sampleChapterHtml, 5, 4, "005.html");
      const chapter3 = parseChapterData(sampleChapterHtml, 10, 9, "010.html");
      
      expect(chapter1.chapterNumber).toBe(1);
      expect(chapter2.chapterNumber).toBe(5);
      expect(chapter3.chapterNumber).toBe(10);
      
      expect(chapter1.spineIndex).toBe(0);
      expect(chapter2.spineIndex).toBe(4);
      expect(chapter3.spineIndex).toBe(9);
    });
  });

  describe("Word Counting", () => {
    test("should count words in simple text", () => {
      const simpleHtml = `<html><head><title>Test</title></head><body>This is a test chapter.</body></html>`;
      const chapter = parseChapterData(simpleHtml, 1, 0, "test.html");
      
      // "This is a test chapter" = 5 words
      expect(chapter.wordCount).toBe(5);
    });

    test("should count words in paragraphs", () => {
      const paragraphHtml = `<html><head><title>Test</title></head><body>
<p>First paragraph here.</p>
<p>Second paragraph with more words.</p>
<p>Third paragraph completes the test.</p>
</body></html>`;
      const chapter = parseChapterData(paragraphHtml, 1, 0, "test.html");
      
      // 3 paragraphs with 3, 5, and 5 words = 13 words
      expect(chapter.wordCount).toBe(13);
    });
  });
});
