import { StreamConverter } from "../../util/stream-converter";
import { File } from "../../types";
import { FileModule } from "../file";
import { logger } from "../../logger";
import { GetOptions } from "../../types/query-options";
import { ServiceConfig } from "../service/service";
import { exportKeyToBase64 } from "../../crypto/lib";

export const PROXY_DOWNLOAD_URL = "/api/proxy/download";

class WebFileModule extends FileModule {
  private sessionFile: File;

  constructor(config?: ServiceConfig) {
    super(config);
  }

  public async previewUrl(
    id: string,
    options: FileDownloadOptions = {},
  ): Promise<string> {
    if (this.hasServiceWorkerInstalled()) {
      return this.webWorkerStreamUrl(id, options);
    } else {
      const fileMetadata = await this.get(id);
      if (!fileMetadata.encryptedAesKey) {
        return this.cdnPreviewUrl(id);
      }
      logger.warn(
        "No decryption web worker found, downloading file into memory buffer.",
      );
      return this.inMemoryBufferUrl(id);
    }
  }

  public async download(
    id: string,
    options: FileDownloadOptions = {},
  ): Promise<void> {
    const url = await this.previewUrl(id, options);
    this.saveAs(url);
  }

  public async get(
    id: string,
    options: GetOptions = this.defaultGetOptions,
  ): Promise<File> {
    if (this.sessionFile && this.sessionFile.id === id) {
      return this.sessionFile;
    }
    const file = await super.get(id, options);
    this.sessionFile = file;
    return file;
  }

  private saveAs(url: string) {
    const a = document.createElement("a");
    a.href = url;
    if (!this.hasServiceWorkerInstalled() && this.sessionFile) {
      a.download = this.sessionFile.name;
    }
    document.body.appendChild(a);
    a.click();
  }

  private cdnPreviewUrl(id: string): string {
    return `${this.service.api.config.cdnUrl}/${id}`;
  }

  private async inMemoryBufferUrl(id: string): Promise<string> {
    const { stream, headers } = await this.streamWithHeaders(id);
    const buffer = await StreamConverter.toArrayBuffer(stream);
    const blob = new Blob([buffer], { type: headers.get("Content-Type") });
    const url = window.URL.createObjectURL(blob);
    return url;
  }

  private async webWorkerStreamUrl(
    id: string,
    options: FileDownloadOptions = {},
  ): Promise<string> {
    const fileMetadata = await this.get(id);
    const proxyUrl = `${PROXY_DOWNLOAD_URL}/${id}`;

    const aesKey = await this.aesKey(fileMetadata);

    const workerMessage = {
      type: "init",
      chunkSize: fileMetadata.chunkSize,
      size: fileMetadata.size,
      id: id,
      url: this.cdnPreviewUrl(id),
      key: aesKey ? await exportKeyToBase64(aesKey) : null,
      name: fileMetadata.name,
    } as Record<string, any>;

    navigator.serviceWorker.controller.postMessage(workerMessage);

    if (options.cancel) {
      options.cancel.signal.onabort = () => {
        navigator.serviceWorker.controller.postMessage({
          type: "cancel",
          id: id,
        });
      };
    }

    const interval = setInterval(() => {
      const channel = new MessageChannel();

      channel.port2.onmessage = (event) => {
        if (event.data.type === "progress") {
          const bytesProgress = event.data.progress;
          const percentageProgress = Math.min(
            100,
            Math.ceil((bytesProgress / fileMetadata.size) * 100),
          );
          if (options.onProgress) {
            options.onProgress(percentageProgress, bytesProgress);
          }
          if (percentageProgress === 100) {
            clearInterval(interval);
          }
        } else if (event.data.error && event.data.error !== "cancelled") {
          throw new Error(event.data.error);
        }
      };

      navigator.serviceWorker.controller.postMessage(
        {
          type: "progress",
          id: id,
        },
        [channel.port1],
      );
    }, 250);

    return proxyUrl;
  }

  private hasServiceWorkerInstalled(): boolean {
    return !!navigator.serviceWorker?.controller;
  }
}

export type FileDownloadOptions = {
  cancel?: AbortController;
  onProgress?: (percentageProgress: number, bytesProgress: number) => void;
};

export { WebFileModule as FileModule };
