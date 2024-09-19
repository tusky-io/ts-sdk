/**
 * Service worker intercepting the HTTP requests and decrypting the response stream
 * Usage: 
 * 1. Host this file on public route
 * 2. Register the service worker: navigator.serviceWorker.register('worker.js') 
 * 3. Post message to worker with the metadata of encrypted file
 * 4. Fire HTTP request to /api/proxy/download/{file-id}
 * 
 * Hints:
 * 1. To download decrytped file use:
      const anchor = document.createElement('a');
      anchor.href = `/api/proxy/download/${id}`;
      document.body.appendChild(anchor);
      anchor.click();

  * 2. To stream video / audio file in browser use:
      <video>
          <source src="/api/proxy/download/{file-id}?save=false" type="video/mp4">
      </video>
 */
      if (!self) {
        // eslint-disable-next-line no-undef
        global.self = global;
        // eslint-disable-next-line no-undef
        global.window = {};
      }
      
      const DOWNLOAD_URL = /\/api\/proxy\/download\/(.+)$/;
      const SYMMETRIC_KEY_ALGORITHM = 'AES-GCM';
      const SYMMETRIC_KEY_LENGTH = 256;
      const AUTH_TAG_SIZE_IN_BYTES = 16;
      const IV_SIZE_IN_BYTES = 12;
      const MAX_SLICE_SIZE = 250000000; //250MB
      const DEFAUTL_CHUNK_SIZE = 10000000; //10MB
      const MODE_DECRYPT = 'decrypt';
      
      const files = new Map();
      
      self.addEventListener('install', event => {
        event.waitUntil(self.skipWaiting());
      });
      
      self.addEventListener('activate', event => {
        event.waitUntil(self.clients.claim());
      });
      
      self.onmessage = (event) => {
        if (event.data.type === 'init') {
          files.set(event.data.id, { ...event.data, progress: 0 });
        } else if (event.data.type === 'progress') {
          const file = files.get(event.data.id);
          if (!file) {
            event.ports[0].postMessage({ error: 'cancelled' });
          } else {
            if (file.progress === file.size) {
              files.delete(event.data.id);
            }
            event.ports[0].postMessage({ type: 'progress', progress: file.progress });
          }
        } else if (event.data.type === 'cancel') {
          const file = files.get(event.data.id);
          if (file) {
            if (file.cancel) {
              try {
                file.cancel.abort('client request');
              } catch (e) {
                console.log(e)
              }
            }
            files.delete(event.data.id);
          }
        }
      }
      
      self.addEventListener('fetch', event => {
        const req = event.request;
      
        if (req.method !== 'GET') {
          return;
        }
        const url = new URL(req.url);
        const dlmatch = DOWNLOAD_URL.exec(url.pathname);
        if (dlmatch) {
          console.log("INFO: overriding the response with cleartext stream (@akord/crypto)")
          const range = req.headers.get('range');
          event.respondWith(decryptStream(dlmatch[1], { range }));
        }
      })
      
      async function decryptStream(id, options) {
        const file = files.get(id);
        if (!file) {
          return new Response(null, { status: 400 });
        }
        const requsetHeaders = {};
        if (options.range && file.key) {
          const internalRange = getChunkedFileRange(options.range, file);
          if (internalRange) {
            requsetHeaders['Range'] = `bytes=${internalRange.start}-${internalRange.end}`
          }
        } else {
          requsetHeaders['Range'] = options.range;
        }
      
        const controller = new AbortController();
        files.set(file.id, { ...file, cancel: controller });
      
        const response = await fetch(file.url, { headers: requsetHeaders, signal: controller.signal });
        const readableStream = response.body;
        const contentRange = response.headers.get('Content-Range')
        const externalRange = getExternalRange(contentRange, file)
        const contentLength = response.headers.get('Content-Length');
        if (!file.size && !file.chunkSize && contentLength) {
          file.chunkSize = parseInt(contentLength);
          files.set(file.id, file);
        }
        if (externalRange) {
          const headers = {
            'Accept-Range': 'bytes',
            'Content-Range': `bytes ${externalRange.start}-${externalRange.end}/${file.size}`,
            'Content-Type': response.headers.get('Content-Type'),
            'Content-Length': externalRange.end - externalRange.start
          };
          const currentChunkIndex = Math.round(externalRange.start / (file.chunkSize ?? file.size))
          return new Response(await getDecryptionStream(file, readableStream, currentChunkIndex), { headers, status: response.status });
      
        } else {
          const headers = {
            'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
            'Content-Type': 'application/octet-stream',
            'Content-Length': file.size
          };
          return new Response(await getDecryptionStream(file, readableStream), { headers });
        }
      }
      
      async function getDecryptionStream(file, stream, startChunkIndex = 0) {
        let chunkSize;
        if (file.chunkSize) {
          chunkSize = file.chunkSize;
        } else if (file.key) {
          chunkSize = file.size + AUTH_TAG_SIZE_IN_BYTES + IV_SIZE_IN_BYTES;
        } else {
          chunkSize = file.size > MAX_SLICE_SIZE ? DEFAUTL_CHUNK_SIZE : file.size;
        }
        const base64Key = file.key;
        const key = base64Key ? await getDecryptionKey(base64Key) : null;
        const slicesStream = transformStream(stream, new StreamSlicer(chunkSize, MODE_DECRYPT))
        return new transformStream(slicesStream, new DecryptStreamController(key, startChunkIndex, file.id, files))
      }
      
      async function getDecryptionKey(base64Key) {
        return await crypto.subtle.importKey(
          'raw',
          toByteArray(base64Key),
          {
            name: SYMMETRIC_KEY_ALGORITHM,
            length: SYMMETRIC_KEY_LENGTH,
          },
          true,
          ['encrypt', 'decrypt'],
        )
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
          console.log(e)
        }
      }
      
      function toByteArray(b64) {
        return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      }
      
      function getExternalRange(range, file) {
        if (!range) {
          return null;
        }
        const byteRangeWithTotalSize = range.split(' ')[1];
        const byteRange = byteRangeWithTotalSize.split('/')[0];
        const byteStartEnd = byteRange.split('-');
        const byteStart = parseInt(byteStartEnd[0]);
        const byteEnd = byteStartEnd[1] ? parseInt(byteStartEnd[1]) : null;
        if (!file.key) {
          return { start: byteStart, end: byteEnd }
        }
      
        const chunkSize = file.chunkSize ?? file.size;
        const start = byteStart - Math.floor(byteStart / chunkSize) * (AUTH_TAG_SIZE_IN_BYTES + IV_SIZE_IN_BYTES)
        const end = byteEnd ? byteEnd - Math.ceil(byteEnd / chunkSize) * (AUTH_TAG_SIZE_IN_BYTES + IV_SIZE_IN_BYTES) : '';
        return { start, end }
      }
      
      function getChunkedFileRange(range, file) {
        if (!range || !range.includes('=') || !range.includes('-')) {
          return null;
        }
        const byteRange = range.split('=')[1];
        const byteStartEnd = byteRange.split('-');
        const byteStart = parseInt(byteStartEnd[0]);
        const byteEnd = byteStartEnd[1] ? parseInt(byteStartEnd[1]) : null;
        let requestRangeStart;
        let requestRangeEnd;
        let currnentByte = 0;
        requestRangeStart = currnentByte
        while (currnentByte < file.size) {
          if (currnentByte <= byteStart) {
            requestRangeStart = currnentByte;
          } else {
            break;
          }
          currnentByte += (file.chunkSize ?? file.size);
        }
        if (!byteEnd) {
          requestRangeEnd = "";
        } else {
          currnentByte = requestRangeStart;
          while (currnentByte < file.size) {
            if (byteEnd <= currnentByte) {
              requestRangeEnd = currnentByte;
            } else {
              break;
            }
            currnentByte += (file.chunkSize ?? file.size);
          }
        }
        return { start: requestRangeStart, end: requestRangeEnd }
      }
      
      class DecryptStreamController {
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
            if (Array.isArray(this.iv)) {
              ivBytes = toByteArray(this.iv[this.index]);
            } else {
              ivBytes = toByteArray(this.iv);
            }
            ciphertextBytes = chunk;
          } else if (this.key) {
            ivBytes = chunk.slice(0, IV_SIZE_IN_BYTES);
            ciphertextBytes = chunk.slice(IV_SIZE_IN_BYTES);
          }
          try {
            const cleartext = this.key ? await getCleartext(this.key, ivBytes, ciphertextBytes) : chunk;
            controller.enqueue(new Uint8Array(cleartext));
            if (this.file) {
              this.file.progress += cleartext.byteLength
              files.set(this.file.id, this.file);
            }
            this.index += 1;
          } catch (e) {
            console.log(e)
          }
        }
      }
      
      class StreamSlicer {
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
      
      function transformStream(readable, transformer, oncancel) {
        try {
          return readable.pipeThrough(new TransformStream(transformer));
        } catch (e) {
          const reader = readable.getReader();
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