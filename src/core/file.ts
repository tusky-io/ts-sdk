import { FileSource, fileSourceToTusFile } from "@env/types/file";
import { status } from "../constants";
import { ApiClient } from "../api/api-client";
import { BadRequest } from "../errors/bad-request";
import { StreamConverter } from "../util/stream-converter";
import { File, FileDownloadOptions, FileUploadOptions } from "../types";
import { GetOptions, ListOptions, validateListPaginatedApiOptions } from "../types/query-options";
import { Paginated } from "../types/paginated";
import { paginate, processListItems } from "./common";
import { ReadableStream } from 'web-streams-polyfill/ponyfill/es2018';
import { FileService } from './service/file';
import { ServiceConfig } from './service/service';
import { AsymEncryptedPayload } from "../crypto/types";
import { arrayToString, base64ToJson} from "../crypto";
import { AUTH_TAG_LENGTH_IN_BYTES, decryptStream, decryptWithPrivateKey, importKeyFromBase64, IV_LENGTH_IN_BYTES } from "../crypto/lib";
import * as tus from 'tus-js-client'
import { Auth } from "../auth";
import { IncorrectEncryptionKey } from "../errors/incorrect-encryption-key";
import EncryptableHttpStack from "../crypto/tus/http-stack";

export const DEFAULT_FILE_TYPE = "text/plain";
export const DEFAULT_FILE_NAME = "unnamed";

export const BYTES_IN_MB = 1000000;
export const CHUNK_SIZE_IN_BYTES = 5 * BYTES_IN_MB;
export const ENCRYPTED_CHUNK_SIZE_IN_BYTES = CHUNK_SIZE_IN_BYTES + AUTH_TAG_LENGTH_IN_BYTES + IV_LENGTH_IN_BYTES;

export const UPLOADER_SERVER_MAX_CONNECTIONS_PER_CLIENT = 20;
export const EMPTY_FILE_ERROR_MESSAGE = "Cannot upload an empty file";


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

  /**
   * Generate preconfigured Tus uploader
   * @param  {string} vaultId
   * @param  {FileSource} file 
   *    Nodejs: Buffer | Readable | string (path) | ArrayBuffer | Uint8Array
   *    Browser: File | Blob | Uint8Array | ArrayBuffer
   * @param  {FileUploadOptions} options parent id, file name file mime type, etc
   * @returns Promise with tus.Upload instance
   * 
   *
   * <b>Example 1 - use in Browser with Uppy upload</b>
   * 
   * const uploader = akord.zip.uploader(vaultId)
   * 
   * const uppy = new Uppy({
   *    restrictions: {
   *      allowedFileTypes: ['.zip', 'application/zip', 'application/x-zip-compressed'],
   *      maxFileSize: 1000000000,
   *    },
   *    autoProceed: false
   *  })
   *  .use(Tus, uploader.options)
   * 
   * uppy.addFile(file)
   * uppy.upload()
   * 
   * 
   * <b>Example 2 - use in Nodejs</b>
   * 
   * const uploader = akord.zip.uploader(vaultId, file, {
   *    onSuccess: () => {
   *      console.log('Upload complete');
   *    },
   *    onError: (error) => {
   *      console.log('Upload error', error);
   *    },
   *    onProgress: (progress) => {
   *      console.log('Upload progress', progress);
   *    }
   * })
   * 
   * uploader.start()
   * 
   */
  public async uploader(
    vaultId: string,
    file: FileSource = null,
    options: FileUploadOptions = {}
  ): Promise<tus.Upload> {
    const vault = await this.service.api.getVault(vaultId);

    let fileLike = null;
    if (file) {
      fileLike = await fileSourceToTusFile(file);

      if (fileLike.size === 0) {
        throw new BadRequest(EMPTY_FILE_ERROR_MESSAGE);
      }
    }

    const upload = new tus.Upload(fileLike as any, {
      endpoint: `${this.service.api.config.apiUrl}/uploads`,
      retryDelays: [0, 500, 2000, 5000],
      metadata: {
        vaultId: vaultId,
        parentId: options?.parentId || vaultId,
        filename: options?.name || fileLike?.name || DEFAULT_FILE_NAME, //auto-populated when using Uppy
        filetype: options?.mimeType || fileLike?.type || DEFAULT_FILE_TYPE, //auto-populated when using Uppy
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
   * @param  {FileSource} file 
   *    Nodejs: Buffer | Readable | string (path) | ArrayBuffer | Uint8Array
   *    Browser: File | Blob | Uint8Array | ArrayBuffer
   * @param  {FileUploadOptions} options parent id, file name file mime type, etc.
   * @returns Promise with upload id
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

  public async stream(id: string): Promise<ReadableStream<Uint8Array>> {
    const file = await this.service.api.downloadFile(id, { responseType: 'stream', public: false });
    // TODO: send encryption context directly with the file data
    const fileMetadata = new File(await this.service.api.getFile(id));
    this.service.setIsPublic(false);
    
    let stream: ReadableStream<Uint8Array>;
    if (fileMetadata.__public__) {
      stream = file as ReadableStream<Uint8Array>;
    } else {
      const aesKey = await this.aesKey(id);
      stream = await decryptStream(file as ReadableStream, aesKey, fileMetadata.chunkSize);
    }
    return stream;
  }

  public async arrayBuffer(id: string): Promise<ArrayBuffer> {
    const stream = await this.stream(id);
    return StreamConverter.toArrayBuffer<Uint8Array>(stream as any);
  }

  protected async aesKey(id: string): Promise<CryptoKey> {
      const fileMetadata = await this.get(id);
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
      return aesKey;
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

export type FileMetadataOptions = {
  name?: string,
  mimeType?: string,
  lastModified?: number
}

export type FileLocationOptions = {
  parentId?: string
}

export type FileGetOptions = FileDownloadOptions & {
  responseType?: 'arraybuffer' | 'stream',
}

export {
  FileModule
}
