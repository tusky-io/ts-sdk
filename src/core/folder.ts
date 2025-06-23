import pLimit from "@esm2cjs/p-limit";
import { status } from "../constants";
import { Folder } from "../types/folder";
import { FileModule } from "./file";
import {
  GetOptions,
  ListOptions,
  validateListPaginatedApiOptions,
} from "../types/query-options";
import { Paginated } from "../types/paginated";
import { paginate, processListItems } from "./common";
import { FolderService } from "./service/folder";
import { ServiceConfig } from ".";
import { Auth } from "../auth";
import { File } from "../types";
import { FolderSource, traverse } from "@env/core/folder";
import { digest } from "../crypto";
import { logger } from "../logger";

const CONCURRENCY_LIMIT = 10;

class FolderModule {
  protected type: "Folder";

  protected service: FolderService;

  protected parentId?: string;

  protected defaultCreateOptions = {
    parentId: undefined,
  } as FolderCreateOptions;

  protected defaultUploadOptions = {
    parentId: undefined,
    includeRootFolder: false,
    withFiles: false,
    skipHidden: true,
  } as FolderUploadOptions;

  protected defaultListOptions = {
    shouldDecrypt: true,
  } as ListOptions;

  protected defaultGetOptions = {
    shouldDecrypt: true,
  } as GetOptions;

  protected auth: Auth;

  constructor(config?: ServiceConfig) {
    this.service = new FolderService(config);
    this.auth = config.auth;
  }

  /**
   * @param {string} vaultId
   * @param {string} name folder name
   * @returns {Promise<Folder>} Promise with new folder
   */
  public async create(
    vaultId: string,
    name: string,
    options: FolderCreateOptions = this.defaultCreateOptions,
  ): Promise<Folder> {
    await this.service.setVaultContext(vaultId);

    await this.service.setName(name);
    this.service.setParentId(options.parentId);

    const folder = await this.service.api.createFolder({
      vaultId: vaultId,
      name: this.service.name,
      parentId: this.service.parentId,
    });

    return this.service.processFolder(
      folder,
      this.service.encrypted,
      this.service.keys,
    );
  }

  /**
   * Upload folder with its content from given source
   * @param {string} vaultId
   * @param {FolderSource} folder folder source: folder path, file system entry
   * @param  {FolderUploadOptions} [options] parent id, includeRootFolder flag etc.
   * @returns {Promise<{folderIdMap: Record<string, string>}>} Promise with new folder id map
   */
  public async upload(
    vaultId: string,
    folder: FolderSource,
    options: FolderUploadOptions = this.defaultUploadOptions,
  ): Promise<{ folderIdMap: Record<string, string> }> {
    // NOTE: keep await for browser implementation
    const folderTreeData = await traverse(
      folder,
      options.includeRootFolder,
      options.skipHidden,
    );

    const relativePaths = folderTreeData
      .filter((node) => node.isFolder)
      .map((node) => node.relativePath);

    const { folderIdMap } = await this.createTree(
      vaultId,
      relativePaths,
      options,
    );

    const limit = pLimit(CONCURRENCY_LIMIT);

    // upload files
    const uploadPromises = folderTreeData
      .filter((item) => !item.isFolder)
      .map((file) =>
        limit(() => {
          const fileModule = new FileModule({
            ...this.service,
            auth: this.auth,
          });
          return fileModule.upload(vaultId, file.fullPath as any, {
            name: file.name,
            parentId:
              folderIdMap[file.parentPath] || options.parentId || vaultId,
          });
        }),
      );

    await Promise.all(uploadPromises);
    return { folderIdMap };
  }

  /**
   * Create folder structure
   * @param {string} vaultId
   * @param {Array<string>} paths relative paths array
   * @param  {FolderUploadOptions} [options] parent id, includeRootFolder flag etc.
   * @returns {Promise<{folderIdMap: Record<string, string>}>} Promise with new folder id map
   */
  public async createTree(
    vaultId: string,
    paths: Array<string>,
    options: FolderUploadOptions = this.defaultUploadOptions,
  ): Promise<{ folderIdMap: Record<string, string> }> {
    await this.service.setVaultContext(vaultId);
    this.service.setParentId(options.parentId);

    const sortedPaths = await Promise.all(
      paths
        .filter((path) => path)
        .map((relativePath) => ({
          relativePath,
          parentPath: getParentPath(relativePath),
          name: getFolderName(relativePath),
        }))
        // sort paths by length
        .sort((folder1, folder2) => {
          return (
            folder1.relativePath.split("/").length -
            folder2.relativePath.split("/").length
          );
        })
        // filter out hidden paths if skipHidden option present
        .filter((path) => !options.skipHidden || !path.name.startsWith(".")),
    );

    const processedPaths = await Promise.all(
      // encrypt if encrypted vault
      sortedPaths.map(async (path) => ({
        name: await this.service.processWriteString(path.name),
        // TODO: encrypt
        parentPath: this.service.encrypted
          ? await digest(path.parentPath)
          : path.parentPath,
        // TODO: encrypt
        relativePath: this.service.encrypted
          ? await digest(path.relativePath)
          : path.relativePath,
      })),
    );

    let folderIdMap = (
      await this.service.api.createFolderTree({
        vaultId: vaultId,
        parentId: options.parentId,
        paths: processedPaths,
      })
    ).folderIdMap;

    if (this.service.encrypted) {
      // map back to cleartext relativePath
      const remappedfolderIdMap: Record<string, string> = {}; // map relativePath to folder id
      for (let folder of sortedPaths) {
        const hashedPath = await digest(folder.relativePath);
        remappedfolderIdMap[folder.relativePath] = folderIdMap[hashedPath];
      }
      return { folderIdMap: remappedfolderIdMap };
    }
    return { folderIdMap };
  }

