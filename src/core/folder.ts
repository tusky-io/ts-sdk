import { status } from "../constants";
import { Folder } from "../types/folder";
import { isServer } from "../util/platform";
import { importDynamic } from "../util/import";
import { BadRequest } from "../errors/bad-request";
import { Logger } from "../logger";
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
    shouldDecrypt: true,
    filter: {
      status: { ne: status.DELETED }
    }
  } as ListOptions;

  protected defaultGetOptions = {
    shouldDecrypt: true,
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

    return this.service.processFolder(folder, !this.service.isPublic, this.service.keys) as any;
  }

  /**
   * @param  {FolderSource} folder folder source: folder path, file system entry
   * @param  {FolderUploadOptions} [options] parent id, etc.
   * @returns Promise with new folder id
   */
  public async upload(
    folder: FolderSource,
    options: FolderUploadOptions = {}
  ): Promise<any> {
    // validate vault or use/create default one
    // options.vaultId = await this.service.validateOrCreateDefaultVault(options);
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
          const { folderId } = await this.create(options.vaultId, file, { parentId: options.parentId });
          Logger.log("Created folder: " + file);
          // recursively process the subdirectory
          await this.upload(fullPath, { ...options, parentId: folderId });
        } else {
          // upload file
          const fileModule = new FileModule(this.service);
          await fileModule.upload(fullPath, options);
          Logger.log("Uploaded file: " + fullPath + " to folder: " + options.parentId);
        }
      }
    }
    return {} as any;
  }

  /**
   * @param  {string} nodeId
   * @returns Promise with the decrypted node
   */
  public async get(nodeId: string, options: GetOptions = this.defaultGetOptions): Promise<Folder> {
    const getOptions = {
      ...this.defaultGetOptions,
      ...options
    }
    const nodeProto = await this.service.api.getFolder(nodeId);
    return this.service.processFolder(nodeProto, !nodeProto.__public__ && getOptions.shouldDecrypt, nodeProto.__keys__);
  }

  /**
   * @param  {string} vaultId
   * @param  {ListOptions} options
   * @returns Promise with paginated nodes within given vault
   */
  public async list(vaultId: string, options: ListOptions = this.defaultListOptions = this.defaultListOptions): Promise<Paginated<Folder>> {
    validateListPaginatedApiOptions(options);
    if (!options.hasOwnProperty('parentId')) {
      // if parent id not present default to root - vault id
      options.parentId = vaultId;
    }
    const listOptions = {
      ...this.defaultListOptions,
      ...options
    }
    const response = await this.service.api.getFoldersByVaultId(vaultId, listOptions);
    const items = [];
    const errors = [];
    const processItem = async (nodeProto: any) => {
      try {
        const node = await this.service.processFolder(nodeProto, !nodeProto.__public__ && listOptions.shouldDecrypt, nodeProto.__keys__);
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
  public async listAll(vaultId: string, options: ListOptions = this.defaultListOptions): Promise<Array<Folder>> {
    const list = async (options: ListOptions & { vaultId: string }) => {
      return this.list(options.vaultId, options);
    }
    return paginate<Folder>(list, { ...options, vaultId });
  }

  /**
   * @param  {string} id folder id
   * @param  {string} name new name
   * @returns Promise with corresponding transaction id
   */
  public async rename(id: string, name: string): Promise<Folder> {
    await this.service.setVaultContextFromNodeId(id);
    await this.service.setName(name);
    return this.service.api.updateFolder({ id: id, name: this.service.name });
  }

  /**
   * @param  {string} id
   * @param  {string} [parentId] new parent folder id, if no parent id provided will be moved to the vault root.
   * @returns Promise with corresponding transaction id
   */
  public async move(id: string, parentId?: string): Promise<Folder> {
    await this.service.setVaultContextFromNodeId(id);
    return this.service.api.updateFolder({ id: id, parentId: parentId ? parentId : this.service.vaultId });
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
};

export type FolderSource = string | FileSystemEntry

export type FolderUploadOptions = {
  cloud?: boolean,
  parentId?: string,
  vaultId?: string,
}

export {
  FolderModule
}