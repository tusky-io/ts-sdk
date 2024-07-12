import PQueue, { AbortError } from '@esm2cjs/p-queue';
import { AUTH_TAG_LENGTH_IN_BYTES, IV_LENGTH_IN_BYTES, digestRaw, initDigest } from "@akord/crypto";
import { Service } from "./service/service";
import { protocolTags, encryptionTags as encTags, fileTags, dataTags, status, functions, actions, objects } from "../constants";
import { ApiClient } from "../api/api-client";
import { FileLike, FileSource, createFileLike } from "../types/file";
import { Tag, Tags } from "../types/contract";
import { BadRequest } from "../errors/bad-request";
import { StreamConverter } from "../util/stream-converter";
import { File } from "../types";
import { GetOptions, ListOptions, validateListPaginatedApiOptions } from "../types/query-options";
import { Paginated } from "../types/paginated";
import { paginate, processListItems } from "./common";
import { NodeCreateOptions, NodeService, NodeServiceConfig } from './service/node';
import { BatchModule } from './batch';
import { isServer } from '../util/platform';
import { importDynamic } from '../util/import';
import { ReadableStream } from 'web-streams-polyfill/ponyfill/es2018';

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

  protected service: NodeService<File>;

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
    tags: [],
    txTags: [],
  } as NodeCreateOptions;

  constructor(config?: NodeServiceConfig) {
    this.service = new NodeService<File>(config);
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
    this.service.setActionRef(actions.FILE_CREATE);
    this.service.setFunction(functions.FILE_CREATE);

    const createOptions = {
      ...options
    }

    const fileService = new FileModule({ ...this.service, contentType: this.contentType });

    const fileLike = await createFileLike(file, { ...options, name: file.name });

    if (fileLike.size === 0) {
      throw new BadRequest(EMPTY_FILE_ERROR_MESSAGE);
    }

    const fileName = options.name || fileLike.name;

    this.service.setAkordTags((this.service.isPublic ? [fileName] : []).concat([]));

    // const fileUploadResult = await fileService.create(fileLike, createOptions);
    const version = await fileService.newVersion(fileLike);

    const tags = this.getFileTags(fileLike, options);

    const { object } = await this.service.nodeCreate<File>(version, { parentId: createOptions.parentId }, tags.concat(options.txTags), fileLike);
    return object;
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
    const nodeProto = await this.service.api.getNode<File>(nodeId, this.type, getOptions.vaultId);
    const node = await this.service.processNode(nodeProto, !nodeProto.__public__ && getOptions.shouldDecrypt, nodeProto.__keys__);
    return node;
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
    const response = await this.service.api.getNodesByVaultId<File>(vaultId, this.type, listOptions);
    const items = [];
    const errors = [];
    const processItem = async (nodeProto: any) => {
      try {
        const node = await this.service.processNode(nodeProto, !nodeProto.__public__ && listOptions.shouldDecrypt, nodeProto.__keys__);
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
      return await this.list(options.vaultId, options);
    }
    return await paginate<File>(list, { ...options, vaultId });
  }

  /**
   * @param  {string} id folder id
   * @param  {string} name new name
   * @returns Promise with corresponding transaction id
   */
  public async rename(id: string, name: string): Promise<File> {
    await this.service.setVaultContextFromNodeId(id, this.type);
    this.service.setActionRef(this.type.toUpperCase() + "_RENAME");
    this.service.setFunction(functions.FILE_UPDATE);
    const state = {
      name: await this.service.processWriteString(name)
    };
    return ((await this.service.nodeUpdate<File>()).object);
  }

  /**
   * @param  {string} id
   * @param  {string} [parentId] new parent folder id, if no parent id provided will be moved to the vault root.
   * @returns Promise with corresponding transaction id
   */
  public async move(id: string, parentId?: string, vaultId?: string): Promise<File> {
    await this.service.setVaultContextFromNodeId(id, this.type, vaultId);
    this.service.setActionRef(this.type.toUpperCase() + "_MOVE");
    this.service.setFunction(functions.FILE_MOVE);
    return ((await this.service.nodeUpdate<File>(null, { parentId: parentId ? parentId : vaultId })).object);
  }

  /**
   * The file will be moved to the trash. The file will be permanently deleted within 30 days.
   * To undo this action, call file.restore() within the 30-day period.
   * @param  {string} id file id
   * @returns Promise with the updated file
   */
  public async delete(id: string, vaultId?: string): Promise<File> {
    await this.service.setVaultContextFromNodeId(id, this.type, vaultId);
    this.service.setActionRef(this.type.toUpperCase() + "_DELETE");
    this.service.setFunction(functions.FILE_DELETE);
    return ((await this.service.nodeUpdate<File>()).object);
  }

  /**
   * Restores the file from the trash.
   * This action must be performed within 30 days of the file being moved to the trash to prevent permanent deletion.
   * @param  {string} id file id
   * @returns Promise with the updated file
   */
  public async restore(id: string, vaultId?: string): Promise<File> {
    await this.service.setVaultContextFromNodeId(id, this.type, vaultId);
    this.service.setActionRef(this.type.toUpperCase() + "_RESTORE");
    this.service.setFunction(functions.FILE_RESTORE);
    return ((await this.service.nodeUpdate<File>()).object);
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
        const file = await this.service.api.getNode<File>(id, objects.FILE);
        await this.service.setVaultContext(file.vaultId);
      }
      stream = await this.service.encrypter.decryptStream(file.fileData as ReadableStream, encryptedKey, streamChunkSize, iv);
    }

    if (options.responseType === 'arraybuffer') {
      return await StreamConverter.toArrayBuffer<Uint8Array>(stream as any);
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

  private async uploadInternal(
    file: FileLike,
    tags: Tags,
    options: FileUploadOptions = {}
  ): Promise<FileUploadResult> {
    const isPublic = options.public || this.service.isPublic;
    let encryptedKey: string;
    const { processedData, encryptionTags } = await this.service.processWriteRaw(await file.arrayBuffer(), { prefixCiphertextWithIv: true, encode: false });
    const resourceHash = await digestRaw(new Uint8Array(processedData));
    const fileSignatureTags = await this.getFileSignatureTags(resourceHash)
    const resource = await this.service.api.uploadFile(processedData, tags.concat(encryptionTags).concat(fileSignatureTags), options);
    const resourceUri = resource.resourceUri;
    resourceUri.push(`hash:${resourceHash}`);
    if (!isPublic) {
      encryptedKey = encryptionTags.find((tag) => tag.name === encTags.ENCRYPTED_KEY).value;
    }
    return {
      resourceUri: resourceUri,
      resourceHash: resourceHash,
      encryptedKey: encryptedKey,
    }
  }

  private async uploadChunked(
    file: FileLike,
    tags: Tags,
    options: FileUploadOptions
  ): Promise<FileUploadResult> {

    const isPublic = options.public || this.service.isPublic
    const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE_IN_BYTES;
    const chunkSizeWithNonceAndIv = isPublic ? chunkSize : chunkSize + AUTH_TAG_LENGTH_IN_BYTES + IV_LENGTH_IN_BYTES;
    const numberOfChunks = Math.ceil(file.size / chunkSize);
    const fileSize = isPublic ? file.size : file.size + numberOfChunks * (AUTH_TAG_LENGTH_IN_BYTES + IV_LENGTH_IN_BYTES);

    this.client = new ApiClient()
      .env(this.service.api.config)
      .public(this.service.isPublic)
      .tags(tags)
      .numberOfChunks(numberOfChunks)
      .totalBytes(fileSize)
      .progressHook(options.progressHook)
      .cancelHook(options.cancelHook)

    const digestObject = initDigest();

    // upload the first chunk
    const chunkedResource = await this.uploadChunk(file, chunkSize, 0, { digestObject, tags: tags });
    const resourceChunkSize = chunkedResource.resourceSize;
    const encryptedKey = chunkedResource.tags.find((tag) => tag.name === encTags.ENCRYPTED_KEY)?.value;

    // upload the chunks in parallel
    let sourceOffset = chunkSize;
    let targetOffset = resourceChunkSize;
    const chunksQ = new PQueue({ concurrency: CHUNKS_CONCURRENCY });
    const chunks = [];
    while (sourceOffset + chunkSize < file.size) {
      const localSourceOffset = sourceOffset;
      const localTargetOffset = targetOffset;
      chunks.push(
        () => this.uploadChunk(file, chunkSize, localSourceOffset, { digestObject, encryptedKey, targetOffset: localTargetOffset, location: chunkedResource.resourceLocation }),
      )
      sourceOffset += chunkSize;
      targetOffset += resourceChunkSize;
    }
    try {
      await chunksQ.addAll(chunks, { signal: options.cancelHook?.signal });
    } catch (error) {
      if (!(error instanceof AbortError) && !options.cancelHook?.signal?.aborted) {
        throw error;
      }
    }
    if (options.cancelHook?.signal?.aborted) {
      throw new AbortError();
    }

    // upload the last chunk
    const resourceHash = digestObject.getHash("B64")
    const fileSignatureTags = await this.getFileSignatureTags(resourceHash)
    const fileTags = tags.concat(fileSignatureTags);
    const resource = await this.uploadChunk(file, chunkSize, sourceOffset, { digestObject, encryptedKey, targetOffset, tags: fileTags, location: chunkedResource.resourceLocation });

    // polling loop
    if (!options.cloud) {
      const uri = chunkedResource.resourceLocation.split(":")[0];
      while (true) {
        await new Promise(resolve => setTimeout(resolve, UPLOADER_POLLING_RATE_IN_MILLISECONDS));
        const state = await this.service.api.getUploadState(uri);
        if (state && state.resourceUri) {
          resource.resourceUri = state.resourceUri;
          break;
        }
      }
    }

    return {
      resourceUri: resource.resourceUri,
      numberOfChunks: numberOfChunks,
      chunkSize: chunkSizeWithNonceAndIv,
      encryptedKey: encryptedKey,
      resourceHash: resourceHash,
    };
  }

  public async newVersion(file: FileLike, uploadResult?: FileUploadResult): Promise<File> {
    const version = new File({
      owner: await this.service.signer.getAddress(),
      createdAt: JSON.stringify(Date.now()),
      name: await this.service.processWriteString(file.name),
      type: file.type,
      size: file.size,
      // resourceUri: uploadResult.resourceUri,
      // numberOfChunks: uploadResult.numberOfChunks,
      // chunkSize: uploadResult.chunkSize
    });
    return version;
  }

  private async uploadChunk(
    file: FileLike,
    chunkSize: number = DEFAULT_CHUNK_SIZE_IN_BYTES,
    offset: number = 0,
    options: { digestObject?: any, encryptedKey?: string, location?: string, tags?: Tags, targetOffset?: number } = {}) {
    const chunk = file.slice(offset, offset + chunkSize);
    const arrayBuffer = await chunk.arrayBuffer();
    const data = await this.service.processWriteRaw(arrayBuffer, { encryptedKey: options.encryptedKey, prefixCiphertextWithIv: true, encode: false });
    if (options.digestObject) {
      options.digestObject.update(new Uint8Array(data.processedData));
    }

    const loadedBytes = options.targetOffset ?? offset;
    const client = this.client
      .clone()
      .data(data.processedData)
      .loadedBytes(loadedBytes);

    if (options.location) {
      client.resourceId(options.location);
    }

    if (options.tags && options.tags.length > 0) {
      client.tags([...options.tags, ...data.encryptionTags]);
    }

    const res = await client.uploadFile();
    return { ...res, tags: data.encryptionTags };
  }

  getFileTags(file: FileLike, options: FileUploadOptions = {}): Tags {
    const tags = [] as Tags;
    if (this.service.isPublic) {
      tags.push(new Tag(fileTags.FILE_NAME, file.name))
      if (file.lastModified) {
        tags.push(new Tag(fileTags.FILE_MODIFIED_AT, file.lastModified.toString()));
      }
    }
    tags.push(new Tag(fileTags.FILE_SIZE, file.size));
    tags.push(new Tag(fileTags.FILE_TYPE, file.type || DEFAULT_FILE_TYPE));
    if (options.chunkSize) {
      tags.push(new Tag(fileTags.FILE_CHUNK_SIZE, options.chunkSize));
    }
    tags.push(new Tag("Content-Type", this.contentType || file.type || DEFAULT_FILE_TYPE));
    tags.push(new Tag(protocolTags.TIMESTAMP, JSON.stringify(Date.now())));
    tags.push(new Tag(dataTags.DATA_TYPE, "File"));
    tags.push(new Tag(protocolTags.VAULT_ID, this.service.vaultId));
    if (this.service.parentId) {
      tags.push(new Tag(protocolTags.PARENT_ID, this.service.parentId));
    }

    if (this.service.userAgent) {
      tags.push(new Tag("User-Agent", this.service.userAgent));
    }

    options.txTags?.map((tag: Tag) => tags.push(tag));
    return tags;
  }

  private async getFileSignatureTags(resourceHash: string): Promise<Tags> {
    const signature = await this.service.signer.sign(resourceHash);
    return [
      new Tag(protocolTags.SIGNER_ADDRESS, await this.service.signer.getAddress()),
      new Tag(protocolTags.SIGNATURE, signature),
      new Tag(fileTags.FILE_HASH, resourceHash)
    ];
  }
};

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
  txTags?: Tags,
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
