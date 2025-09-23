import { CHUNK_SIZE_IN_BYTES, FileModule } from "../file";
import RNBlobUtil from "react-native-blob-util";
import { File } from "../../types";
import { base64ToArray, decryptStream } from "../../crypto";
import { BadRequest } from "../../errors/bad-request";
import { MISSING_ENCRYPTION_ERROR_MESSAGE } from "../../crypto/encrypter";
import { ReadableStream } from "web-streams-polyfill";

class ReactNativeFileModule extends FileModule {
  public async stream(id: string): Promise<ReadableStream<Uint8Array>> {
    const file = await this.createReadableStreamFromFile(id);

    // TODO: send encryption context directly with the file data
    const fileMetadata = new File(await this.service.api.getFile(id));
    this.service.setEncrypted(fileMetadata.__encrypted__);

    let stream: ReadableStream<Uint8Array>;
    if (!this.service.encrypted) {
      stream = file as ReadableStream<Uint8Array>;
    } else {
      if (!this.service.encrypter) {
        throw new BadRequest(MISSING_ENCRYPTION_ERROR_MESSAGE);
      }
      const aesKey = await this.aesKey(id);
      stream = await decryptStream(file, aesKey, fileMetadata.chunkSize);
    }
    return stream;
  }

  private async createReadableStreamFromFile(
    id: string,
  ): Promise<ReadableStream<Uint8Array>> {
    const fileUrl = `${this.service.api.config.apiUrl}/files/${id}`;

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
