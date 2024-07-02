import { ReadableStream } from 'web-streams-polyfill/ponyfill';

export class StreamConverter {

    public static async toArrayBuffer<T>(readableStream: ReadableStream<T>): Promise<ArrayBuffer> {
        const reader = readableStream.getReader();
        const chunks = [];
        let result = await reader.read();

        while (!result.done) {
            chunks.push(result.value);
            result = await reader.read();
        }

        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const buffer = new Uint8Array(totalLength);

        let offset = 0;
        for (const chunk of chunks) {
            buffer.set(chunk, offset);
            offset += chunk.length;
        }

        return buffer.buffer;
    }

    public static async fromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<ReadableStream> {
        return new ReadableStream({
            start(controller) {
                const view = new DataView(arrayBuffer);
                let offset = 0;
                while (offset < arrayBuffer.byteLength) {
                    controller.enqueue(view.getUint8(offset) as any);
                    offset++;
                }
                controller.close();
            },
        });
    }

    public static fromAsyncIterable<T>(asyncIterable: AsyncIterable<T>): ReadableStream {
        return new ReadableStream({
            start(controller) {
                let offset = 0;
                async function pushData() {
                    for await (const chunk of asyncIterable) {
                        const anyChunk = chunk as any;
                        controller.enqueue(anyChunk);
                        offset = offset + anyChunk.length;
                    }
                    controller.close();
                }
                pushData();
            },
        });
    }
}
