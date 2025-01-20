import { FileSource, fileSourceToTusFile } from "@env/types/file";
import { status } from "../constants";
import { ApiClient } from "../api/api-client";
import { BadRequest } from "../errors/bad-request";
import { StreamConverter } from "../util/stream-converter";
import { File, FileDownloadOptions, FileUploadOptions } from "../types";
import {
  GetOptions,
  ListOptions,
  validateListPaginatedApiOptions,
} from "../types/query-options";
import { Paginated } from "../types/paginated";
import { paginate, processListItems } from "./common";
import { ReadableStream } from "web-streams-polyfill/ponyfill/es2018";
import { FileService } from "./service/file";
import { ServiceConfig } from "./service/service";
import {
  AUTH_TAG_LENGTH_IN_BYTES,
  decryptStream,
  IV_LENGTH_IN_BYTES,
} from "../crypto/lib";
import * as tus from "tus-js-client";
import { Auth } from "../auth";
import { IncorrectEncryptionKey } from "../errors/incorrect-encryption-key";
import { EncryptableHttpStack } from "../crypto/tus/http-stack";
import { onUpdateFile } from "@akord/carmella-gql/dist/types/subscriptions";
import { Subscription } from "rxjs";
import { VaultEncryption } from "../crypto/vault-encryption";
import { FolderModule } from "./folder";
import { uniqueId } from "lodash";

export const DEFAULT_FILE_TYPE = "text/plain";
export const DEFAULT_FILE_NAME = "unnamed";

export const BYTES_IN_MB = 1000000;
export const CHUNK_SIZE_IN_BYTES = 5 * BYTES_IN_MB;
export const ENCRYPTED_CHUNK_SIZE_IN_BYTES =
  CHUNK_SIZE_IN_BYTES + AUTH_TAG_LENGTH_IN_BYTES + IV_LENGTH_IN_BYTES;

export const UPLOADER_SERVER_MAX_CONNECTIONS_PER_CLIENT = 20;
export const EMPTY_FILE_ERROR_MESSAGE = "Cannot upload an empty file";

