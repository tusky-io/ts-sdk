import * as tus from "tus-js-client";
import {
  AUTH_TAG_LENGTH_IN_BYTES,
  base64ToJson,
  base64ToString,
  encryptAes,
  IV_LENGTH_IN_BYTES,
  jsonToBase64,
  stringToArray,
  stringToBase64,
} from "../../crypto";
import { tusFileToUint8Array, Vault } from "../../types";
import { AESKeyPayload, VaultEncryption } from "../../crypto/vault-encryption";
import Encrypter from "../../crypto/encrypter";
import { X25519EncryptedPayload } from "../../crypto/types";

export const BYTES_IN_MB = 1000000;
export const CHUNK_SIZE_IN_BYTES = 5 * BYTES_IN_MB;
export const ENCRYPTED_CHUNK_SIZE_IN_BYTES =
  CHUNK_SIZE_IN_BYTES + AUTH_TAG_LENGTH_IN_BYTES + IV_LENGTH_IN_BYTES;

export const CONTENT_LENGTH_HEADER = "Content-Length";
export const UPLOAD_LENGTH_HEADER = "Upload-Length";
export const UPLOAD_OFFSET_HEADER = "Upload-Offset";
export const UPLOAD_METADATA_HEADER = "Upload-Metadata";
export const UPLOAD_METADATA_CHUNK_SIZE_KEY = "chunkSize";
export const UPLOAD_METADATA_NUMBER_OF_CHUNKS_KEY = "numberOfChunks";
export const UPLOAD_METADATA_ENCRYPTED_AES_KEY_KEY = "encryptedAesKey";
export const UPLOAD_METADATA_FILENAME_KEY = "filename";

export class EncryptableHttpStack {
  private defaultStack: tus.HttpStack;
  private vault: Vault;
  private uploadAes: Map<string, AESKeyPayload> = new Map();
  private vaultEncryption?: VaultEncryption;

  constructor(defaultStack: tus.HttpStack, vault: Vault, encrypter: Encrypter) {
    this.defaultStack = defaultStack;
    if (!vault) {
      throw new Error("Vault is required");
    }
    this.vault = vault;
    if (vault.encrypted) {
      if (!vault.__keys__ || vault.__keys__.length === 0) {
        throw new Error("Encrypted vault has no keys");
      }
      this.vaultEncryption = new VaultEncryption({
        vaultKeys: vault.__keys__,
        userEncrypter: encrypter,
      });
    }
  }

