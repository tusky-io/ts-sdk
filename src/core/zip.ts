import { FileSource, fileSourceToTusFile } from "@env/types/file";
import { BadRequest } from "../errors/bad-request";
import { Service, ServiceConfig } from './service/service';
import * as tus from 'tus-js-client'
import { Auth } from "../auth";
import { CHUNK_SIZE_IN_BYTES, EMPTY_FILE_ERROR_MESSAGE } from "./file";
import { ZipUploadOptions } from "types/zip";

class ZipModule {

  protected service: Service;

  constructor(config?: ServiceConfig) {
    this.service = new Service(config);
  }

  /**
   * Generate preconfigured Tus uploader
   * @param  {string} vaultId
   * @param  {FileSource} file 
   *    Nodejs: Buffer | Readable | string (path) | ArrayBuffer | Uint8Array
   *    Browser: File | Blob | Uint8Array | ArrayBuffer
   * @param  {ZipUploadOptions} options parent id
   * @returns Promise with upload id
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
   * 
   */
  public async uploader(
    vaultId: string,
    file: FileSource = null,
    options: ZipUploadOptions = {}
  ): Promise<tus.Upload> {
    const vault = await this.service.api.getVault(vaultId);
    if (!vault.public) {
      throw new BadRequest("Zip upload is not supported for encrypted vaults");
    }
    let fileLike = null;
    if (file) {
      fileLike = await fileSourceToTusFile(file);

      if (fileLike.size === 0) {
        throw new BadRequest(EMPTY_FILE_ERROR_MESSAGE);
      }
    }

    const upload = new tus.Upload(fileLike as any, {
      endpoint: `${this.service.api.config.apiUrl}/zips`,
      retryDelays: [0, 500, 2000, 5000],
      metadata: {
        vaultId: vaultId,
        parentId: options?.parentId || vaultId,
        filetype: "application/zip",
      },
      uploadDataDuringCreation: true,
      parallelUploads: 1, // tus-nodejs-server does not support parallel uploads yet
      chunkSize: CHUNK_SIZE_IN_BYTES,
      headers: {
        ...(await Auth.getAuthorizationHeader() as Record<string, string>),
      },
      removeFingerprintOnSuccess: true,
      onError: options.onError,
      onProgress: options.onProgress,
      onSuccess: options.onSuccess,
    })
    return upload;
  }

  /**
   * Upload zip & unpack on server
   * @param  {string} vaultId
   * @param  {FileSource} file 
   *    Nodejs: Buffer | Readable | string (path) | ArrayBuffer | Uint8Array
   *    Browser: File | Blob | Uint8Array | ArrayBuffer
   * @param  {ZipUploadOptions} options parent id
   * @returns Promise with upload id
   */
  public async upload(
    vaultId: string,
    file: FileSource,
    options: ZipUploadOptions = {}
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
}

export {
  ZipModule
}
