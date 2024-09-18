import { status } from "../constants";
import { ApiClient } from "../api/api-client";
import { FileSource, createFileLike } from "../types/file";
import { BadRequest } from "../errors/bad-request";
import { StreamConverter } from "../util/stream-converter";
import { File, Vault } from "../types";
import { GetOptions, ListOptions, validateListPaginatedApiOptions } from "../types/query-options";
import { Paginated } from "../types/paginated";
import { paginate, processListItems } from "./common";
import { BatchModule } from './batch';
import { isServer } from '../util/platform';
import { importDynamic } from '../util/import';
import { ReadableStream } from 'web-streams-polyfill/ponyfill/es2018';
import { FileService } from './service/file';
import { ServiceConfig } from './service/service';
import { AsymEncryptedPayload } from "../crypto/types";
import { arrayToString, base64ToArray, base64ToJson, base64ToString, jsonToBase64, stringToBase64 } from "../crypto";
import { AUTH_TAG_LENGTH_IN_BYTES, decrypt, decryptStream, decryptWithPrivateKey, encrypt, encryptWithPublicKey, exportKeyToBase64, generateKey, importKeyFromBase64, IV_LENGTH_IN_BYTES } from "../crypto/lib";
import * as tus from 'tus-js-client'
import { Auth } from "../auth";
import { Readable } from 'stream'; //conditionally
import { IncorrectEncryptionKey } from "../errors/incorrect-encryption-key";

export const DEFAULT_FILE_TYPE = "text/plain";
export const DEFAULT_FILE_NAME = "unnamed";

export const BYTES_IN_MB = 1000000;
export const CHUNK_SIZE_IN_BYTES = 5 * BYTES_IN_MB;

export const CONTENT_LENGTH_HEADER = "Content-Length";
export const UPLOAD_LENGTH_HEADER = "Upload-Length";
export const UPLOAD_OFFSET_HEADER = "Upload-Offset";
export const UPLOAD_METADATA_HEADER = "Upload-Metadata";
export const UPLOAD_METADATA_CHUNK_SIZE_KEY = "chunkSize";
export const UPLOAD_METADATA_NUMBER_OF_CHUNKS_KEY = "numberOfChunks";
export const UPLOAD_METADATA_ENCRYPTED_AES_KEY_KEY = "encryptedAesKey";
export const UPLOAD_METADATA_FILENAME_KEY = "filename";

export const UPLOADER_SERVER_MAX_CONNECTIONS_PER_CLIENT = 20;
export const EMPTY_FILE_ERROR_MESSAGE = "Cannot upload an empty file";



class EncryptableHttpStack {
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

