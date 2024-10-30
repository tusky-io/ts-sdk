import { tusFileToUint8Array } from "@env/types/file";
import { arrayToString, base64ToArray, base64ToJson, base64ToString, jsonToBase64, stringToBase64 } from "../";
import { CHUNK_SIZE_IN_BYTES, ENCRYPTED_CHUNK_SIZE_IN_BYTES } from "../../core/file";
import { Vault } from "../../types";
import { AUTH_TAG_LENGTH_IN_BYTES, decryptWithPrivateKey, encrypt, encryptWithPublicKey, exportKeyToBase64, generateKey, importKeyFromBase64, IV_LENGTH_IN_BYTES } from "../lib";
import * as tus from 'tus-js-client'
import { X25519EncryptedPayload } from "../types";
import Encrypter from "../encrypter";

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
    private uploadAes: Map<string, { aesKey: CryptoKey, encryptedAesKey: string }> = new Map();
    private publicKey?: string;
    private encPrivateKey?: string;
    private encrypter?: Encrypter;
    
    constructor(defaultStack: tus.HttpStack, vault: Vault, encrypter: Encrypter) {
      this.defaultStack = defaultStack;
      if (!vault) {
        throw new Error("Vault is required");
      }
      this.vault = vault;
      if (!vault.public) {
        if (!vault.__keys__ || vault.__keys__.length === 0) {
          throw new Error("Encrypted vault has no keys");
        }
        this.publicKey = vault.__keys__[vault.__keys__.length - 1].publicKey;
        this.encPrivateKey = vault.__keys__[vault.__keys__.length - 1].encPrivateKey;
        this.encrypter = encrypter;
      }
    }
  
    createRequest(method: string, url: string): tus.HttpRequest {
      const request = this.defaultStack.createRequest(method, url);
      if (method !== 'POST' && method !== 'PATCH' && method !== 'HEAD') {
        return request;
      }
  
      if (this.vault.public) {
        return request;
      }
  
      let uploadId = null;
      if (method === 'PATCH' || method === 'HEAD') {
        uploadId = url.split('/').pop();
      }
      

      const originalSend = request.send.bind(request);
      request.send = async (body: any) => {
        let decoratedBody = body;
        let response: tus.HttpResponse;
        let key: { aesKey: CryptoKey, encryptedAesKey: string };

        if (method === 'POST' || method === 'PATCH') {
          // get aes key
          key = await this.getAesKey(uploadId);
  
          // encrypt the body
          const bodyUint8Array = await tusFileToUint8Array(body);
          const encryptedBody = await encrypt(bodyUint8Array, key.aesKey, false) as Uint8Array;
          if (!request.getUnderlyingObject()) {
            request.setHeader(CONTENT_LENGTH_HEADER, encryptedBody.byteLength.toString());
          }
          decoratedBody = encryptedBody;
          
          // encrypt the filename
          const filename = this.getMetadata(request, UPLOAD_METADATA_FILENAME_KEY) || 'unnamed';
          const encryptedFileName = await encryptWithPublicKey(base64ToArray(this.publicKey), filename);
          const encryptedFileNameB64 = jsonToBase64(encryptedFileName);
          this.putMetadata(request, UPLOAD_METADATA_FILENAME_KEY, stringToBase64(encryptedFileNameB64));
    
          // set the upload length
          const uploadLengthHeader = request.getHeader(UPLOAD_LENGTH_HEADER);
          if (uploadLengthHeader) {
            const originalUploadLength = parseInt(uploadLengthHeader);
            const numberOfChunks = Math.ceil(originalUploadLength / CHUNK_SIZE_IN_BYTES);
            const uploadLength = originalUploadLength + numberOfChunks * (AUTH_TAG_LENGTH_IN_BYTES + IV_LENGTH_IN_BYTES);
            request.setHeader(UPLOAD_LENGTH_HEADER, uploadLength.toString());
          
            this.putMetadata(request, UPLOAD_METADATA_NUMBER_OF_CHUNKS_KEY, stringToBase64(numberOfChunks.toString()));
            this.putMetadata(request, UPLOAD_METADATA_CHUNK_SIZE_KEY, stringToBase64(ENCRYPTED_CHUNK_SIZE_IN_BYTES.toString()));
            this.putMetadata(request, UPLOAD_METADATA_ENCRYPTED_AES_KEY_KEY, stringToBase64(key.encryptedAesKey));
          }

          // override request upload-offset to account for encryption bytes
          const originalRequestOffset = request.getHeader(UPLOAD_OFFSET_HEADER) as string;
          if (originalRequestOffset) {
            const currentRequestChunk = Math.ceil(parseInt(originalRequestOffset) / CHUNK_SIZE_IN_BYTES);
            const encryptedRequestOffset = parseInt(originalRequestOffset) + (currentRequestChunk * (AUTH_TAG_LENGTH_IN_BYTES + IV_LENGTH_IN_BYTES));
            request.setHeader(UPLOAD_OFFSET_HEADER, encryptedRequestOffset.toString());
          }

          // reinitialize the xhr
          if ((request as any)._xhr) {
            (request as any)._xhr.abort();
            (request as any)._xhr = new XMLHttpRequest();
            (request as any)._xhr.open(method, url, true);
            for (const headerName of Object.keys((request as any)._headers)) {
              (request as any)._xhr.setRequestHeader(headerName, (request as any)._headers[headerName]);
            }
          }
        }

        // send the request
        response = await originalSend(decoratedBody);

        // read the upload id
        const location = response.getHeader("Location");
        if (location && !uploadId) {
          uploadId = location.split('/').pop();
        }

        // cache the aes key
        if (uploadId) {
          if (!key) {
            if (this.uploadAes.has(uploadId)) {
              key = this.uploadAes.get(uploadId);
            } else {
              // read the aes key from the response (primary for HEAD requests but would work for POST & PATCH as well)
              const encryptedAesKeyBase64 = this.getMetadata(response, UPLOAD_METADATA_ENCRYPTED_AES_KEY_KEY);
              if (encryptedAesKeyBase64 && this.encrypter) {
                const encryptedAesKey = base64ToJson(encryptedAesKeyBase64) as X25519EncryptedPayload;
                const privateKey = await this.encrypter.decrypt(this.encPrivateKey);
                const decryptedKey = await decryptWithPrivateKey(privateKey, encryptedAesKey);
                const aesKey = await importKeyFromBase64(arrayToString(decryptedKey));
                key = { aesKey, encryptedAesKey: encryptedAesKeyBase64 };
              }
            }
          }
          if (key && !this.uploadAes.has(uploadId)) {
            this.uploadAes.set(uploadId, key);
          }
        }
  
        // override response upload-offset to allow reading from proper place in source file
        const originalResponseOffset = parseInt(response.getHeader(UPLOAD_OFFSET_HEADER) as string);
        const currentResponseChunk = Math.ceil(originalResponseOffset / ENCRYPTED_CHUNK_SIZE_IN_BYTES);
        const encryptedResponseOffset = originalResponseOffset - (currentResponseChunk * (AUTH_TAG_LENGTH_IN_BYTES + IV_LENGTH_IN_BYTES));
        
        const originalGetHeader = response.getHeader.bind(response);
        response.getHeader = (key: string) => {
          if (key === UPLOAD_OFFSET_HEADER) {
            return encryptedResponseOffset.toString();
          }
          return originalGetHeader(key);
        }
        return response as tus.HttpResponse;
      }
      return request;
    }
  
    getName(): string {
      return 'EncryptableHttpStack';
    }
  
    private async getAesKey(uploadId?: string): Promise<{ aesKey: CryptoKey, encryptedAesKey: string }> {
      if (uploadId) {
        const existingUpload = this.uploadAes.get(uploadId);
        if (existingUpload) {
          return existingUpload;
        }
      }
      const aesKey = await generateKey();
      const accessKeyB64 = await exportKeyToBase64(aesKey)
      const encryptedAesKey = jsonToBase64(await encryptWithPublicKey(
          base64ToArray(this.publicKey),
          accessKeyB64
        )
      )
      return { aesKey, encryptedAesKey };
    }
  
    private putMetadata(request: tus.HttpRequest, key: string, value: string): void {
      const existingMetadata = request.getHeader(UPLOAD_METADATA_HEADER)?.split(',') ?? [];
      const newMetadata = existingMetadata.filter(item => !item.startsWith(`${key} `));
      newMetadata.push(`${key} ${value}`);
      const metadataHeader = newMetadata.join(',');
      request.setHeader(UPLOAD_METADATA_HEADER, metadataHeader);
    }
  
    private getMetadata(request: tus.HttpRequest | tus.HttpResponse, key: string): string {
      const metadataHeader = request.getHeader(UPLOAD_METADATA_HEADER);
      if (!metadataHeader) {
        return null;
      }
      const metadata = metadataHeader.split(',').find(item => item.startsWith(key));
      return metadata ? base64ToString((metadata.split(' ')[1])) : null;
    }
  }
  