export const UPLOAD_COOKIE_SESSION_NAME = "tusky.upload.session.id";

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

  protected auth: Auth;

  protected folderIdMap: Record<string, string>;

  constructor(config?: ServiceConfig) {
    this.service = new FileService(config);
    this.auth = config.auth;
  }

  /**
   * Generate preconfigured Tus uploader
   * @param  {string} vaultId
   * @param  {FileSource} file
   *    Nodejs: Buffer | Readable | string (path) | ArrayBuffer | Uint8Array
   *    Browser: File | Blob | Uint8Array | ArrayBuffer
   * @param  {FileUploadOptions} options parent id, file name file mime type, etc
   * @returns {Promise<Promise<tus.Upload>>} Promise with tus.Upload instance
   *
   * @example
   * // use in Browser with Uppy upload
   *
   * const uploader = tusky.zip.uploader(vaultId);
   *
   * const uppy = new Uppy({
   *    restrictions: {
   *      allowedFileTypes: ['.zip', 'application/zip', 'application/x-zip-compressed'],
   *      maxFileSize: 1000000000,
   *    },
   *    autoProceed: false
   *  })
   *  .use(Tus, uploader.options);
   *
   * uppy.addFile(file);
   * uppy.upload();
   *
   * @example
   * // use in Nodejs
   *
   * const uploader = tusky.zip.uploader(vaultId, file, {
   *    onSuccess: () => {
   *      console.log('Upload complete');
   *    },
   *    onError: (error) => {
   *      console.log('Upload error', error);
   *    },
   *    onProgress: (progress) => {
   *      console.log('Upload progress', progress);
   *    }
   * });
   *
   * uploader.start();
   *
   */
  public async uploader(
    vaultId: string,
    file: FileSource | any = null,
    options: FileUploadOptions = {},
  ): Promise<tus.Upload> {
    const vault = await this.service.api.getVault(vaultId);

    let fileLike = null;
    if (file) {
      fileLike = await fileSourceToTusFile(file);

      if (fileLike.size === 0) {
        throw new BadRequest(EMPTY_FILE_ERROR_MESSAGE);
      }
    }
    let uploadId = null;

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
        ...((await this.auth.getAuthorizationHeader()) as Record<
          string,
          string
        >),
      },
      httpStack: new EncryptableHttpStack(
        new tus.DefaultHttpStack({}),
        vault,
        this.service.encrypter,
      ),
      removeFingerprintOnSuccess: true,
      onBeforeRequest: async (req: tus.HttpRequest) => {
        if (req.getMethod() === "POST" || req.getMethod() === "PATCH") {
          const xhr = req.getUnderlyingObject();
          if (xhr) {
            xhr.withCredentials = true;
          } else if (uploadId) {
            req.setHeader(
              "Cookie",
              `${UPLOAD_COOKIE_SESSION_NAME}=${uploadId}`,
            );
          }
        }
      },
      onAfterResponse: (req, res) => {
        if (res.getHeader("Location")) {
          uploadId = res.getHeader("Location").split("/").pop();
        }
      },
      onError: options.onError,
      onProgress: options.onProgress,
      onSuccess: options.onSuccess,
    });
    return upload;
  }

  /**
   * Upload file
   * @param  {string} vaultId
   * @param  {FileSource} file
   *    Nodejs: Buffer | Readable | string (path) | ArrayBuffer | Uint8Array
   *    Browser: File | Blob | Uint8Array | ArrayBuffer
   * @param  {FileUploadOptions} options parent id, file name file mime type, etc.
   * @returns {Promise<string>} Promise with upload id
   */
  public async upload(
    vaultId: string,
    file: FileSource,
    options: FileUploadOptions = {},
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
    const uploadId = upload.url.split("/").pop();
    return uploadId;
  }

  /**
   * @param {string} id
   * @returns {Promise<File>}
   */
  public async get(
    id: string,
    options: GetOptions = this.defaultGetOptions,
  ): Promise<File> {
    const getOptions = {
      ...this.defaultGetOptions,
      ...options,
    };
    const nodeProto = await this.service.api.getFile(id);
    return this.service.processFile(nodeProto, getOptions.shouldDecrypt);
  }

  /**
   * @param  {ListOptions} options
   * @returns {Promise<Paginated<File>>} Promise with paginated user files
   */
  public async list(
    options: ListOptions = (this.defaultListOptions = this.defaultListOptions),
  ): Promise<Paginated<File>> {
    validateListPaginatedApiOptions(options);

    const listOptions = {
      ...this.defaultListOptions,
      ...options,
    };
    const response = await this.service.api.getFiles(listOptions);
    const items = [];
    const errors = [];
    const processItem = async (nodeProto: any) => {
      try {
        const node = await this.service.processFile(
          nodeProto,
          listOptions.shouldDecrypt,
        );
        items.push(node);
      } catch (error) {
        errors.push({ id: nodeProto.id, error });
      }
    };
    await processListItems(response.items, processItem);
    return {
      items,
      nextToken: response.nextToken,
      errors,
    };
  }

  /**
   * @param  {ListOptions} options
   * @returns {Promise<Array<File>>} Promise with all user files
   */
  public async listAll(
    options: ListOptions = this.defaultListOptions,
  ): Promise<Array<File>> {
    const list = async (options: ListOptions) => {
      return this.list(options);
    };
    return paginate<File>(list, options);
  }

  /**
   * @param  {string} id file id
   * @param  {string} name new name
   * @returns {Promise<File>}
   */
  public async rename(id: string, name: string): Promise<File> {
    await this.service.setVaultContextFromNodeId(id);
    await this.service.setName(name);
    const fileProto = await this.service.api.updateFile({
      id: id,
      name: this.service.name,
    });
    return this.service.processFile(fileProto, true);
  }

  /**
   * @param  {string} id
   * @param  {string} [parentId] new parent folder id, if no parent id provided will be moved to the vault root.
   * @returns {Promise<File>}
   */
  public async move(id: string, parentId?: string): Promise<File> {
    await this.service.setVaultContextFromNodeId(id);
    return this.service.api.updateFile({
      id: id,
      parentId: parentId ? parentId : this.service.vaultId,
    });
  }

  /**
   * The file will be moved to the trash. The file will be permanently deleted within 30 days.
   * To undo this action, call file.restore() within the 30-day period.
   * @param  {string} id file id
   * @returns {Promise<File>}
   */
  public async delete(id: string): Promise<File> {
    return this.service.api.updateFile({ id: id, status: status.DELETED });
  }

  /**
   * Restores the file from the trash.
   * This action must be performed within 30 days of the file being moved to the trash to prevent permanent deletion.
   * @param  {string} id file id
   * @returns {Promise<File>}
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
    const file = await this.service.api.downloadFile(id, {
      responseType: "stream",
      encrypted: true,
    });
    // TODO: send encryption context directly with the file data
    const fileMetadata = new File(await this.service.api.getFile(id));
    this.service.setEncrypted(fileMetadata.__encrypted__);

    let stream: ReadableStream<Uint8Array>;
    if (!this.service.encrypted) {
      stream = file as ReadableStream<Uint8Array>;
    } else {
      const aesKey = await this.aesKey(id);
      stream = await decryptStream(
        file as ReadableStream,
        aesKey,
        fileMetadata.chunkSize,
      );
    }
    return stream;
  }

  public async arrayBuffer(id: string): Promise<ArrayBuffer> {
    const stream = await this.stream(id);
    return StreamConverter.toArrayBuffer<Uint8Array>(stream as any);
  }

  /**
   * Subscribe to file create/update events.
   * @param  {string} vaultId
   * @param  {(file: File) => Promise<void>} onSuccess
   * @param  {(error: Error) => void} onError
   * @returns {Subscription}
   * @example
   * // To unsubscribe:
   * const subscription = await tusky.file.subscribe(vaultId, onSuccess, onError);
   * subscription.unsubscribe();
   */
  public async subscribe(
    vaultId: string,
    onSuccess: (file: File) => Promise<void>,
    onError: (error: Error) => void,
  ): Promise<Subscription> {
    await this.service.setVaultContext(vaultId);
    const keys = this.service.keys;
    const encrypter = this.service.encrypter;
    const isEncrypted = this.service.encrypted;
    return this.service.pubsub.client
      .graphql({
        query: onUpdateFile,
        variables: {
          filter: {
            vaultId: { eq: vaultId },
          },
        },
      })
      .subscribe({
        next: async ({ data }) => {
          const fileProto = data.onUpdateFile;
          if (fileProto && onSuccess) {
            const file = new File(fileProto, keys);
            if (isEncrypted) {
              await file.decrypt(encrypter);
            }
            await onSuccess(file);
          }
        },
        error: (e: Error) => {
          if (onError) {
            onError(e);
          }
        },
      });
  }

  protected async aesKey(id: string): Promise<CryptoKey | null> {
    const fileMetadata = await this.get(id);
    if (!fileMetadata.encryptedAesKey) {
      return null;
    }
    if (!fileMetadata.encryptedAesKey) {
      throw new IncorrectEncryptionKey(
        new Error("Missing file encryption context."),
      );
    }

    const vaultEncryption = new VaultEncryption({
      vaultKeys: fileMetadata.__keys__,
      userEncrypter: this.service.encrypter,
    });
    const aesKey = await vaultEncryption.decryptAesKey(
      fileMetadata.encryptedAesKey,
    );
    return aesKey;
  }
}

export type FileUploadResult = {
  resourceUri: string[];
  resourceHash?: string;
  numberOfChunks?: number;
  chunkSize?: number;
  iv?: string[];
  encryptedKey?: string;
};

export type Hooks = {
  onProgress?: ((bytesSent: number, bytesTotal: number) => void) | null;
  onChunkComplete?:
    | ((chunkSize: number, bytesAccepted: number, bytesTotal: number) => void)
    | null;
  onSuccess?: (() => void) | null;
  onError?: ((error: Error | tus.DetailedError) => void) | null;
};

export type FileMetadataOptions = {
  name?: string;
  mimeType?: string;
  lastModified?: number;
};

export type FileLocationOptions = {
  parentId?: string;
};

export type FileGetOptions = FileDownloadOptions & {
  responseType?: "arraybuffer" | "stream";
};

export { FileModule };
