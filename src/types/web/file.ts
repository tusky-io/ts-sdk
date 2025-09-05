import { BadRequest } from "../../errors/bad-request";
import { logger } from "../../logger";

export async function tusFileToUint8Array(
  source: TusFile,
): Promise<Uint8Array> {
  try {
    logger.info(source);
    if (source instanceof File) {
      return new Uint8Array(await source.arrayBuffer());
    } else if (source instanceof Blob) {
      return new Uint8Array(await source.arrayBuffer());
    } else {
      throw new BadRequest(
        "File source is not supported. Please provide a valid source: File, Blob, Uint8Array, or ArrayBuffer.",
      );
    }
  } catch (error) {
    logger.error(error);
  }
}
export async function fileSourceToTusFile(
  source: FileSource,
): Promise<TusFile> {
  if (source instanceof File || source instanceof Blob) {
    return source;
  } else if (source instanceof Uint8Array || source instanceof ArrayBuffer) {
    return new Blob([source]);
  }
  throw new BadRequest(
    "File source is not supported. Please provide a valid source: File, Blob, Uint8Array, or ArrayBuffer.",
  );
}

//Browser: source object may only be an instance of File, Blob, or Reader in this environment
export type TusFile = File | Blob;

//Explicitly repeat TusFile types in public FileSource type
export type FileSource = File | Blob | ArrayBuffer | Uint8Array;
