import { ReadableStream, TransformStream } from "web-streams-polyfill/ponyfill";
import { IV_LENGTH_IN_BYTES } from './lib';
import { logger } from '../logger';

export class DecryptStreamController {
  constructor(key, iv, index, id) {
    this.key = key;
    this.iv = iv;
    this.index = index || 0;
    if (id) {
      this.file = files.get(id);
    }
  }

  async transform(chunk, controller) {
    let ivBytes;
    let ciphertextBytes;
    if (this.iv) {
      ivBytes = toByteArray(this.iv[this.index]);
      ciphertextBytes = chunk;
    } else {
      ivBytes = chunk.slice(0, IV_LENGTH_IN_BYTES);
      ciphertextBytes = chunk.slice(IV_LENGTH_IN_BYTES);
    }
    try {
      const cleartext = await getCleartext(this.key, ivBytes, ciphertextBytes);
      controller.enqueue(new Uint8Array(cleartext));
      if (this.file) {
        this.file.progress += cleartext.byteLength
        files.set(this.file.id, this.file);
      }
      this.index += 1;
    } catch (e) {
      logger.error(e)
    }
  }
}

export class StreamSlicer {
  constructor(rs, mode) {
    this.mode = mode;
    this.rs = rs;
    this.chunkSize = rs;
    this.partialChunk = new Uint8Array(this.chunkSize);
    this.offset = 0;
  }

  send(buf, controller) {
    controller.enqueue(buf);
    if (this.chunkSize === 21 && this.mode === MODE_DECRYPT) {
      this.chunkSize = this.rs;
    }
    this.partialChunk = new Uint8Array(this.chunkSize);
    this.offset = 0;
  }

  //reslice input into record sized chunks
  transform(chunk, controller) {
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

  flush(controller) {
    if (this.offset > 0) {
      controller.enqueue(this.partialChunk.slice(0, this.offset));
    }
  }
}

export function transformStream(readable, transformer, oncancel) {
  try {
    return readable.pipeThrough(new TransformStream(transformer));
  } catch (e) {
    const reader = readable.getReader ? readable.getReader() : readable;
    return new ReadableStream({
      start(controller) {
        if (transformer.start) {
          return transformer.start(controller);
        }
      },
      async pull(controller) {
        let enqueued = false;
        const wrappedController = {
          enqueue(d) {
            enqueued = true;
            controller.enqueue(d);
          }
        };
        while (!enqueued) {
          const data = await reader.read();
          if (data.done) {
            if (transformer.flush) {
              await transformer.flush(controller);
            }
            return controller.close();
          }
          await transformer.transform(data.value, wrappedController);
        }
      },
      cancel(reason) {
        readable.cancel(reason);
        if (oncancel) {
          oncancel(reason);
        }
      }
    });
  }
}
async function getCleartext(key, ivBytes, bytes) {
  try {
    return await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes
      },
      key,
      bytes,
    )
  } catch (e) {
    logger.error(e)
  }
}


function toByteArray(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}
