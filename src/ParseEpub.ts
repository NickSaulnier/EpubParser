import * as fs from "fs";
import xml2js from "xml2js";
import unzipper from "unzipper";
import etl from "etl";

export const EPUB_IMAGE_TYPES = ["svg", "jpg", "jpeg", "png", "gif"];
export const EPUG_XML_TYPES = ["xhtml", "opf", "xml", "ncx"];

export const EPUB_CONTENT = "content";
export const EPUB_IMAGES = "images";
export const EPUB_MISC = "misc";

export async function parseEpub(pathToEpub: string) {
  const xmlParser = new xml2js.Parser();
  const epubObj = {};

  epubObj[EPUB_CONTENT] = {};
  epubObj[EPUB_IMAGES] = {};
  epubObj[EPUB_MISC] = {};

  return await fs
    .createReadStream(pathToEpub)
    .pipe(unzipper.Parse())
    .pipe(
      etl.map(async (entry) => {
        const fileTypeStart = entry.path.lastIndexOf(".");

        // Ignore directories
        if (fileTypeStart >= 0) {
          const fileType = entry.path.substring(fileTypeStart + 1);
          const content = await entry.buffer();

          if (EPUG_XML_TYPES.includes(fileType)) {
            const xml = await xmlParser.parseStringPromise(content);
            epubObj[EPUB_CONTENT][entry.path] = xml;
          } else if (EPUB_IMAGE_TYPES.includes(fileType)) {
            epubObj[EPUB_IMAGES][entry.path] = content;
          } else {
            // Handle misc files, i.e. CSS
            // File contents can be accessed via 'content.toString()'
            epubObj[EPUB_MISC][entry.path] = content;
          }
        }
      })
    )
    .promise()
    .then(() => epubObj);
}
