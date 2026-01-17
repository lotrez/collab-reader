import type { DublinCoreElement, EpubManifestItem, EpubMetadata, EpubSpineItem } from "./epub.model";

 
/**
 * Extract and normalize metadata from OPF Dublin Core elements
 */
export function extractMetadata(metadataNode: any, epubVersion: string): EpubMetadata {
  // Helper to extract text from Dublin Core elements
  const getDcText = (element: string | DublinCoreElement | undefined): string | undefined => {
    if (!element) return undefined;
    if (typeof element === "string") return element;
    return (element as any)._text || element._ || undefined;
  };
  
  // Helper to extract all authors
  const getAuthors = (creators: Array<string | DublinCoreElement> | undefined): string[] => {
    if (!creators) return [];
    return creators.map(c => getDcText(c)).filter((a): a is string => !!a);
  };
  
  const dcMetadata = metadataNode;
  const title = getDcText(dcMetadata["dc:title"]?.[0]) || "Untitled";
  const authors = getAuthors(dcMetadata["dc:creator"]);
  const author = authors[0];
  const publisher = getDcText(dcMetadata["dc:publisher"]?.[0]);
  const language = getDcText(dcMetadata["dc:language"]?.[0]);
  const isbn = getDcText(dcMetadata["dc:identifier"]?.[0]);
  const description = getDcText(dcMetadata["dc:description"]?.[0]);
  const date = getDcText(dcMetadata["dc:date"]?.[0]);
  const rights = getDcText(dcMetadata["dc:rights"]?.[0]);
  
  // Extract subjects as array
  const subjects = dcMetadata["dc:subject"]?.map((s: string | DublinCoreElement) => getDcText(s)).filter((s: string | undefined): s is string => !!s) || [];
  
  // Find cover image ID from meta tags
  let coverImageId: string | undefined;
  if (dcMetadata.meta) {
    const metas = Array.isArray(dcMetadata.meta) ? dcMetadata.meta : [dcMetadata.meta];
    const coverMeta = metas.find((m: any) => m.name === "cover" || m.property === "cover-image");
    coverImageId = coverMeta?.content || coverMeta?.["#text"];
  }
  
  console.log(`Extracted metadata: ${title} by ${author}`);
  
  return {
    title,
    author,
    authors: authors.length > 0 ? authors : undefined,
    publisher,
    language,
    isbn,
    description,
    subject: subjects.length > 0 ? subjects : undefined,
    date,
    rights,
    coverImageId,
    epubVersion,
  };
}

/**
 * Extract and normalize manifest items
 */
export function extractManifest(manifestNode: any): EpubManifestItem[] {
  const items = Array.isArray(manifestNode.item) ? manifestNode.item : [manifestNode.item];
  
  return items.map((item: any) => {
    const properties = item.properties ? item.properties.split(" ") : [];
    const isNavigation = properties.includes("nav");
    const isCoverImage = properties.includes("cover-image");
    
    return {
      id: item.id,
      href: item.href,
      mediaType: item["media-type"],
      properties,
      isNavigation,
      isCoverImage,
    };
  });
}
/**
 * Extract and normalize spine items
 */
export function extractSpine(spineNode: any): EpubSpineItem[] {
  const itemrefs = Array.isArray(spineNode.itemref) ? spineNode.itemref : [spineNode.itemref];
  
  return itemrefs.map((itemref: any) => ({
    idref: itemref.idref,
    linear: itemref.linear !== "no",
  }));
}
