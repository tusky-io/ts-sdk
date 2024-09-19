
import { base64ToArray, base64ToString, jsonToBase64, stringToBase64 } from "../";
import { CHUNK_SIZE_IN_BYTES } from "../../core/file";
import { Vault } from "../../types";
import { AUTH_TAG_LENGTH_IN_BYTES, encrypt, encryptWithPublicKey, exportKeyToBase64, generateKey, IV_LENGTH_IN_BYTES } from "../lib";
import * as tus from 'tus-js-client'

export const CONTENT_LENGTH_HEADER = "Content-Length";
export const UPLOAD_LENGTH_HEADER = "Upload-Length";
export const UPLOAD_OFFSET_HEADER = "Upload-Offset";
export const UPLOAD_METADATA_HEADER = "Upload-Metadata";
export const UPLOAD_METADATA_CHUNK_SIZE_KEY = "chunkSize";
export const UPLOAD_METADATA_NUMBER_OF_CHUNKS_KEY = "numberOfChunks";
export const UPLOAD_METADATA_ENCRYPTED_AES_KEY_KEY = "encryptedAesKey";
export const UPLOAD_METADATA_FILENAME_KEY = "filename";

export default class EncryptableHttpStack {
    private defaultStack: tus.HttpStack;
    private vault: Vault;
    private uploadAes: Map<string, { aesKey: CryptoKey, encryptedAesKey: string }> = new Map();
    private publicKey?: string;
  
    constructor(defaultStack: tus.HttpStack, vault: Vault) {
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
      }
    }
  
    createRequest(method: string, url: string): tus.HttpRequest {
      const request = this.defaultStack.createRequest(method, url);
      if (method !== 'POST' && method !== 'PATCH') {
        return request;
      }
  
      if (this.vault.public) {
        return request;
      }
  
      let uploadId = null;
      if (method === 'PATCH') {
        uploadId = url.split('/').pop();
      }
  
      const originalSend = request.send.bind(request);
      request.send = async (body: any) => {
  
        // get aes key
        const { aesKey, encryptedAesKey } = await this.generateAesKey(uploadId);
  
        // encrypt the body
        const bodyUint8Array = await this.bodyAsUint8Array(body);
        const encryptedBody = await encrypt(bodyUint8Array, aesKey, false) as Uint8Array;
        request.setHeader(CONTENT_LENGTH_HEADER, encryptedBody.byteLength.toString());
        
        // encrypt the filename
        const filename = this.getMetadata(request, UPLOAD_METADATA_FILENAME_KEY) || 'unnamed';
        const encryptedFileName = await encryptWithPublicKey(base64ToArray(this.publicKey), filename);
        const encryptedFileNameB64 = jsonToBase64(encryptedFileName);
        this.putMetadata(request, UPLOAD_METADATA_FILENAME_KEY, stringToBase64(encryptedFileNameB64));
  
        // set the upload length
        const originalUploadLength = parseInt(request.getHeader(UPLOAD_LENGTH_HEADER) as string);
        const numberOfChunks = Math.ceil(originalUploadLength / CHUNK_SIZE_IN_BYTES);
        const uploadLength = originalUploadLength + numberOfChunks * (AUTH_TAG_LENGTH_IN_BYTES + IV_LENGTH_IN_BYTES);
        request.setHeader(UPLOAD_LENGTH_HEADER, uploadLength.toString());
        
        this.putMetadata(request, UPLOAD_METADATA_NUMBER_OF_CHUNKS_KEY, stringToBase64(numberOfChunks.toString()));
        this.putMetadata(request, UPLOAD_METADATA_CHUNK_SIZE_KEY, stringToBase64(CHUNK_SIZE_IN_BYTES.toString()));
        this.putMetadata(request, UPLOAD_METADATA_ENCRYPTED_AES_KEY_KEY, stringToBase64(encryptedAesKey));
    
        // override request upload-offset to account for encryption bytes
        const originalRequestOffset = request.getHeader(UPLOAD_OFFSET_HEADER) as string;
        if (originalRequestOffset) {
          const currentRequestChunk = Math.floor(parseInt(originalRequestOffset) / CHUNK_SIZE_IN_BYTES);
          const encryptedRequestOffset = parseInt(originalRequestOffset) - (currentRequestChunk * (AUTH_TAG_LENGTH_IN_BYTES + IV_LENGTH_IN_BYTES));
          request.setHeader(UPLOAD_OFFSET_HEADER, encryptedRequestOffset.toString());
        }
  
        // send the request
        const response = await originalSend(encryptedBody);
  
        // cache the aes key
        uploadId = response.getHeader("Location");
        if (uploadId) {
          this.uploadAes.set(uploadId.split('/').pop(), { aesKey, encryptedAesKey });
        }
  
        // override response upload-offset to allow reading from proper place in source file
        const originalResponseOffset = parseInt(response.getHeader(UPLOAD_OFFSET_HEADER) as string);
        const currentResponseChunk = Math.ceil(originalResponseOffset / CHUNK_SIZE_IN_BYTES);
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
  
    private async bodyAsUint8Array(body: Pick<ReadableStreamDefaultReader, 'read'>): Promise<Uint8Array> {
      if (body instanceof ArrayBuffer) {
        return new Uint8Array(body);
      } else if (body instanceof Buffer) {
        return new Uint8Array(body.buffer);
      } else if (body.read) {
        return await this.streamToUint8Array(body);
      } else {
        throw new Error("Unsupported body type");
      }
    }
  
    private async streamToUint8Array(stream: any): Promise<Uint8Array> {
      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      }).then(buffer => new Uint8Array(buffer as any));
    }
  
    private async generateAesKey(uploadId?: string): Promise<{ aesKey: CryptoKey, encryptedAesKey: string }> {
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
  
    private getMetadata(request: tus.HttpRequest, key: string): string {
      const metadataHeader = request.getHeader(UPLOAD_METADATA_HEADER);
      if (!metadataHeader) {
        return null;
      }
      const metadata = metadataHeader.split(',').find(item => item.startsWith(key));
      return metadata ? base64ToString((metadata.split(' ')[1])) : null;
    }
  }
  