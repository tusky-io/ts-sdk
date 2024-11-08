import { status } from "../constants";
import { Folder } from "../types/folder";
import { isServer } from "../util/platform";
import { importDynamic } from "../util/import";
import { BadRequest } from "../errors/bad-request";
import { logger } from "../logger";
import { FileModule } from "./file";
import { GetOptions, ListOptions, validateListPaginatedApiOptions } from "../types/query-options";
import { Paginated } from "../types/paginated";
import { paginate, processListItems } from "./common";
import { FolderService } from "./service/folder";
import { ServiceConfig } from ".";

class FolderModule {
  protected type: "Folder";

  protected service: FolderService;

  protected parentId?: string;

  protected defaultListOptions = {
    shouldDecrypt: true
  } as ListOptions;

  protected defaultGetOptions = {
    shouldDecrypt: true
  } as GetOptions;

  protected defaultCreateOptions = {
    parentId: undefined
  } as any;

  constructor(config?: ServiceConfig) {
    this.service = new FolderService(config);
  }

  /**
   * @param  {string} vaultId
   * @param  {string} name folder name
   * @param  {NodeCreateOptions} [options] parent id, etc.
   * @returns Promise with new folder id & corresponding transaction id
   */
  public async create(vaultId: string, name: string, options: any = this.defaultCreateOptions): Promise<Folder> {
    await this.service.setVaultContext(vaultId);

    await this.service.setName(name);
    this.service.setParentId(options.parentId);

    const folder = await this.service.api.createFolder({ vaultId: vaultId, name: this.service.name, parentId: this.service.parentId });

    // if (!this.service.api.autoExecute) {
    //   const signature = await this.service.signer.sign(bytes);
    //   await this.service.api.postTransaction(digest, signature);
    // }

    return this.service.processFolder(folder, this.service.encrypted, this.service.keys);
  }

  /**
   * @param  {string} vaultId
   * @param  {FolderSource} folder folder source: folder path, file system entry
   * @param  {FolderUploadOptions} [options] parent id, etc.
   * @returns Promise with new folder id
   */
  public async upload(
    vaultId: string,
    folder: FolderSource,
    options: FolderUploadOptions = {}
  ): Promise<any> {
    if (typeof folder === "string") {
      if (!isServer()) {
        throw new BadRequest("Folder path supported only for node.");
      }
      const fs = importDynamic("fs");
      const path = importDynamic("path");
      const files = fs.readdirSync(folder);
      for (let file of files) {
        const fullPath = path.join(folder, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          const { folderId } = await this.create(vaultId, file, { parentId: options.parentId });
          logger.info("Created folder: " + file);
          // recursively process the subdirectory
          await this.upload(vaultId, fullPath, { ...options, parentId: folderId });
        } else {
          // upload file
          const fileModule = new FileModule(this.service);
          //await fileModule.upload(fullPath, options);
          logger.info("Uploaded file: " + fullPath + " to folder: " + options.parentId);
        }
      }
    }
    return {} as any;
  }

  /**
   * @param  {string} id
   * @returns Promise with the folder object
   */
  public async get(id: string, options: GetOptions = this.defaultGetOptions): Promise<Folder> {
    const getOptions = {
      ...this.defaultGetOptions,
      ...options
    }
    const nodeProto = await this.service.api.getFolder(id);
    return this.service.processFolder(nodeProto, getOptions.shouldDecrypt);
  }

  /**
   * @param  {ListOptions} options
   * @returns Promise with paginated user folders
   */
  public async list(options: ListOptions = this.defaultListOptions): Promise<Paginated<Folder>> {
    validateListPaginatedApiOptions(options);

    const listOptions = {
      ...this.defaultListOptions,
      ...options
    }
    const response = await this.service.api.getFolders(listOptions);
    const items = [];
    const errors = [];
    const processItem = async (nodeProto: any) => {
      try {
        const node = await this.service.processFolder(nodeProto, listOptions.shouldDecrypt);
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
   * @returns Promise with all user folders
   */
  public async listAll(options: ListOptions = this.defaultListOptions): Promise<Array<Folder>> {
    const list = async (options: ListOptions) => {
      return this.list(options);
    }
    return paginate<Folder>(list, options);
  }

  /**
   * @param  {string} id folder id
   * @param  {string} name new name
   * @returns Promise with corresponding transaction id
   */
  public async rename(id: string, name: string): Promise<Folder> {
    await this.service.setVaultContextFromNodeId(id);
    await this.service.setName(name);
    const folderProto = await this.service.api.updateFolder({ id: id, name: this.service.name });
    return this.service.processFolder(folderProto, true);
  }

  /**
   * @param  {string} id
   * @param  {string} [parentId] new parent folder id, if no parent id provided will be moved to the vault root.
   * @returns Promise with corresponding transaction id
   */
  public async move(id: string, parentId?: string): Promise<Folder> {
    await this.service.setVaultContextFromNodeId(id);
    const folderProto = await this.service.api.updateFolder({ id: id, parentId: parentId ? parentId : this.service.vaultId });
    return this.service.processFolder(folderProto, true);
  }

  /**
   * The folder will be moved to the trash. All folder contents will be permanently deleted within 30 days.
   * To undo this action, call folder.restore() within the 30-day period.
   * @param  {string} id folder id
   * @returns Promise with the updated folder
   */
  public async delete(id: string): Promise<Folder> {
    return this.service.api.updateFolder({ id: id, status: status.DELETED });
  }

  /**
   * Restores the folder from the trash, recovering all folder contents.
   * This action must be performed within 30 days of the folder being moved to the trash to prevent permanent deletion.
   * @param  {string} id folder id
   * @returns Promise with the updated folder
   */
  public async restore(id: string): Promise<Folder> {
    return this.service.api.updateFolder({ id: id, status: status.ACTIVE });
  }

  /**
   * The folder and all its contents will be permanently deleted.
   * This action is irrevocable and can only be performed if the folder is already in trash.
   * @param  {string} id folder id
   * @returns {Promise<void>}
   */
  public async deletePermanently(id: string): Promise<void> {
    return this.service.api.deleteFolder(id);
  }
};

export type FolderSource = string | FileSystemEntry

export type FolderUploadOptions = {
  parentId?: string,
}

export {
  FolderModule
}