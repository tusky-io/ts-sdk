import { v4 as uuidv4 } from "uuid";
import PQueue, { AbortError } from "@esm2cjs/p-queue";
import { Service, ServiceConfig } from "../core";
import { FileSource, fileSourceToTusFile } from "../types/node/file";
import { EMPTY_FILE_ERROR_MESSAGE, FileModule, FileUploadOptions, Hooks } from "./file";
import { actions, objects } from "../constants";
import { ObjectType } from "../types/object";
import { BadRequest } from "../errors/bad-request";
import { File, Folder } from "../types";
import lodash from "lodash";
import { FileService } from "./service/file";
import { FolderService } from "./service/folder";

class BatchModule {

  public static BATCH_CONCURRENCY = 50;
  parentId: string;

  protected service: Service;

  protected overridedName: string;

  constructor(config?: ServiceConfig) {
    this.service = new Service(config);
  }

  // /**
  //  * @param  {{id:string,type:ObjectType}[]} items
  //  * @returns Promise with corresponding transaction ids
  //  */
  // public async delete<T>(items: { id: string, type: ObjectType }[])
  //   : Promise<{ transactionId: string, object: T }[]> {
  //   return this.batchUpdate<T>(items.map((item) => ({
  //     ...item,
  //     input: { function: item.type.toUpperCase() + "_DELETE" as any },
  //     actionRef: item.type.toUpperCase() + "_DELETE"
  //   })));
  // }

  // /**
  //  * @param  {{id:string,type:ObjectType}[]} items
  //  * @returns Promise with corresponding transaction ids
  //  */
  // public async restore<T>(items: { id: string, type: ObjectType }[])
  //   : Promise<{ transactionId: string, object: T }[]> {
  //   return this.batchUpdate<T>(items.map((item) => ({
  //     ...item,
  //     input: { function: item.type.toUpperCase() + "_RESTORE" as any },
  //     actionRef: item.type.toUpperCase() + "_RESTORE"
  //   })));
  // }

  // /**
  //  * @param  {{id:string,type:ObjectType}[]} items
  //  * @returns Promise with corresponding transaction ids
  //  */
  // public async move<T>(items: { id: string, type: ObjectType }[], parentId?: string)
  //   : Promise<{ transactionId: string, object: T }[]> {
  //   return this.batchUpdate<T>(items.map((item) => ({
  //     ...item,
  //     input: {
  //       function: item.type.toUpperCase() + "_MOVE" as any,
  //       parentId: parentId
  //     },
  //     actionRef: item.type.toUpperCase() + "_MOVE"
  //   })));
  // }

  /**
   * @param  {string} vaultId
   * @param  {{file:FileSource,options:FileUploadOptions}[]} items
   * @param  {BatchUploadOptions} [options]
   * @returns Promise with response data & errors arrays
   */
  public async batchUpload(
    vaultId: string,
    items: BatchUploadItem[],
    options: BatchUploadOptions = {}
  ): Promise<void> {
    // prepare items to upload
    // const uploadItems = await Promise.all(items.map(async (item: BatchUploadItem) => {
    //   const fileLike = await createFileLike(item.file, item.options || {});
    //   return {
    //     file: fileLike,
    //     options: item.options
    //   }
    // })) as UploadItem[];

    // // set service context
    // const vault = await this.service.api.getVault(vaultId);
    // this.service.setVault(vault);
    // this.service.setVaultId(vaultId);
    // this.service.setIsPublic(vault.public);
    // await this.service.setMembershipKeys(vault);
    // this.setGroupRef(items);

    // const { errors, data, cancelled } = await this.upload(uploadItems, options);
    // return { data, errors, cancelled };
  }

