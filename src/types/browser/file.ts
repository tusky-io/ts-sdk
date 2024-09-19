import { BadRequest } from "../../errors/bad-request";

export async function createFileLike(source: FileSource): Promise<TusFile> {
  if (source instanceof File || source instanceof Blob) {
    return source;
  } else if (source instanceof Uint8Array || source instanceof ArrayBuffer) {
    return new Blob([source]);
  }
  throw new BadRequest("File source is not supported. Please provide a valid source: File, Blob, Uint8Array, or ArrayBuffer.");
}

//Browser: source object may only be an instance of File, Blob, or Reader in this environment
export type TusFile = File | Blob;

//Explicitly repeat TusFile types in public FileSource type 
export type FileSource = File | Blob | ArrayBuffer | Uint8Array;
