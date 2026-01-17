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
const container = xmlParser.parse(containerXml);

console.log("Container XML:");
console.log(JSON.stringify(container, null, 2));

const opfPath = container.container.rootfiles.rootfile["full-path"];
console.log("\nOPF Path:", opfPath);

const opfXml = new TextDecoder().decode(unzipped[opfPath]);
const opf = xmlParser.parse(opfXml);

console.log("\nRaw OPF XML (first 500 chars):");
console.log(opfXml.substring(0, 500));

console.log("\nParsed OPF structure:");
console.log(JSON.stringify(opf, null, 2));
