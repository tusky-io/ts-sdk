import { v4 as uuidv4 } from "uuid";
import PQueue, { AbortError } from "@esm2cjs/p-queue";
import { Service, ServiceConfig } from "../core";
import { NodeService } from "./service/node";
import { FileLike, FileSource, createFileLike } from "../types/file";
import { Membership } from "../types/membership";
import { EMPTY_FILE_ERROR_MESSAGE, FileModule, FileUploadOptions, Hooks } from "./file";
import { actions, functions, objects } from "../constants";
import { ContractInput, Tags } from "../types/contract";
import { ObjectType } from "../types/object";
import { BadRequest } from "../errors/bad-request";
import { File, Folder } from "../types";
import lodash from "lodash";
import { MembershipService } from "./service/membership";

class BatchModule {

  public static BATCH_CONCURRENCY = 50;
  parentId: string;

  protected service: Service;

  protected overridedName: string;

  constructor(config?: ServiceConfig) {
    this.service = new Service(config);
  }

  /**
   * @param  {{id:string,type:ObjectType}[]} items
   * @returns Promise with corresponding transaction ids
   */
  public async delete<T>(items: { id: string, type: ObjectType }[])
    : Promise<{ transactionId: string, object: T }[]> {
    return this.batchUpdate<T>(items.map((item) => ({
      ...item,
      input: { function: item.type.toUpperCase() + "_DELETE" as any },
      actionRef: item.type.toUpperCase() + "_DELETE"
    })));
  }

  /**
   * @param  {{id:string,type:ObjectType}[]} items
   * @returns Promise with corresponding transaction ids
   */
  public async restore<T>(items: { id: string, type: ObjectType }[])
    : Promise<{ transactionId: string, object: T }[]> {
    return this.batchUpdate<T>(items.map((item) => ({
      ...item,
      input: { function: item.type.toUpperCase() + "_RESTORE" as any },
      actionRef: item.type.toUpperCase() + "_RESTORE"
    })));
  }

