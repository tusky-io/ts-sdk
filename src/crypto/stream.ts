import { ReadableStream, TransformStream } from "web-streams-polyfill/ponyfill";
import { decryptAes, IV_LENGTH_IN_BYTES } from "./lib";
import { logger } from "../logger";

const MODE_DECRYPT = "decrypt";

export class DecryptStreamController {
  private key: CryptoKey;
  private iv: string[];
  private index: number;
  private file?: any;
  private files?: Map<any, any>;

  constructor(
    key: CryptoKey,
    index: number = 0,
    id?: string,
    files?: Map<any, any>,
  ) {
    this.key = key;
    this.index = index;
    this.files = files;
    if (id) {
      this.file = this.files.get(id);
    }
  }

  async transform(chunk: Uint8Array, controller: any) {
    const ivBytes = chunk.slice(0, IV_LENGTH_IN_BYTES);
    const ciphertextBytes = chunk.slice(IV_LENGTH_IN_BYTES);

    try {
      const cleartext = await decryptAes(
        { iv: ivBytes, ciphertext: ciphertextBytes },
        this.key,
      );
      controller.enqueue(new Uint8Array(cleartext));
      if (this.file) {
        this.file.progress += cleartext.byteLength;
        this.files.set(this.file.id, this.file);
      }
      this.index += 1;
    } catch (e) {
      logger.error(e);
    }
  }
}

export class StreamSlicer {
  private rs: number;
  private mode: string;
  private chunkSize: number;
  private partialChunk: Uint8Array;
  private offset: number;

  constructor(rs: number, mode?: string) {
    this.mode = mode;
    this.rs = rs;
    this.chunkSize = rs;
    this.partialChunk = new Uint8Array(this.chunkSize);
    this.offset = 0;
  }

  private send(buf: Uint8Array, controller: any) {
    controller.enqueue(buf);
    if (this.chunkSize === 21 && this.mode === MODE_DECRYPT) {
      this.chunkSize = this.rs;
    }
    this.partialChunk = new Uint8Array(this.chunkSize);
    this.offset = 0;
  }

  // Reslice input into record-sized chunks
  transform(chunk: Uint8Array, controller: any) {
    let i = 0;

    if (this.offset > 0) {
      const len = Math.min(chunk.byteLength, this.chunkSize - this.offset);
      this.partialChunk.set(chunk.slice(0, len), this.offset);
      this.offset += len;
      i += len;

      if (this.offset === this.chunkSize) {
        this.send(this.partialChunk, controller);
      }
    }

    while (i < chunk.byteLength) {
      const remainingBytes = chunk.byteLength - i;
      if (remainingBytes >= this.chunkSize) {
        const record = chunk.slice(i, i + this.chunkSize);
        i += this.chunkSize;
        this.send(record, controller);
      } else {
        const end = chunk.slice(i, i + remainingBytes);
        i += end.byteLength;
        this.partialChunk.set(end);
        this.offset = end.byteLength;
      }
    }
  }

  flush(controller: any) {
    if (this.offset > 0) {
      controller.enqueue(this.partialChunk.slice(0, this.offset));
    }
  }
}

export function transformStream(
  readable: ReadableStream<Uint8Array>,
  transformer: Transformer<Uint8Array, Uint8Array>,
  oncancel?: (reason: any) => void,
): ReadableStream<Uint8Array> {
  try {
    return readable.pipeThrough(new TransformStream(transformer));
  } catch (e) {
    const reader = readable.getReader
      ? readable.getReader()
      : (readable as any);

    return new ReadableStream({
      start(controller) {
        if (transformer.start) {
          return transformer.start(controller as any);
        }
      },
      async pull(controller) {
        let enqueued = false;
        const wrappedController = {
          enqueue(d: Uint8Array) {
            enqueued = true;
            controller.enqueue(d);
          },
        } as any;
        while (!enqueued) {
          const data = await reader.read();
          if (data.done) {
            if (transformer.flush) {
              await transformer.flush(controller as any);
            }
            return controller.close();
          }
          await transformer.transform(data.value, wrappedController);
        }
      },
      cancel(reason) {
        reader.cancel(reason);
        if (oncancel) {
          oncancel(reason);
        }
      },
    });
  }
}
