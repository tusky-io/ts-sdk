import { Service, ServiceConfig } from "./service/service";
import { FileLike, FileSource } from "../types/file";
import { BadRequest } from "../errors/bad-request";
import { ZipLog, ZipUploadOptions } from "../types/zip";
import {
  BYTES_IN_MB,
  CHUNKS_CONCURRENCY,
  DEFAULT_CHUNK_SIZE_IN_BYTES,
  FileOptions,
  MINIMAL_CHUNK_SIZE_IN_BYTES,
  createFileLike,
} from "./file";
import PQueue, { AbortError } from "@esm2cjs/p-queue";
import { ListPaginatedApiOptions } from "../types/query-options";
import { Paginated } from "../types/paginated";
import { paginate } from "./common";
import { PluginKey, Plugins } from "../plugin";
import { Logger } from "../logger";
import { Notification } from "../types/notification";
import { Wallet } from "@akord/crypto";
import { Api } from "../api/api";
import { Auth } from "@akord/akord-auth";

class ZipModule {
  protected service: Service;

  constructor(config?: ServiceConfig) {
    this.service = new Service(config);
  }

  private events = ["ZIP_DECOMPRESSED", "ZIP_SIGNED", "ZIP_COMMITTED"];

  public async list(
    options: ListPaginatedApiOptions = {}
  ): Promise<Paginated<ZipLog>> {
    return await this.service.api.getZipLogs(options);
  }

  /**
   * @param  {ListFileOptions} options
   * @returns Promise with list of all files per query options
   */
  public async listAll(
    options: ListPaginatedApiOptions = {}
  ): Promise<Array<ZipLog>> {
    const list = async (listOptions: ListPaginatedApiOptions) => {
      return await this.list(listOptions);
    };
    return await paginate<ZipLog>(list, options);
  }

  /**
   * @param  {string} vaultId
   * @param  {string} name folder name
   * @param  {ZipUploadOptions} [options] parent id, etc.
   */
  public async upload(
    vaultId: string,
    fileSource: FileSource,
    options: ZipUploadOptions = {}
  ): Promise<{ sourceId: string }> {
    await this.service.setVaultContext(vaultId);
    if (!this.service.vault.public) {
      throw new BadRequest("Zip upload is not supported for private vaults.");
    }
    const file = await createFileLike(fileSource, {
      name: "zip",
    } as FileOptions);
    if (options.chunkSize && options.chunkSize > file.size) {
      throw new BadRequest("Chunk size can not be larger than the file size");
    }
    const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE_IN_BYTES;
    if (chunkSize < MINIMAL_CHUNK_SIZE_IN_BYTES) {
      throw new BadRequest(
        "Chunk size can not be smaller than: " +
          MINIMAL_CHUNK_SIZE_IN_BYTES / BYTES_IN_MB
      );
    }

    if (file.size > chunkSize) {
      options.chunkSize = chunkSize;
      return await this.multipartUpload(file, vaultId, options);
    } else {
      return await this.simpleUpload(file, vaultId, options);
    }
  }

  public async subscribe(
    next: (notification: Notification) => void | Promise<void>,
    error?: (err: any) => void
  ): Promise<void> {
    if (!Plugins.registered.has(PluginKey.PUBSUB)) {
      Logger.warn(
        "PubSub plugins is unregistered. Please install @akord/akord-js-pubsub-plugin and include it in plugins list when initializing SDK"
      );
      return;
    }
    const address = await this.service.signer.getAddress();
    await Plugins.registered.get(PluginKey.PUBSUB).use({
      action: "subscribe",
      filter: {
        event: { in: this.events },
        toAddress: { eq: address },
      },
      next,
      error,
    });
  }

  public async unsubscribe(): Promise<void> {
    if (!Plugins.registered.has(PluginKey.PUBSUB)) {
      Logger.warn(
        "PubSub plugins is unregistered. Please install @akord/akord-js-pubsub-plugin and include it in plugins list when initializing SDK"
      );
      return;
    }
    const address = await this.service.signer.getAddress();
    await Plugins.registered.get(PluginKey.PUBSUB).use({
      action: "unsubscribe",
      filter: {
        event: { in: this.events },
        toAddress: { eq: address },
      },
    });
  }

  private async simpleUpload(
    file: FileLike,
    vaultId: string,
    options: ZipUploadOptions
  ): Promise<{ sourceId: string }> {
    const buffer = await file.arrayBuffer();
    return await this.service.api.uploadZip(buffer, vaultId, options);
  }

  private async multipartUpload(
    file: FileLike,
    vaultId: string,
    options: ZipUploadOptions
  ): Promise<{ sourceId: string }> {
    const { chunkSize, chunksConcurrency, ...initOptions } = options;
    const { multipartToken } = await this.service.api.uploadZip(null, vaultId, {
      ...initOptions,
      multipartInit: true,
    });
    let offset = 0;
    let partNumber = 1;
    const chunksQ = new PQueue({
      concurrency: options.chunksConcurrency || CHUNKS_CONCURRENCY,
    });
    const chunks = [];
    const apiOptions = {
      multipartToken: multipartToken,
      cancelHook: options.cancelHook,
      progressHook: options.progressHook,
    };
    while (offset < file.size) {
      const buffer = await file
        .slice(offset, offset + options.chunkSize)
        .arrayBuffer();
      const currentPart = partNumber;
      chunks.push(() =>
        this.service.api.uploadZip(buffer, vaultId, {
          ...apiOptions,
          ...initOptions,
          partNumber: currentPart,
          multipartToken: multipartToken,
        })
      );
      offset += options.chunkSize;
      partNumber += 1;
    }
    try {
      await chunksQ.addAll(chunks, {
        signal: options.cancelHook?.signal,
      });
    } catch (error) {
      if (
        !(error instanceof AbortError) &&
        !options.cancelHook?.signal?.aborted
      ) {
        throw error;
      }
    }
    if (options.cancelHook?.signal?.aborted) {
      throw new AbortError();
    }
    const { sourceId } = await this.service.api.uploadZip(null, vaultId, {
      multipartToken: multipartToken,
      multipartComplete: true,
      ...initOptions,
    });
    return { sourceId };
  }
}

export { ZipModule };