  /**
   * @param  {{id:string,type:ObjectType}[]} items
   * @returns Promise with corresponding transaction ids
   */
  public async move<T>(items: { id: string, type: ObjectType }[], parentId?: string)
    : Promise<{ transactionId: string, object: T }[]> {
    return this.batchUpdate<T>(items.map((item) => ({
      ...item,
      input: {
        function: item.type.toUpperCase() + "_MOVE" as any,
        parentId: parentId
      },
      actionRef: item.type.toUpperCase() + "_MOVE"
    })));
  }

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
  ): Promise<BatchUploadResponse> {
    // prepare items to upload
    const uploadItems = await Promise.all(items.map(async (item: BatchUploadItem) => {
      const fileLike = await createFileLike(item.file, item.options || {});
      return {
        file: fileLike,
        options: item.options
      }
    })) as UploadItem[];

    // set service context
    const vault = await this.service.api.getVault(vaultId);
    this.service.setVault(vault);
    this.service.setVaultId(vaultId);
    this.service.setIsPublic(vault.public);
    await this.service.setMembershipKeys(vault);
    this.setGroupRef(items);
    this.service.setActionRef(actions.FILE_CREATE);
    this.service.setFunction(functions.FILE_CREATE);

    const mergedOptions = {
      ...options,
      cloud: this.service.isCloud(),
    }

    const { errors, data, cancelled } = await this.upload(uploadItems, mergedOptions);
    return { data, errors, cancelled };
  }

  /**
   * @param  {{file:FileLike,options:StackCreateOptions}[]} items
   * @param  {BatchUploadOptions} [options]
   * @returns Promise with item ids & their corresponding transaction ids
   */
  public async upload(
    items: UploadItem[],
    options: BatchUploadOptions = {}
  ): Promise<BatchUploadResponse> {
    const data = [] as BatchUploadResponse["data"];
    const errors = [] as BatchUploadResponse["errors"];

    const [itemsToUpload, emptyFileItems] = lodash.partition(items, function (item: UploadItem) { return item.file?.size > 0 });

    emptyFileItems.map((item: UploadItem) => {
      errors.push({ name: item.file?.name, message: EMPTY_FILE_ERROR_MESSAGE, error: new BadRequest(EMPTY_FILE_ERROR_MESSAGE) });
    })

    const batchSize = itemsToUpload.reduce((sum, item) => {
      return sum + item.file.size;
    }, 0);
    batchProgressCount(batchSize, options);

    let itemsCreated = 0;
    const uploadQ = new PQueue({ concurrency: BatchModule.BATCH_CONCURRENCY });
    const postTxQ = new PQueue({ concurrency: BatchModule.BATCH_CONCURRENCY });

    const uploadItem = async (item: UploadItem) => {

      const createOptions = {
        ...options,
        ...(item.options || {})
      } as BatchUploadOptions & FileUploadOptions;

      const name = createOptions.name ? createOptions.name : item.file.name;

      const service = new NodeService<File>({ ...this.service, type: objects.FILE, nodeType: File });


      const nodeId = uuidv4();
      service.setObjectId(nodeId);

      service.setAkordTags(service.isPublic ? [name] : []);
      service.setParentId(createOptions.parentId ? createOptions.parentId : service.vaultId);
      service.txTags = await service.getTxTags();

      try {
        postTxQ.add(() => uploadFileTx(service as NodeService<File>, item, options, name), { signal: options.cancelHook?.signal })
      } catch (error) {
        if (!(error instanceof AbortError) && !options.cancelHook?.signal?.aborted) {
          errors.push({ name: name, message: error.toString(), error });
        }
      }
    }

    const uploadFileTx = async (service: NodeService<File>, item: UploadItem, options: BatchUploadOptions, name: string) => {
      try {
        const input = {
          function: service.function,
          parentId: item.options?.parentId
        };
        const fileService = new FileModule(service);
        const version = await fileService.newVersion(item.file);
        const tags = fileService.getFileTags(item.file, item.options);
        const { object } = await service.api.postContractTransaction<File>(
          service.vaultId,
          input,
          tags.concat(service.txTags),
          version,
          item.file
        );
        const file = await new NodeService<File>({ ...service, type: objects.FILE, nodeType: File })
          .processNode(object, !service.isPublic, service.keys);
        if (options.onFileCreated) {
          await options.onFileCreated(file);
        }
        data.push(file);
        itemsCreated += 1;
      } catch (error) {
        errors.push({ name: name, message: error.toString(), error });
      };
    }

    try {
      await uploadQ.addAll(itemsToUpload.map(item => () => uploadItem(item)), { signal: options.cancelHook?.signal });
    } catch (error) {
      if (!(error instanceof AbortError) && !options.cancelHook?.signal?.aborted) {
        errors.push({ message: error.toString(), error });
      }
    }
    await postTxQ.onIdle();
    if (options.cancelHook?.signal?.aborted) {
      return ({ data, errors, cancelled: items.length - itemsCreated });
    }
    return { data, errors, cancelled: 0 };
  }

  private async batchUpdate<T>(items: { id: string, type: ObjectType, input: ContractInput, actionRef: string }[])
    : Promise<{ transactionId: string, object: T }[]> {
    this.setGroupRef(items);
    const result = [] as { transactionId: string, object: T }[];
    for (const [itemIndex, item] of items.entries()) {
      const node = item.type === objects.MEMBERSHIP
        ? await this.service.api.getMembership(item.id)
        : await this.service.api.getNode<File | Folder>(item.id, item.type);

      if (itemIndex === 0 || this.service.vaultId !== node.vaultId) {
        this.service.setVaultId(node.vaultId);
        this.service.setIsPublic(node.__public__);
        await this.service.setMembershipKeys(node);
      }
      const service = item.type === objects.MEMBERSHIP
        ? new MembershipService(this.service)
        : new NodeService<T>(<any>this.service);

      service.setFunction(item.input.function);
      service.setActionRef(item.actionRef);
      service.setObject(node);
      service.setObjectId(item.id);
      service.setType(item.type);
      service.txTags = await service.getTxTags();
      const object = await this.service.api.postContractTransaction<T>(service.vaultId, item.input, service.txTags);
      const processedObject = item.type === objects.MEMBERSHIP
        ? new Membership(object)
        : await (<NodeService<T>>service).processNode(object as any, !this.service.isPublic, this.service.keys) as any;
      result.push(processedObject);
    }
    return result;
  }

  protected setGroupRef(items: any) {
    this.service.groupRef = items && items.length > 1 ? uuidv4() : null;
  }

  protected setParentId(parentId?: string) {
    this.parentId = parentId;
  }
}

export const batchProgressCount = (batchSize: number, options: BatchUploadOptions) => {
  let progress = 0;
  let uploadedItemsCount = 0;
  if (options.processingCountHook) {
    options.processingCountHook(uploadedItemsCount);
  }
  const perFileProgress = new Map();
  const uploadedFiles = new Set();
  if (options.progressHook) {
    const onProgress = options.progressHook
    const itemProgressHook = (percentageProgress: number, binaryProgress: number, progressId: string) => {
      progress += binaryProgress - (perFileProgress.get(progressId) || 0)
      perFileProgress.set(progressId, binaryProgress);
      onProgress(Math.min(100, Math.round(progress / batchSize * 100)));
      if (percentageProgress === 100 && !uploadedFiles.has(progressId)) {
        uploadedFiles.add(progressId);
        uploadedItemsCount += 1;
        if (options.processingCountHook) {
          options.processingCountHook(uploadedItemsCount);
        }
      }
    }
    options.progressHook = itemProgressHook;
  }
}

export type TransactionPayload = {
  vaultId: string,
  input: ContractInput,
  tags: Tags,
  state?: any
}

export type BatchUploadItem = {
  file: FileSource,
  options?: FileUploadOptions
}

export type UploadItem = {
  file: FileLike,
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
