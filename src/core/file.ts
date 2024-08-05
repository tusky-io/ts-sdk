import { AUTH_TAG_LENGTH_IN_BYTES, IV_LENGTH_IN_BYTES}  from "@akord/crypto";
import { status, actions } from "../constants";
import { ApiClient } from "../api/api-client";
import { FileSource, createFileLike } from "../types/file";
import { BadRequest } from "../errors/bad-request";
import { StreamConverter } from "../util/stream-converter";
import { File } from "../types";
import { GetOptions, ListOptions, validateListPaginatedApiOptions } from "../types/query-options";
import { Paginated } from "../types/paginated";
import { paginate, processListItems } from "./common";
import { BatchModule } from './batch';
import { isServer } from '../util/platform';
import { importDynamic } from '../util/import';
import { ReadableStream } from 'web-streams-polyfill/ponyfill/es2018';
import { FileService } from './service/file';
import { ServiceConfig } from './service/service';

export const DEFAULT_FILE_TYPE = "text/plain";
export const BYTES_IN_MB = 1000000;
export const DEFAULT_CHUNK_SIZE_IN_BYTES = 10 * BYTES_IN_MB;
export const MINIMAL_CHUNK_SIZE_IN_BYTES = 5 * BYTES_IN_MB;
export const CHUNKS_CONCURRENCY = 25;
export const UPLOADER_POLLING_RATE_IN_MILLISECONDS = 2500;

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
    filter: {
      status: { ne: status.DELETED }
    }
  } as ListOptions;

  protected defaultGetOptions = {
    shouldDecrypt: true,
  } as GetOptions;

  protected defaultCreateOptions = {
    parentId: undefined,
  };

  constructor(config?: ServiceConfig) {
    this.service = new FileService(config);  }

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
   * Upload file - will create a stack for file & vault if vaultId not provided in options
   * @param  {FileSource} file file source: web File object, file path, buffer or stream
   * @param  {FileUploadOptions} options cloud/permanent, public/private, parent id, vault id, etc.
   * @returns Promise with file id & uri
   */
  public async upload(
    file: FileSource,
    options: FileUploadOptions = {}
  ): Promise<File> {
    // validate vault or use/create default one
    // options.vaultId = await new Service(this.service).validateOrCreateDefaultVault(options);

    await this.service.setVaultContext(options.vaultId);
    this.service.setParentId(options.parentId ? options.parentId : options.vaultId);
    this.service.setAction(actions.FILE_CREATE);

    const fileLike = await createFileLike(file, { name: file.name, ...options });

    if (fileLike.size === 0) {
      throw new BadRequest(EMPTY_FILE_ERROR_MESSAGE);
    }

    this.service.setFile(fileLike);

    const res = await this.service.api.createFile({ vaultId: options.vaultId, file: fileLike });
    return res.file;
  }

  /**
   * Upload batch of files - will use default vault or create one if vaultId not provided in options
   * @param  {{ file: FileSource, options:FileUploadOptions }[] } items files array
   * @param  {FileUploadOptions} options cloud/permanent, public/private, parent id, vault id, etc.
   * @returns Promise with array of data response & errors if any
   */
  public async batchUpload(items: {
    file: FileSource,
    options?: FileUploadOptions
  }[], options: FileUploadOptions = {}): Promise<{ data: File[], errors: any[] }> {
    // validate vault or use/create default one
    // const vaultId = await new Service(this.service).validateOrCreateDefaultVault(options);
    const vaultId = options.vaultId;
    const batchModule = new BatchModule(this.service);
    const { data, errors } = await batchModule.batchUpload(vaultId, items);
    return { data, errors };
  }


  /**
   * @param  {string} nodeId
   * @returns Promise with the decrypted node
   */
  public async get(nodeId: string, options: GetOptions = this.defaultGetOptions): Promise<File> {
    const getOptions = {
      ...this.defaultGetOptions,
      ...options
    }
    const nodeProto = await this.service.api.getFile(nodeId);
    return this.service.processFile(nodeProto, !nodeProto.__public__ && getOptions.shouldDecrypt, nodeProto.__keys__);
  }

  /**
   * @param  {string} vaultId
   * @param  {ListOptions} options
   * @returns Promise with paginated files within given vault
   */
  public async list(vaultId: string, options: ListOptions = this.defaultListOptions = this.defaultListOptions): Promise<Paginated<File>> {
    validateListPaginatedApiOptions(options);

    if (!options.hasOwnProperty('parentId')) {
      // if parent id not present default to root - vault id
      options.parentId = vaultId;
    }
    const listOptions = {
      ...this.defaultListOptions,
      ...options
    }
    const response = await this.service.api.getFilesByVaultId(vaultId, listOptions);
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
   * @param  {string} vaultId
   * @param  {ListOptions} options
   * @returns Promise with all nodes within given vault
   */
  public async listAll(vaultId: string, options: ListOptions = this.defaultListOptions): Promise<Array<File>> {
    const list = async (options: ListOptions & { vaultId: string }) => {
      return this.list(options.vaultId, options);
    }
    return paginate<File>(list, { ...options, vaultId });
  }

  /**
   * @param  {string} id file id
   * @param  {string} name new name
   * @returns Promise with corresponding transaction id
   */
  public async rename(id: string, name: string): Promise<File> {
    await this.service.setVaultContextFromNodeId(id);
    await this.service.setName(name);
    const { file } = await this.service.api.updateFile({ id: id, name: this.service.name });
    return file;
  }

  /**
   * @param  {string} id
   * @param  {string} [parentId] new parent folder id, if no parent id provided will be moved to the vault root.
   * @returns Promise with corresponding transaction id
   */
  public async move(id: string, parentId?: string): Promise<File> {
    await this.service.setVaultContextFromNodeId(id);
    const { file } = await this.service.api.updateFile({ id: id, parentId: parentId ? parentId : this.service.vaultId });
    return file;
  }

  /**
   * The file will be moved to the trash. The file will be permanently deleted within 30 days.
   * To undo this action, call file.restore() within the 30-day period.
   * @param  {string} id file id
   * @returns Promise with the updated file
   */
  public async delete(id: string): Promise<File> {
    // TODO: see if we should use this.service.api.deleteFile() here
    const { file } = await this.service.api.updateFile({ id: id, status: status.DELETED });
    return file;
  }

  /**
   * Restores the file from the trash.
   * This action must be performed within 30 days of the file being moved to the trash to prevent permanent deletion.
   * @param  {string} id file id
   * @returns Promise with the updated file
   */
  public async restore(id: string): Promise<File> {
    const { file } = await this.service.api.updateFile({ id: id, status: status.ACTIVE });
    return file;
  }

  public async download(id: string, options: FileChunkedGetOptions = { responseType: 'arraybuffer' }): Promise<ReadableStream<Uint8Array> | ArrayBuffer> {
    const file = await this.service.api.downloadFile(id, { responseType: 'stream', public: false });


    let stream: ReadableStream<Uint8Array>;
    if (this.service.isPublic) {
      stream = file.fileData as ReadableStream<Uint8Array>;
    } else {
      const encryptedKey = file.metadata.encryptedKey;
      const iv = file.metadata.iv?.split(',');
      const streamChunkSize = options.chunkSize ? options.chunkSize + AUTH_TAG_LENGTH_IN_BYTES + (iv ? 0 : IV_LENGTH_IN_BYTES) : null;
      if (!this.service.keys && file.metadata.vaultId) {
        await this.service.setVaultContext(file.metadata.vaultId);
      } else {
        const file = await this.service.api.getFile(id);
        await this.service.setVaultContext(file.vaultId);
      }
      stream = await this.service.encrypter.decryptStream(file.fileData as ReadableStream, encryptedKey, streamChunkSize, iv);
    }

    if (options.responseType === 'arraybuffer') {
      return StreamConverter.toArrayBuffer<Uint8Array>(stream as any);
    }
    return stream;
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
  progressHook?: (percentageProgress: number, bytesProgress?: number, id?: string) => void,
  cancelHook?: AbortController
}

export type FileOptions = {
  name?: string,
  mimeType?: string,
  lastModified?: number
}

export type FileUploadOptions = Hooks & FileOptions & {
  public?: boolean,
  chunkSize?: number,
  cloud?: boolean,
  parentId?: string,
  vaultId?: string
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
