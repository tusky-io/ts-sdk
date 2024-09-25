import { Readable } from "stream";
import { NotFound } from "../../errors/not-found";
import { BadRequest } from "../../errors/bad-request";
import { DEFAULT_FILE_TYPE } from "../../core/file";
import { getMimeTypeFromFileName } from "../../util/mime-types";
import path from "path";
import { createReadStream, existsSync, statSync } from "fs";


export const pathToReadable = async (filePath: string): Promise<Readable> => {
  if (!existsSync(filePath)) {
    throw new NotFound("Could not find a file in your filesystem: " + filePath);
  }
  const stats = statSync(filePath);

  const fileName = path.basename(filePath);
  const fileType = getMimeTypeFromFileName(fileName) || DEFAULT_FILE_TYPE;
  const fileLastModified = stats.ctime.getTime();
  const fileSize = stats.size;
  
  const file = createReadStream(filePath) as any; //hacky way of appending metadata to Readable stream
  file.name = fileName;
  file.type = fileType;
  file.lastModified = fileLastModified;
  file.size = fileSize;
  return file;
}

export const streamToUint8Array = async (stream: Readable): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks as any)));
  }).then(buffer => new Uint8Array(buffer as Buffer));
}

export async function tusFileToUint8Array(source: TusFile): Promise<Uint8Array> {
  if (source instanceof Buffer) {
    return new Uint8Array(source);
  } else if (source instanceof Readable) {
    return streamToUint8Array(source);
  }
  throw new BadRequest("File source is not supported. Please provide a valid source: web File object, file path, buffer or stream.");
}


export async function fileSourceToTusFile(source: FileSource): Promise<TusFile> {
  if (source instanceof Buffer) {
    return source;
  } else if (source instanceof Readable) {
    return source;
  } else if (typeof source === "string") {
    return pathToReadable(source);
  } else if (source instanceof ArrayBuffer) {
    return Buffer.from(source);
  } else if (source instanceof Uint8Array) {
    return Buffer.from(source);
  } else if (source instanceof Blob) {
    return Buffer.from(await source.arrayBuffer());
  }
  throw new BadRequest("File source is not supported. Please provide a valid source: web File object, file path, buffer or stream.");
}

//Nodejs: source object may only be an instance of Buffer or Readable in this environment
export type TusFile = Buffer | Readable;

//Explicitly repeat TusFile types in public FileSource type
export type FileSource = Buffer | Readable | ArrayBuffer | Uint8Array | Blob | string;