  private async bodyAsUint8Array(body: any): Promise<Uint8Array> {
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

  private async streamToUint8Array(stream: Readable): Promise<Uint8Array> {
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

class FileModule {

  protected contentType = null as string;
  protected client: ApiClient;
  protected type: "File";

  protected service: FileService;

  protected parentId?: string;

  protected defaultListOptions = {
    shouldDecrypt: true,
    parentId: undefined,
  } as ListOptions;

  protected defaultGetOptions = {
    shouldDecrypt: true,
  } as GetOptions;

  protected defaultCreateOptions = {
    parentId: undefined,
  };

  constructor(config?: ServiceConfig) {
    this.service = new FileService(config);
  }

  // public async create(
  //   file: FileLike,
  //   options: FileUploadOptions
  // ): Promise<FileUploadResult> {
  //   options.public = this.service.isPublic;
  //   const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE_IN_BYTES;
  //   if (chunkSize < MINIMAL_CHUNK_SIZE_IN_BYTES) {
  //     throw new BadRequest("Chunk size can not be smaller than: " + MINIMAL_CHUNK_SIZE_IN_BYTES / BYTES_IN_MB)
  //   }
  //   if (file.size > chunkSize) {
  //     options.chunkSize = chunkSize;
  //     const tags = this.getFileTags(file, options);
  //     return await this.uploadChunked(file, tags, options);
  //   } else {
  //     const tags = this.getFileTags(file, options);
  //     return await this.uploadInternal(file, tags, options);
  //   }
  // }

  /**
   * Generate preconfigured Tus uploader
   * @param  {string} vaultId
   * @param  {FileSource} file file source: web File object, file path, buffer or stream
   * @param  {FileUploadOptions} options public/private, parent id, vault id, etc.
   * @returns Promise with file id & uri
   */
  public async uploader(
    vaultId: string,
    file: FileSource = null,
    options: FileUploadOptions = {}
  ): Promise<tus.Upload> {
    const vault = await this.service.api.getVault(vaultId);

    let fileLike = null;
    if (file) {
      fileLike = await createFileLike(file, { name: file.name, ...options });

      if (fileLike.size === 0) {
        throw new BadRequest(EMPTY_FILE_ERROR_MESSAGE);
      }
    }

    const upload = new tus.Upload(fileLike?.file as any, {
      endpoint: `${this.service.api.config.apiUrl}/uploads`,
      retryDelays: [0, 500, 2000, 5000],
      metadata: {
        vaultId: vaultId,
        parentId: options.parentId ? options.parentId : vaultId,
        filename: fileLike && fileLike.options.name ? fileLike.options.name : DEFAULT_FILE_NAME, //auto-populated when using Uppy
        filetype: fileLike && fileLike.options.mimeType ? fileLike.options.mimeType : DEFAULT_FILE_TYPE, //auto-populated when using Uppy
      },
      uploadDataDuringCreation: true,
      parallelUploads: 1, // tus-nodejs-server does not support parallel uploads yet
      chunkSize: CHUNK_SIZE_IN_BYTES,
      headers: {
        ...(await Auth.getAuthorizationHeader() as Record<string, string>),
      },
      httpStack: new EncryptableHttpStack(new tus.DefaultHttpStack({}), vault),
      removeFingerprintOnSuccess: true,
      onError: options.onError,
      onProgress: options.onProgress,
      onSuccess: options.onSuccess,
    })
    return upload;
  }


  /**
   * Upload file
   * @param  {string} vaultId
   * @param  {FileSource} file file source: web File object, file path, buffer or stream
   * @param  {FileUploadOptions} options public/private, parent id, vault id, etc.
   * @returns Promise with file id & uri
   */
  public async upload(
    vaultId: string,
    file: FileSource,
    options: FileUploadOptions = {}
  ): Promise<string> {
    const upload = await this.uploader(vaultId, file, options);
    await new Promise<void>((resolve, reject) => {
      upload.options.onSuccess = () => {
        if (options.onSuccess) {
          options.onSuccess();
        }
        resolve();
      };
      upload.options.onError = (error) => {
        if (options.onError) {
          options.onError(error);
        }
        reject(error);
      };
      upload.start();
    });
    const uploadId = upload.url.split('/').pop();
    return uploadId;
  }

  /**
   * Upload batch of files
   * @param  {string} vaultId
   * @param  {{ file: FileSource, options:FileUploadOptions }[] } items files array
   * @param  {FileUploadOptions} options public/private, parent id, vault id, etc.
   * @returns Promise with array of data response & errors if any
   */
  // public async batchUpload(vaultId: string, items: {
  //   file: FileSource,
  //   options?: FileUploadOptions
  // }[]): Promise<{ data: File[], errors: any[] }> {
  //   const batchModule = new BatchModule(this.service);
  //   const { data, errors } = await batchModule.batchUpload(vaultId, items);
  //   return { data, errors };
  // }

  /**
   * @param  {string} id
   * @returns Promise with the decrypted node
   */
  public async get(id: string, options: GetOptions = this.defaultGetOptions): Promise<File> {
    const getOptions = {
      ...this.defaultGetOptions,
      ...options
    }
    const nodeProto = await this.service.api.getFile(id);
    return this.service.processFile(nodeProto, !nodeProto.__public__ && getOptions.shouldDecrypt, nodeProto.__keys__);
  }

  /**
   * @param  {ListOptions} options
   * @returns Promise with paginated user files
   */
  public async list(options: ListOptions = this.defaultListOptions = this.defaultListOptions): Promise<Paginated<File>> {
    validateListPaginatedApiOptions(options);

    if (!options.hasOwnProperty('parentId')) {
      // if parent id not present default to root - vault id
      options.parentId = options.vaultId;
    }
    const listOptions = {
      ...this.defaultListOptions,
      ...options
    }
    const response = await this.service.api.getFiles(listOptions);
    const items = [];
    const errors = [];
    const processItem = async (nodeProto: any) => {
      try {
        const node = await this.service.processFile(nodeProto, !nodeProto.__public__ && listOptions.shouldDecrypt, nodeProto.__keys__);
        items.push(node);
      } catch (error) {
        errors.push({ id: nodeProto.id, error });
      };
    }
    await processListItems(response.items, processItem);
    return {
      items,
      nextToken: response.nextToken,
      errors
    }
  }

  /**
   * @param  {ListOptions} options
   * @returns Promise with all user files
   */
  public async listAll(options: ListOptions = this.defaultListOptions): Promise<Array<File>> {
    const list = async (options: ListOptions) => {
      return this.list(options);
    }
    return paginate<File>(list, options);
  }

  /**
   * @param  {string} id file id
   * @param  {string} name new name
   * @returns Promise with corresponding transaction id
   */
  public async rename(id: string, name: string): Promise<File> {
    await this.service.setVaultContextFromNodeId(id);
    await this.service.setName(name);
    return this.service.api.updateFile({ id: id, name: this.service.name });
  }

  /**
   * @param  {string} id
   * @param  {string} [parentId] new parent folder id, if no parent id provided will be moved to the vault root.
   * @returns Promise with corresponding transaction id
   */
  public async move(id: string, parentId?: string): Promise<File> {
    await this.service.setVaultContextFromNodeId(id);
    return this.service.api.updateFile({ id: id, parentId: parentId ? parentId : this.service.vaultId });
  }

  /**
   * The file will be moved to the trash. The file will be permanently deleted within 30 days.
   * To undo this action, call file.restore() within the 30-day period.
   * @param  {string} id file id
   * @returns Promise with the updated file
   */
  public async delete(id: string): Promise<File> {
    return this.service.api.updateFile({ id: id, status: status.DELETED });
  }

  /**
   * Restores the file from the trash.
   * This action must be performed within 30 days of the file being moved to the trash to prevent permanent deletion.
   * @param  {string} id file id
   * @returns Promise with the updated file
   */
  public async restore(id: string): Promise<File> {
    return this.service.api.updateFile({ id: id, status: status.ACTIVE });
  }

  /**
   * The file will be permanently deleted.
   * This action is irrevocable and can only be performed if the file is already in trash.
   * @param  {string} id file id
   * @returns {Promise<void>}
   */
  public async deletePermanently(id: string): Promise<void> {
    return this.service.api.deleteFile(id);
  }

  public async download(id: string, options: FileChunkedGetOptions = { responseType: 'arraybuffer' }): Promise<ReadableStream<Uint8Array> | ArrayBuffer> {
    const file = await this.service.api.downloadFile(id, { responseType: 'stream', public: false });
    // TODO: send encryption context directly with the file data
    const fileMetadata = new File(await this.service.api.getFile(id));
    this.service.setIsPublic(false);
    
    let stream: ReadableStream<Uint8Array>;
    if (fileMetadata.__public__) {
      return file.fileData as ArrayBuffer;
    } else {
      const encryptedAesKey = base64ToJson(fileMetadata.encryptedAesKey) as AsymEncryptedPayload;

      if (!fileMetadata.encryptedAesKey) {
        throw new IncorrectEncryptionKey(new Error("Missing file encryption context."));
      }


      // decrypt vault's private key
      const vaultEncPrivateKey = fileMetadata.__keys__.find((key) => key.publicKey === encryptedAesKey.publicKey).encPrivateKey;
      const privateKey = await this.service.encrypter.decrypt(vaultEncPrivateKey);

      // decrypt AES key with vault's private key
      const decryptedKey = await decryptWithPrivateKey(privateKey, encryptedAesKey);
      const aesKey = await importKeyFromBase64(arrayToString(decryptedKey));

      stream = await decryptStream(file.fileData as ReadableStream, aesKey, CHUNK_SIZE_IN_BYTES, null);

      if (options.responseType === 'arraybuffer') {
        return StreamConverter.toArrayBuffer<Uint8Array>(stream as any);
      }
      return stream;
    }
  }

  private async saveFile(path: string, type: string, stream: ReadableStream, skipSave: boolean = false): Promise<string> {
    if (isServer()) {
      const fs = importDynamic("fs");
      const Readable = importDynamic("stream").Readable;
      return new Promise((resolve, reject) =>
        Readable.from(stream).pipe(fs.createWriteStream(path))
          .on('error', error => reject(error))
          .on('finish', () => resolve(path))
      );
    } else {
      const buffer = await StreamConverter.toArrayBuffer(stream)
      const blob = new Blob([buffer], { type: type });
      const url = window.URL.createObjectURL(blob);
      if (!skipSave) {
        const a = document.createElement("a");
        a.download = path;
        a.href = url
        a.click();
      }
      return url;
    }
  }
}

export type FileUploadResult = {
  resourceUri: string[],
  resourceHash?: string,
  numberOfChunks?: number,
  chunkSize?: number,
  iv?: string[]
  encryptedKey?: string
}

export type Hooks = {
  onProgress?: ((bytesSent: number, bytesTotal: number) => void) | null,
  onChunkComplete?: ((chunkSize: number, bytesAccepted: number, bytesTotal: number) => void) | null,
  onSuccess?: (() => void) | null,
  onError?: ((error: Error | tus.DetailedError) => void) | null,
}

export type FileOptions = {
  name?: string,
  mimeType?: string,
  lastModified?: number
}

export type FileUploadOptions = Hooks & FileOptions & {
  chunkSize?: number,
  parentId?: string,
}

export type FileDownloadOptions = Hooks & {
  path?: string,
  skipSave?: boolean,
  public?: boolean,
}

export type FileGetOptions = FileDownloadOptions & {
  responseType?: 'arraybuffer' | 'stream',
}

export type FileChunkedGetOptions = {
  responseType?: 'arraybuffer' | 'stream',
  chunkSize?: number
}

export type FileVersionData = {
  [K in keyof File]?: File[K]
} & {
  data: ReadableStream<Uint8Array> | ArrayBuffer
}

export {
  FileModule
}
