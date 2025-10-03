import { CHUNK_SIZE_IN_BYTES, FileModule } from "../file";
import { base64ToArray } from "../../crypto";
import { ReadableStream } from "web-streams-polyfill";

class ReactNativeFileModule extends FileModule {
  public async downloadToPath(
    id: string,
    options?: { path: string },
  ): Promise<string> {
    const stream = await this.stream(id);
    console.log("after streaming from SDK");
    const reader = stream.getReader();

    const NativeFileSystem = require("react-native-fs");
    const FileSystem = require("expo-file-system");

    const localPath =
      options?.path || `${FileSystem.cacheDirectory}${"image.jpeg"}`;

    // Ensure file is empty before writing
    await NativeFileSystem.writeFile(localPath, "", "base64");

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          // Convert decrypted Uint8Array to base64
          const base64Chunk = Buffer.from(value).toString("base64");

          // Append chunk to file
          await NativeFileSystem.appendFile(localPath, base64Chunk, "base64");
        }
      }
    } catch (err) {
      console.error("Failed during decryption stream:", err);
      throw err;
    }
    return localPath;
  }

  private async createReadableStreamFromFile(
    id: string,
  ): Promise<ReadableStream<Uint8Array>> {
    const fileUrl = `${this.service.api.config.apiUrl}/files/${id}`;

    const RNBlobUtil = require("react-native-blob-util");

    const res = await RNBlobUtil.config({ fileCache: true }).fetch(
      "GET",
      fileUrl,
      {
        ...((await this.auth.getAuthorizationHeader()) as Record<
          string,
          string
        >),
      },
    );
    const path = res.path();
    const readStream = await RNBlobUtil.fs.readStream(
      path,
      "base64",
      CHUNK_SIZE_IN_BYTES,
    );

    return new ReadableStream<Uint8Array>({
      start(controller) {
        readStream.open();

        readStream.onData((base64Chunk: string) => {
          try {
            const chunk = base64ToArray(base64Chunk);
            controller.enqueue(chunk);
          } catch (err) {
            controller.error(err);
          }
        });

        readStream.onError((err) => controller.error(err));
        readStream.onEnd(() => controller.close());
      },
    });
  }
}

export { ReactNativeFileModule as FileModule };