  createRequest(method: string, url: string): tus.HttpRequest {
    const request = this.defaultStack.createRequest(method, url);
    if (method !== "POST" && method !== "PATCH" && method !== "HEAD") {
      return request;
    }

    if (!this.vault.encrypted) {
      return request;
    }

    let uploadId: string | null | undefined = null;
    if (method === "PATCH" || method === "HEAD") {
      uploadId = url.split("/").pop();
    }

    const originalSend = request.send.bind(request);
    request.send = async (body) => {
      const startSend = performance.now();

      let decoratedBody = body;
      let response: tus.HttpResponse;
      let key: AESKeyPayload = {} as any;

      if (method === "POST" || method === "PATCH") {
        // get aes key
        if (uploadId && this.uploadAes.has(uploadId)) {
          key = this.uploadAes.get(uploadId) as AESKeyPayload;
        } else {
          key = (await this.vaultEncryption?.generateAesKey()) as AESKeyPayload;
        }

        // encrypt the body
        const startTransformation = performance.now();
        const bodyUint8Array = await tusFileToUint8Array(body);
        const endTransformation = performance.now();
        console.log(
          `[time] File buffer manipulation took ${endTransformation - startTransformation} ms`,
        );
        const start = performance.now();
        const encryptedBody = (await encryptAes(
          bodyUint8Array,
          key.aesKey,
          false,
        )) as Uint8Array;
        const end = performance.now();
        console.log(`[time] File AES encryption took ${end - start} ms`);
        if (!request.getUnderlyingObject()) {
          request.setHeader(
            CONTENT_LENGTH_HEADER,
            encryptedBody.byteLength.toString(),
          );
        }
        decoratedBody = encryptedBody;

        console.log(`Encrypting file name`);

        // encrypt the filename
        const filename =
          this.getMetadata(request, UPLOAD_METADATA_FILENAME_KEY) || "unnamed";
        const encryptedFileNameB64 = (await this.vaultEncryption?.encryptHybrid(
          stringToArray(filename),
        )) as string;
        this.putMetadata(
          request,
          UPLOAD_METADATA_FILENAME_KEY,
          stringToBase64(encryptedFileNameB64),
        );

        console.log(`After file name`);

        // set the upload length
        console.log(`Before metadata`);

        const uploadLengthHeader = request.getHeader(UPLOAD_LENGTH_HEADER);
        if (uploadLengthHeader) {
          const originalUploadLength = parseInt(uploadLengthHeader);
          const numberOfChunks = Math.ceil(
            originalUploadLength / CHUNK_SIZE_IN_BYTES,
          );
          const uploadLength =
            originalUploadLength +
            numberOfChunks * (AUTH_TAG_LENGTH_IN_BYTES + IV_LENGTH_IN_BYTES);
          request.setHeader(UPLOAD_LENGTH_HEADER, uploadLength.toString());

          this.putMetadata(
            request,
            UPLOAD_METADATA_NUMBER_OF_CHUNKS_KEY,
            stringToBase64(numberOfChunks.toString()),
          );
          this.putMetadata(
            request,
            UPLOAD_METADATA_CHUNK_SIZE_KEY,
            stringToBase64(ENCRYPTED_CHUNK_SIZE_IN_BYTES.toString()),
          );
          this.putMetadata(
            request,
            UPLOAD_METADATA_ENCRYPTED_AES_KEY_KEY,
            stringToBase64(jsonToBase64(key.encryptedAesKey)),
          ); // TODO: maybe skip stringToBase64
        }

        // override request upload-offset to account for encryption bytes
        const originalRequestOffset = request.getHeader(
          UPLOAD_OFFSET_HEADER,
        ) as string;
        if (originalRequestOffset) {
          const currentRequestChunk = Math.ceil(
            parseInt(originalRequestOffset) / CHUNK_SIZE_IN_BYTES,
          );
          const encryptedRequestOffset =
            parseInt(originalRequestOffset) +
            currentRequestChunk *
              (AUTH_TAG_LENGTH_IN_BYTES + IV_LENGTH_IN_BYTES);
          request.setHeader(
            UPLOAD_OFFSET_HEADER,
            encryptedRequestOffset.toString(),
          );
        }

        console.log(`After metadata`);

        console.log(`Reinitialize`);

        // reinitialize the xhr
        if ((request as any)._xhr) {
          const xhr = (request as any)._xhr;
          const { upload, withCredentials } = xhr;
          xhr.abort();

          const newXhr = new XMLHttpRequest();
          newXhr.open(method, url, true);

          Object.entries((request as any)._headers).forEach(([name, value]) => {
            newXhr.setRequestHeader(name, value as string);
          });

          newXhr.upload.onprogress = upload.onprogress;
          newXhr.withCredentials = withCredentials;

          (request as any)._xhr = newXhr;
        }
      }
      console.log(`After reinitalize`);

      console.log(`Sending request`);

      // send the request
      response = await originalSend(decoratedBody);
      console.log(`After sending reuqest`);

      // read the upload id
      const location = response.getHeader("Location");
      if (location && !uploadId) {
        uploadId = location.split("/").pop();
      }

      // cache the aes key
      if (uploadId) {
        if (!key) {
          if (this.uploadAes.has(uploadId)) {
            key = this.uploadAes.get(uploadId) as AESKeyPayload;
          } else {
            // read the aes key from the response (primary for HEAD requests but would work for POST & PATCH as well)
            console.log("Decrypting Aes key");
            const encryptedAesKey = this.getMetadata(
              response,
              UPLOAD_METADATA_ENCRYPTED_AES_KEY_KEY,
            );
            if (encryptedAesKey && this.vaultEncryption) {
              const aesKey =
                await this.vaultEncryption.decryptAesKey(encryptedAesKey);
              key = {
                aesKey,
                encryptedAesKey: base64ToJson(
                  encryptedAesKey,
                ) as X25519EncryptedPayload,
              };
              console.log("After Decrypting Aes key");
            }
          }
        }
        if (key && !this.uploadAes.has(uploadId)) {
          this.uploadAes.set(uploadId, key);
        }
      }

      // override response upload-offset to allow reading from proper place in source file
      const originalResponseOffset = parseInt(
        response.getHeader(UPLOAD_OFFSET_HEADER) as string,
      );
      const currentResponseChunk = Math.ceil(
        originalResponseOffset / ENCRYPTED_CHUNK_SIZE_IN_BYTES,
      );
      const encryptedResponseOffset =
        originalResponseOffset -
        currentResponseChunk * (AUTH_TAG_LENGTH_IN_BYTES + IV_LENGTH_IN_BYTES);

      const originalGetHeader = response.getHeader.bind(response);
      response.getHeader = (key: string) => {
        if (key === UPLOAD_OFFSET_HEADER) {
          return encryptedResponseOffset.toString();
        }
        return originalGetHeader(key);
      };
      const endSend = performance.now();
      console.log(`[time] File send took ${endSend - startSend} ms`);
      return response as tus.HttpResponse;
    };
    return request;
  }

  getName(): string {
    return "EncryptableHttpStack";
  }

  private putMetadata(
    request: tus.HttpRequest,
    key: string,
    value: string,
  ): void {
    const existingMetadata =
      request.getHeader(UPLOAD_METADATA_HEADER)?.split(",") ?? [];
    const newMetadata = existingMetadata.filter(
      (item) => !item.startsWith(`${key} `),
    );
    newMetadata.push(`${key} ${value}`);
    const metadataHeader = newMetadata.join(",");
    request.setHeader(UPLOAD_METADATA_HEADER, metadataHeader);
  }

  private getMetadata(
    request: tus.HttpRequest | tus.HttpResponse,
    key: string,
  ): string {
    const metadataHeader = request.getHeader(UPLOAD_METADATA_HEADER);
    if (!metadataHeader) {
      return "";
    }
    const metadata = metadataHeader
      .split(",")
      .find((item) => item.startsWith(key));
    return metadata ? base64ToString(metadata.split(" ")[1]) : "";
  }
}
