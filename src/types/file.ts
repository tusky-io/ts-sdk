import { NotFound } from "../errors/not-found";
import { BadRequest } from "../errors/bad-request";
import { isServer } from "../util/platform";
import { importDynamic } from "../util/import";
import { DEFAULT_FILE_TYPE, FileOptions } from "../core/file";
import { getMimeTypeFromFileName } from "../util/mime-types";

const BlobClass = globalThis.Blob || importDynamic("buffer").Blob;

export namespace NodeJs {
  export class File extends BlobClass {
    name: string;
    lastModified: number;

    constructor(sources: Array<any | Blob>, name: string, mimeType?: string, lastModified?: number) {
      if (!name) {
        throw new BadRequest("File name is required, please provide it in the file options.");
      }
      const type = mimeType || getMimeTypeFromFileName(name);
      super(sources, { type: type });
      this.name = name;
      this.lastModified = lastModified;
    }

    static async fromReadable(stream: any, name: string, mimeType?: string, lastModified?: number) {
      const chunks = []
      for await (const chunk of stream) chunks.push(chunk);
      return new File(chunks, name, mimeType, lastModified);
    }

    static async fromPath(filePath: string, name?: string, mimeType?: string, lastModified?: number) {
      if (isServer()) {
        const fs = importDynamic("fs");
        const path = importDynamic("path");
        const mime = importDynamic("mime-types");

        if (!fs.existsSync(filePath)) {
          throw new NotFound("Could not find a file in your filesystem: " + filePath);
        }
        const stats = fs.statSync(filePath);

        const fileName = name || path.basename(filePath);
        const fileType = mimeType || mime.lookup(fileName) || DEFAULT_FILE_TYPE;
        const fileLastModified = lastModified || stats.ctime.getTime();

        const file = fs.createReadStream(filePath);
        return { file, options: { name: fileName, mimeType: fileType, lastModified: fileLastModified } };
      } else {
        throw new BadRequest("Method not valid for browsers.");
      }
    }
  }
}

export async function createFileLike(source: FileSource, options: FileOptions = {})
  : Promise<{ file: FileLike, options?: FileOptions }> {
  const name = options.name || (source as any).name;
  if (!isServer()) {
    if (source instanceof File) {
      return { file: source, options: { name, mimeType: source.type, lastModified: source.lastModified } };
    }
    if (!name) {
      throw new BadRequest("File name is required, please provide it in the file options.");
    }
    const mimeType = options.mimeType || getMimeTypeFromFileName(name);
    if (!mimeType) {
      console.warn("Missing file mime type. If this is unintentional, please provide it in the file options.");
    }
    if (source instanceof Uint8Array || source instanceof ArrayBuffer || source instanceof Blob) {
      return { file: new File([source as any], name, { type: mimeType, lastModified: options.lastModified }), options: { name, mimeType, lastModified: options.lastModified } };
    } else if (source instanceof Array) {
      return { file: new File(source, name, { type: mimeType, lastModified: options.lastModified }), options: { name, mimeType, lastModified: options.lastModified } };
    }
  } else {
    const nodeJsFile = (await import("../types/file")).NodeJs.File;
    if (typeof source?.read === 'function') {
      return { file: await nodeJsFile.fromReadable(source, name, options.mimeType, options.lastModified) };
    } else if (source instanceof Uint8Array || source instanceof Buffer || source instanceof ArrayBuffer) {
      return { file: new nodeJsFile([source as any], name, options.mimeType, options.lastModified) };
    } else if (source instanceof nodeJsFile) {
      return { file: source, options: { name, mimeType: source.type, lastModified: source.lastModified } };
    } else if (typeof source === "string") {
      return nodeJsFile.fromPath(source, name, options.mimeType, options.lastModified);
    } else if (source instanceof Array) {
      return { file: new nodeJsFile(source, name, options.mimeType, options.lastModified) };
    }
  }
  throw new BadRequest("File source is not supported. Please provide a valid source: web File object, file path, buffer or stream.");
}

export type FileLike = NodeJs.File | File;

export type FileSource = FileLike | ArrayBuffer | Buffer | string | ReadableStream | Array<any> | any;