  /**
   * @param {string} id
   * @returns {Promise<Folder>} Promise with the folder object
   */
  public async get(
    id: string,
    options: GetOptions = this.defaultGetOptions,
  ): Promise<Folder> {
    const getOptions = {
      ...this.defaultGetOptions,
      ...options,
    };
    const nodeProto = await this.service.api.getFolder(id);
    return this.service.processFolder(nodeProto, getOptions.shouldDecrypt);
  }

  /**
   * @param {ListOptions} options
   * @returns {Promise<Paginated<Folder>>} Promise with paginated user folders
   */
  public async list(
    options: ListOptions = this.defaultListOptions,
  ): Promise<Paginated<Folder>> {
    validateListPaginatedApiOptions(options);

    const listOptions = {
      ...this.defaultListOptions,
      ...options,
    };
    logger.info(`[time] Api call folder.list() start`);
    const start = performance.now();
    const response = await this.service.api.getFolders(listOptions);
    const end = performance.now();
    logger.info(`[time] Api call folder.list() end - took ${end - start} ms`);
    const items = [];
    const errors = [];
    const processItem = async (nodeProto: any) => {
      try {
        const node = await this.service.processFolder(
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
   * @param {ListOptions} options
   * @returns {Promise<Array<Folder>>} Promise with all user folders
   */
  public async listAll(
    options: ListOptions = this.defaultListOptions,
  ): Promise<Array<Folder>> {
    const list = async (options: ListOptions) => {
      return this.list(options);
    };
    return paginate<Folder>(list, options);
  }

  /**
   * @param {string} id folder id
   * @param {string} name new name
   * @returns {Promise<Folder>}
   */
  public async rename(id: string, name: string): Promise<Folder> {
    await this.service.setVaultContextFromNodeId(id);
    await this.service.setName(name);
    const folderProto = await this.service.api.updateFolder({
      id: id,
      name: this.service.name,
    });
    return this.service.processFolder(folderProto, true);
  }

  /**
   * @param {string} id
   * @param {string} [parentId] new parent folder id, if no parent id provided will be moved to the vault root.
   * @returns {Promise<Folder>}
   */
  public async move(id: string, parentId?: string): Promise<Folder> {
    await this.service.setVaultContextFromNodeId(id);
    const folderProto = await this.service.api.updateFolder({
      id: id,
      parentId: parentId ? parentId : this.service.vaultId,
    });
    return this.service.processFolder(folderProto, true);
  }

  /**
   * The folder will be moved to the trash. All folder contents will be permanently deleted within 30 days.\
   * To undo this action, call folder.restore() within the 30-day period.
   * @param {string} id folder id
   * @returns {Promise<Folder>}
   */
  public async delete(id: string): Promise<Folder> {
    return this.service.api.updateFolder({ id: id, status: status.DELETED });
  }

  /**
   * Restores the folder from the trash, recovering all folder contents.\
   * This action must be performed within 30 days of the folder being moved to the trash to prevent permanent deletion.
   * @param {string} id folder id
   * @returns {Promise<Folder>}
   */
  public async restore(id: string): Promise<Folder> {
    return this.service.api.updateFolder({ id: id, status: status.ACTIVE });
  }

  /**
   * The folder and all its contents will be permanently deleted.\
   * This action is irrevocable and can only be performed if the folder is already in trash.
   * @param {string} id folder id
   * @returns {Promise<void>}
   */
  public async deletePermanently(id: string): Promise<void> {
    return this.service.api.deleteFolder(id);
  }
}

export type FileOrFolderInfo = {
  fullPath: string;
  relativePath: string;
  parentPath: string;
  name: string;
  isFolder: boolean;
  id?: string;
  file?: File;
};

export type FolderCreateOptions = {
  parentId?: string;
};

export type FolderUploadOptions = {
  parentId?: string;
  includeRootFolder?: boolean;
  withFiles?: boolean;
  skipHidden?: boolean;
};

function getFolderName(relativePath: string): string {
  const lastSlashIndex = relativePath.lastIndexOf("/");
  return lastSlashIndex !== -1
    ? relativePath.substring(lastSlashIndex + 1) // everything after the last "/"
    : relativePath; // if no "/" exists, the relativePath itself is the folder name
}

function getParentPath(relativePath: string): string {
  const lastSlashIndex = relativePath.lastIndexOf("/");
  return lastSlashIndex !== -1
    ? relativePath.substring(0, lastSlashIndex) // everything before the last "/"
    : null; // if no "/" exists, the relativePath is root
}

export { FolderModule };
