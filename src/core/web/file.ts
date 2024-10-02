import { StreamConverter } from "../../util/stream-converter";
import { File } from "../../types";
import { FileModule } from "../file";
import { logger } from "../../logger";
import { GetOptions } from "../../types/query-options";
import { ServiceConfig } from "../service/service";

export const PROXY_DOWNLOAD_URL = '/api/proxy/download'

class WebFileModule extends FileModule {
    
    private sessionFile: File;
    private decryptionWorker: Worker;

    constructor(config?: ServiceConfig) {
        super(config);
        this.registerDecryptionWorker();
    }

    public async previewUrl(id: string, options: FileDownloadOptions): Promise<string> {
        const fileMetadata = await this.get(id);
        if (fileMetadata.__public__) {
            return this.cdnPreviewUrl(id);
        } else {
            if (this.hasDecryptionWebWorker()) {
                return this.webWorkerStreamUrl(id, options);
            } else {
                logger.warn("No decryption web worker found, downloading file into memory buffer.");
                return this.inMemoryBufferUrl(id);
            }
        }
    }

    public async download(id: string, options: FileDownloadOptions): Promise<void> {
        const fileMetadata = await this.get(id);
        const url = await this.previewUrl(id, options);
        this.saveAs(url, fileMetadata.filename);
    }

    public async get(id: string, options: GetOptions = this.defaultGetOptions): Promise<File> {
        if (this.sessionFile && this.sessionFile.id === id) {
            return this.sessionFile;
        }
        const file = await super.get(id, options);
        this.sessionFile = file;
        return file;
    }

    private registerDecryptionWorker() {
        if (typeof window !== 'undefined' && 'Worker' in window) {
            try {
                //@ts-ignore: tsconfig is defaulting to node. This file is only bundled for the browser.
                this.decryptionWorker = new Worker(new URL('./worker.js', import.meta.url));
            } catch (error) {
                console.warn('Failed to create Web Worker:', error);
            }
        } else {
            this.decryptionWorker = null;
        }
    }

    private saveAs(url: string, filename: string) {
        const a = document.createElement("a");
        a.download = filename;
        a.href = url
        a.click();
    }

    private cdnPreviewUrl(id: string): string {
        return `${this.service.api.config.cdnUrl}/${id}`;
    }

    private async inMemoryBufferUrl(id: string): Promise<string> {
        const fileMetadata = await this.get(id);
        const stream = await this.stream(id);
        const buffer = await StreamConverter.toArrayBuffer(stream)
        const blob = new Blob([buffer], { type: fileMetadata.mimeType });
        const url = window.URL.createObjectURL(blob);
        return url;
    }

    private async webWorkerStreamUrl(id: string, options: FileDownloadOptions): Promise<string> {
        const fileMetadata = await this.get(id);
        const proxyUrl = `${PROXY_DOWNLOAD_URL}/${id}`

        const aesKey = await this.aesKey(id);

        const workerMessage = {
            type: 'init',
            chunkSize: fileMetadata.chunkSize,
            size: fileMetadata.size,
            id: id,
            url: this.cdnPreviewUrl(id),
            key: aesKey,
            name: fileMetadata.name,
          } as Record<string, any>;

        this.decryptionWorker.postMessage(workerMessage);

        if (options.cancel) {
            options.cancel.signal.onabort = () => {
                navigator.serviceWorker.controller.postMessage({
                    type: 'cancel',
                    id: id
                });
            };
        }
    
        const interval = setInterval(() => {
        const channel = new MessageChannel();

        channel.port2.onmessage = (event) => {
            if (event.data.type === 'progress') {
                const progress = Math.min(100, Math.ceil(event.data.progress / fileMetadata.size * 100));
                if (options.onProgress) {
                    options.onProgress(progress);
                }
                if (event.data.progress === fileMetadata.size) {
                    clearInterval(interval);
                }
            } else {
                throw new Error(event.data);
            }
        };

        this.decryptionWorker.postMessage({
            type: 'progress',
            id: id
        }, [channel.port1]);
        }, 100);

        return proxyUrl;
    }

    private hasDecryptionWebWorker(): boolean {
        return !!this.decryptionWorker && !!navigator.serviceWorker?.controller
    }
}

export type FileDownloadOptions = {
    cancel?: AbortController;
    onProgress?: (progress: number) => void;
}
  
export { WebFileModule as FileModule };
