/**
 * TypeScript types for EPUB OPF (Open Packaging Format) structure
 * Based on EPUB 3.0 specification
 */

// ============================================================================
// Container.xml Types (META-INF/container.xml)
// ============================================================================

export interface EpubContainer {
  container: {
    rootfiles: Array<{
      rootfile: Array<{
        $: {
          'full-path': string;      // Path to the OPF file (e.g., "OEBPS/content.opf")
          'media-type': string;      // Should be "application/oebps-package+xml"
        };
      }>;
    }>;
  };
}

// ============================================================================
// OPF Metadata Types (Dublin Core)
// ============================================================================

export interface DublinCoreMetadata {
  'dc:title'?: Array<string | DublinCoreElement>;
  'dc:creator'?: Array<string | DublinCoreElement>;
  'dc:contributor'?: Array<string | DublinCoreElement>;
  'dc:publisher'?: Array<string>;
  'dc:language'?: Array<string>;
  'dc:identifier'?: Array<string | DublinCoreElement>;
  'dc:subject'?: Array<string>;
  'dc:description'?: Array<string>;
  'dc:date'?: Array<string>;
  'dc:type'?: Array<string>;
  'dc:format'?: Array<string>;
  'dc:source'?: Array<string>;
  'dc:relation'?: Array<string>;
  'dc:coverage'?: Array<string>;
  'dc:rights'?: Array<string>;
  meta?: Array<MetaElement>;
}

export interface DublinCoreElement {
  _?: string;           // Text content (xml2js format)
  _text?: string;       // Text content (fast-xml-parser format)
  $?: {                 // Attributes
    id?: string;
    'opf:role'?: string;
    'opf:file-as'?: string;
    'opf:scheme'?: string;
    [key: string]: string | undefined;
  };
}

export interface MetaElement {
  _?: string;           // Text content
  $?: {                 // Attributes
    name?: string;
    content?: string;
    property?: string;
    refines?: string;
    id?: string;
    scheme?: string;
    [key: string]: string | undefined;
  };
}

// ============================================================================
// OPF Manifest Types
// ============================================================================

export interface ManifestItem {
  $: {
    id: string;                    // Unique identifier
    href: string;                  // Relative path to file
    'media-type': string;          // MIME type
    properties?: string;           // Space-separated properties (e.g., "nav", "cover-image")
    'fallback'?: string;           // Fallback item ID
  };
}

export interface Manifest {
  item: Array<ManifestItem>;
}

// ============================================================================
// OPF Spine Types
// ============================================================================

export interface SpineItemRef {
  $: {
    idref: string;                 // References manifest item ID
    linear?: string;               // "yes" or "no" (default "yes")
    id?: string;
    properties?: string;
  };
}

export interface Spine {
  $?: {
    toc?: string;                  // ID of NCX file in manifest
    'page-progression-direction'?: 'ltr' | 'rtl' | 'default';
  };
  itemref: Array<SpineItemRef>;
}

// ============================================================================
// OPF Guide Types (EPUB 2.0, deprecated in EPUB 3.0)
// ============================================================================

export interface GuideReference {
  $: {
    type: string;                  // e.g., "cover", "toc", "text"
    title?: string;
    href: string;
  };
}

export interface Guide {
  reference: Array<GuideReference>;
}

// ============================================================================
// Complete OPF Package Document
// ============================================================================

export interface OpfPackage {
  package: {
    $: {
      version: string;             // EPUB version (e.g., "3.0", "2.0")
      'unique-identifier': string; // References metadata identifier
      'xmlns'?: string;
      'xmlns:dc'?: string;
      'xmlns:opf'?: string;
      [key: string]: string | undefined;
    };
    metadata: Array<DublinCoreMetadata>;
    manifest: Array<Manifest>;
    spine: Array<Spine>;
    guide?: Array<Guide>;
  };
}

// ============================================================================
// Parsed/Normalized Types (for application use)
// ============================================================================

export interface EpubMetadata {
  title: string;
  author?: string;
  authors?: string[];              // Multiple authors
  publisher?: string;
  language?: string;
  isbn?: string;
  description?: string;
  subject?: string[];              // Tags/categories
  date?: string;                   // Publication date
  rights?: string;                 // Copyright info
  coverImageId?: string;           // Manifest item ID for cover
  epubVersion?: string;            // "2.0" or "3.0"
}

export interface EpubManifestItem {
  id: string;
  href: string;
  mediaType: string;
  properties?: string[];           // Parsed from space-separated string
  isNavigation?: boolean;          // Has "nav" property
  isCoverImage?: boolean;          // Has "cover-image" property
}

export interface EpubSpineItem {
  idref: string;                   // References manifest item
  linear: boolean;                 // Reading order
}

export interface EpubAssetType {
  type: 'image' | 'font' | 'stylesheet' | 'other';
  extensions: string[];
  mimeTypes: string[];
}

// ============================================================================
// Complete Parsed EPUB Structure
// ============================================================================

export interface ParsedEpub {
  metadata: EpubMetadata;
  manifest: EpubManifestItem[];
  spine: EpubSpineItem[];
  opfPath: string;                 // Path to OPF file in EPUB
  opfBasePath: string;             // Directory containing OPF file
  coverItem?: EpubManifestItem;    // Cover image manifest item
  navigationItem?: EpubManifestItem; // Navigation document (EPUB 3)
  ncxItem?: EpubManifestItem;      // NCX file (EPUB 2)
}

// ============================================================================
// Asset Classification
// ============================================================================

export const ASSET_TYPES: Record<string, EpubAssetType> = {
  image: {
    type: 'image',
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp', 'image/bmp'],
  },
  font: {
    type: 'font',
    extensions: ['.ttf', '.otf', '.woff', '.woff2'],
    mimeTypes: ['font/ttf', 'font/otf', 'font/woff', 'font/woff2', 'application/font-woff', 'application/x-font-ttf', 'application/x-font-otf'],
  },
  stylesheet: {
    type: 'stylesheet',
    extensions: ['.css'],
    mimeTypes: ['text/css'],
  },
  other: {
    type: 'other',
    extensions: [],
    mimeTypes: [],
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine asset type from MIME type or file extension
 */
export function getAssetType(mimeType: string, href: string): 'image' | 'font' | 'stylesheet' | 'other' {
  // Check by MIME type first
  for (const [key, assetType] of Object.entries(ASSET_TYPES)) {
    if (assetType.mimeTypes.includes(mimeType.toLowerCase())) {
      return assetType.type;
    }
  }
  
  // Fallback to file extension
  const ext = href.substring(href.lastIndexOf('.')).toLowerCase();
  for (const [key, assetType] of Object.entries(ASSET_TYPES)) {
    if (assetType.extensions.includes(ext)) {
      return assetType.type;
    }
  }
  
  return 'other';
}

/**
 * Check if manifest item is a chapter (HTML/XHTML content)
 */
export function isChapter(item: EpubManifestItem): boolean {
  const contentTypes = [
    'application/xhtml+xml',
    'application/x-dtbncx+xml',
    'text/html',
  ];
  
  // NCX is not a chapter
  if (item.mediaType === 'application/x-dtbncx+xml') {
    return false;
  }
  
  // Navigation document is not a chapter (unless it's in spine)
  if (item.isNavigation) {
    return false;
  }
  
  return contentTypes.includes(item.mediaType);
}

/**
 * Check if manifest item is an asset (image, font, CSS)
 */
export function isAsset(item: EpubManifestItem): boolean {
  const assetType = getAssetType(item.mediaType, item.href);
  return assetType !== 'other' || item.mediaType === 'text/css';
}