  /**
   * @param  {{file:FileLike,options:StackCreateOptions}[]} items
   * @param  {BatchUploadOptions} [options]
   * @returns Promise with item ids & their corresponding transaction ids
   */
  public async upload(
    items: UploadItem[],
    options: BatchUploadOptions = {}
  ): Promise<void> {
    // const data = [] as BatchUploadResponse["data"];
    // const errors = [] as BatchUploadResponse["errors"];

    // const [itemsToUpload, emptyFileItems] = lodash.partition(items, function (item: UploadItem) { return item.file?.size > 0 });

    // emptyFileItems.map((item: UploadItem) => {
    //   errors.push({ name: item.file?.name, message: EMPTY_FILE_ERROR_MESSAGE, error: new BadRequest(EMPTY_FILE_ERROR_MESSAGE) });
    // })

    // const batchSize = itemsToUpload.reduce((sum, item) => {
    //   return sum + item.file.size;
    // }, 0);
    // batchProgressCount(batchSize, options);

    // let itemsCreated = 0;
    // const uploadQ = new PQueue({ concurrency: BatchModule.BATCH_CONCURRENCY });
    // const postTxQ = new PQueue({ concurrency: BatchModule.BATCH_CONCURRENCY });

    // const uploadItem = async (item: UploadItem) => {

    //   const createOptions = {
    //     ...options,
    //     ...(item.options || {})
    //   } as BatchUploadOptions & FileUploadOptions;

    //   const name = createOptions.name ? createOptions.name : item.file.name;

    //   const service = new FileService(this.service);

    //   const nodeId = uuidv4();
    //   service.setObjectId(nodeId);

    //   service.setParentId(createOptions.parentId ? createOptions.parentId : service.vaultId);

    //   try {
    //     postTxQ.add(() => uploadFileTx(service, item, options, name), { signal: options.cancelHook?.signal })
    //   } catch (error) {
    //     if (!(error instanceof AbortError) && !options.cancelHook?.signal?.aborted) {
    //       errors.push({ name: name, message: error.toString(), error });
    //     }
    //   }
    // }

    // const uploadFileTx = async (service: FileService, item: UploadItem, options: BatchUploadOptions, name: string) => {
    //   try {
    //     const fileModule = new FileModule(service);
    //     const object = await fileModule.upload(service.vaultId, item.file, item.options);
    //     const file = await new FileService(service).processFile(object, !service.isPublic, service.keys as any);
    //     if (options.onFileCreated) {
    //       await options.onFileCreated(file);
    //     }
    //     data.push(file);
    //     itemsCreated += 1;
    //   } catch (error) {
    //     errors.push({ name: name, message: error.toString(), error });
    //   };
    // }

    // try {
    //   await uploadQ.addAll(itemsToUpload.map(item => () => uploadItem(item)), { signal: options.cancelHook?.signal });
    // } catch (error) {
    //   if (!(error instanceof AbortError) && !options.cancelHook?.signal?.aborted) {
    //     errors.push({ message: error.toString(), error });
    //   }
    // }
    // await postTxQ.onIdle();
    // if (options.cancelHook?.signal?.aborted) {
    //   return ({ data, errors, cancelled: items.length - itemsCreated });
    // }
    // return { data, errors, cancelled: 0 };
  }

  // private async batchUpdate<T>(items: { id: string, type: ObjectType, actionRef: string }[])
  //   : Promise<{ transactionId: string, object: T }[]> {
  //   this.setGroupRef(items);
  //   const result = [] as { transactionId: string, object: T }[];
  //   for (const [itemIndex, item] of items.entries()) {

  //     const node = item.type === objects.FOLDER
  //       ? await this.service.api.getFile(item.id)
  //       : await this.service.api.getFolder(item.id);

  //     if (itemIndex === 0 || this.service.vaultId !== node.vaultId) {
  //       this.service.setVaultId(node.vaultId);
  //       this.service.setIsPublic(node.__public__);
  //       await this.service.setMembershipKeys(node);
  //     }
  //     const service = item.type === objects.FOLDER
  //       ? new FolderService(this.service)
  //       : new FileService(this.service);

  //    // service.setAction(item.input.function);
  //     service.setObject(node);
  //     service.setObjectId(item.id);
  //     service.setType(item.type);
  //     const tx = await service.formatTransaction();
  //     const object = await this.service.api.postContractTransaction<T>(tx);
  //     const processedObject = item.type === objects.FOLDER
  //       ? await new FolderService().processFolder(object as any, !this.service.isPublic, this.service.keys)
  //       : await new FileService().processFile(object as any, !this.service.isPublic, this.service.keys) as any;
  //     result.push(processedObject);
  //   }
  //   return result;
  // }

  protected setGroupRef(items: any) {
    this.service.groupRef = items && items.length > 1 ? uuidv4() : null;
  }

  protected setParentId(parentId?: string) {
    this.parentId = parentId;
  }
}

// export const batchProgressCount = (batchSize: number, options: BatchUploadOptions) => {
//   let progress = 0;
//   let uploadedItemsCount = 0;
//   if (options.processingCountHook) {
//     options.processingCountHook(uploadedItemsCount);
//   }
//   const perFileProgress = new Map();
//   const uploadedFiles = new Set();
//   if (options.progressHook) {
//     const onProgress = options.progressHook
//     const itemProgressHook = (percentageProgress: number, binaryProgress: number, progressId: string) => {
//       progress += binaryProgress - (perFileProgress.get(progressId) || 0)
//       perFileProgress.set(progressId, binaryProgress);
//       onProgress(Math.min(100, Math.round(progress / batchSize * 100)));
//       if (percentageProgress === 100 && !uploadedFiles.has(progressId)) {
//         uploadedFiles.add(progressId);
//         uploadedItemsCount += 1;
//         if (options.processingCountHook) {
//           options.processingCountHook(uploadedItemsCount);
//         }
//       }
//     }
//     options.progressHook = itemProgressHook;
//   }
// }

export type BatchUploadItem = {
  file: FileSource,
  options?: FileUploadOptions
}

export type UploadItem = {
  file: FileSource,
  options?: FileUploadOptions
}

export type BatchUploadOptions = Hooks & {
  processingCountHook?: (count: number) => void,
  onFileCreated?: (item: File) => Promise<void>
};

export interface BatchUploadResponse {
  data: Array<File>
  errors: Array<{ name?: string, message: string, error: Error }>
  cancelled: number
}

export {
  BatchModule
}
