#!/usr/bin/env bun

import * as fflate from "fflate";
import { XMLParser } from "fast-xml-parser";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "_text",
  parseAttributeValue: true,
  trimValues: true,
});

const file = Bun.file("back/epub/test_data/dumas_contes_grands_petits_enfants.epub");
const buffer = await file.arrayBuffer();
const unzipped = fflate.unzipSync(new Uint8Array(buffer));

const containerXml = new TextDecoder().decode(unzipped["META-INF/container.xml"]);
console.log("Raw XML:");
console.log(containerXml);
console.log("\n\nParsed Structure:");
const parsed = xmlParser.parse(containerXml);
console.log(JSON.stringify(parsed, null, 2));
