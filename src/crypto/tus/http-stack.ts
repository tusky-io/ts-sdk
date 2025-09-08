import { tusFileToUint8Array } from "@env/types/file";
import {
  base64ToJson,
  base64ToString,
  jsonToBase64,
  stringToArray,
  stringToBase64,
} from "../";
import {
  CHUNK_SIZE_IN_BYTES,
  ENCRYPTED_CHUNK_SIZE_IN_BYTES,
} from "../../core/file";
import { Vault } from "../../types";
import {
  AUTH_TAG_LENGTH_IN_BYTES,
  encryptAes,
  IV_LENGTH_IN_BYTES,
} from "../lib";
import * as tus from "tus-js-client";
import { X25519EncryptedPayload } from "../types";
import { Encrypter } from "../encrypter";
import { AESKeyPayload, VaultEncryption } from "../vault-encryption";
import { logger } from "../../logger";

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
    logger.info("[EncryptableHttpStack] create request");
    const request = this.defaultStack.createRequest(method, url);
    if (method !== "POST" && method !== "PATCH" && method !== "HEAD") {
      return request;
    }

    if (!this.vault.encrypted) {
      return request;
    }

    let uploadId = null;
    if (method === "PATCH" || method === "HEAD") {
      uploadId = url.split("/").pop();
    }

    const originalSend = request.send.bind(request);
    request.send = async (body: any) => {
      logger.info(request);
      logger.info(body);
      let decoratedBody = body;
      let response: tus.HttpResponse;
      let key: AESKeyPayload;

      if (method === "POST" || method === "PATCH") {
        // get aes key
        logger.info("[EncryptableHttpStack] get aes key");

        if (uploadId && this.uploadAes.has(uploadId)) {
          key = this.uploadAes.get(uploadId);
        } else {
          logger.info("[EncryptableHttpStack] before generateAesKey()");

          key = await this.vaultEncryption.generateAesKey();
          logger.info("[EncryptableHttpStack] after generateAesKey()");
        }

        // encrypt the body
        logger.info("[EncryptableHttpStack] before tusFileToUint8Array(body)");

        const bodyUint8Array = await tusFileToUint8Array(body);
        logger.info("[EncryptableHttpStack] after tusFileToUint8Array(body)");

        logger.info("[EncryptableHttpStack] before encryptAes()");

        const encryptedBody = (await encryptAes(
          bodyUint8Array,
          key.aesKey,
          false,
        )) as Uint8Array;
        logger.info("[EncryptableHttpStack] after encryptAes()");

        if (!request.getUnderlyingObject()) {
          request.setHeader(
            CONTENT_LENGTH_HEADER,
            encryptedBody.byteLength.toString(),
          );
        }
        decoratedBody = encryptedBody;

        // encrypt the filename
        const filename =
          this.getMetadata(request, UPLOAD_METADATA_FILENAME_KEY) || "unnamed";
        logger.info("[EncryptableHttpStack] before encryptHybrid()");

        const encryptedFileNameB64 = await this.vaultEncryption.encryptHybrid(
          stringToArray(filename),
        );
        logger.info("[EncryptableHttpStack] after encryptHybrid()");

        logger.info("[EncryptableHttpStack] before putMetadata()");

        this.putMetadata(
          request,
          UPLOAD_METADATA_FILENAME_KEY,
          stringToBase64(encryptedFileNameB64),
        );
        logger.info("[EncryptableHttpStack] after putMetadata()");

        // set the upload length
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

        logger.info("[EncryptableHttpStack] before reinitialize the xhr");

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
      logger.info("[EncryptableHttpStack] after reinitialize the xhr");

      // send the request
      logger.info("[EncryptableHttpStack] before send the request");

      response = await originalSend(decoratedBody);
      logger.info("[EncryptableHttpStack] after send the request");

      // read the upload id
      const location = response.getHeader("Location");
      if (location && !uploadId) {
        uploadId = location.split("/").pop();
      }

      // cache the aes key
      logger.info("[EncryptableHttpStack] before cache the aes key");

      if (uploadId) {
        if (!key) {
          if (this.uploadAes.has(uploadId)) {
            key = this.uploadAes.get(uploadId);
          } else {
            // read the aes key from the response (primary for HEAD requests but would work for POST & PATCH as well)
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
            }
          }
        }
        if (key && !this.uploadAes.has(uploadId)) {
          this.uploadAes.set(uploadId, key);
        }
      }
      logger.info("[EncryptableHttpStack] after cache the aes key");

      // override response upload-offset to allow reading from proper place in source file
      logger.info(
        "[EncryptableHttpStack] before override response upload-offset",
      );

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
      logger.info(
        "[EncryptableHttpStack] after override response upload-offset",
      );

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
      return null;
    }
    const metadata = metadataHeader
      .split(",")
      .find((item) => item.startsWith(key));
    return metadata ? base64ToString(metadata.split(" ")[1]) : null;
  }
}
