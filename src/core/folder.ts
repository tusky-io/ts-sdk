import { status } from "../constants";
import { Folder } from "../types/folder";
import { isServer } from "../util/platform";
import { importDynamic } from "../util/import";
import { BadRequest } from "../errors/bad-request";
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
import pLimit from "p-limit";
import { Auth } from "../auth";
import { File } from "../types";

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
   * @returns {Promise<Folder>} Promise with new folder
   */
  public async upload(
    vaultId: string,
    folder: FolderSource,
    options: FolderUploadOptions = this.defaultUploadOptions,
  ): Promise<{
    folderData: FileOrFolderInfo[];
    folderIdMap: Record<string, string>;
  }> {
    if (!isServer()) {
      const folderData = await traverseFolderBrowser(folder as FileSystemEntry);
      return { folderData, folderIdMap: {} };
    } else {
      if (typeof folder !== "string") {
        throw new BadRequest("Only string folder path supported for node.");
      }

      const { folderIdMap, folderData } = await this.createTree(
        vaultId,
        folder,
        options,
      );

      const limit = pLimit(CONCURRENCY_LIMIT);

      // upload files
      const uploadPromises = folderData
        .filter((item) => !item.isFolder)
        .map((file) =>
          limit(() => {
            const fileModule = new FileModule({
              ...this.service,
              auth: this.auth,
            });
            return fileModule.upload(vaultId, file.fullPath as any, {
              name: file.name,
              parentId: folderIdMap[file.parentPath] || vaultId,
            });
          }),
        );

      await Promise.all(uploadPromises);
      return { folderData, folderIdMap };
    }
  }

  /**
   * Create folder structure
   * @param {string} vaultId
   * @param {FolderSource} folder folder source: folder path, file system entry
   * @param  {FolderUploadOptions} [options] parent id, includeRootFolder flag etc.
   * @returns {Promise<Folder>} Promise with new folder
   */
  public async createTree(
    vaultId: string,
    folder: FolderSource,
    options: FolderUploadOptions = this.defaultUploadOptions,
  ): Promise<{
    folderData: FileOrFolderInfo[];
    folderIdMap: Record<string, string>;
  }> {
    let folderData: FileOrFolderInfo[];
    const folderIdMap: Record<string, string> = {}; // map relativePath to folder id
    if (!isServer()) {
      folderData = await traverseFolderBrowser(folder as FileSystemEntry);
    } else {
      if (typeof folder !== "string") {
        throw new BadRequest("Only string folder path supported for node.");
      }
      folderData = traverseFolder(folder, options.includeRootFolder);

      // const folderPaths = folderData
      //   .filter((item) => item.isFolder)
      //   .map((folder) => folder.relativePath);
    }
    const sortedFolders = folderData
      .filter((item) => item.isFolder)
      .sort((folder1, folder2) => {
        return (
          folder1.relativePath.split("/").length -
          folder2.relativePath.split("/").length
        );
      });

    // TODO: send folder structure to the backend and get the folder id map
    // const folderIdMap = await this.service.api.createFolderTree({
    //   vaultId: vaultId,
    //   folderData: sortedFolders,
    // });

    for (const folder of sortedFolders) {
      console.log("creating folder");
      const parentId = folder.parentPath
        ? folderIdMap[folder.parentPath]
        : vaultId;
      const folderModule = new FolderModule({
        ...this.service,
        auth: this.auth,
      });
      const { id } = await folderModule.create(vaultId, folder.name, {
        parentId,
      });
      folderIdMap[folder.relativePath] = id;
    }
    return { folderIdMap, folderData };
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
    const response = await this.service.api.getFolders(listOptions);
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

const traverseFolderBrowser = async (
  rootEntry: FileSystemEntry,
  rootPath = "",
  includeRootFolder = false,
  skipHidden = true,
): Promise<FileOrFolderInfo[]> => {
  const result: FileOrFolderInfo[] = [];

  const traverse = async (
    entry: FileSystemEntry,
    currentPath: string,
    rootPath = currentPath,
  ): Promise<void> => {
    // skip hidden files or directories (those starting with a dot)
    if (skipHidden && entry.name.startsWith(".")) {
      return;
    }
    const fullPath = currentPath.endsWith("/")
      ? currentPath + entry.name
      : currentPath + "/" + entry.name;

    if (entry.isFile) {
      const file = await new Promise<any>((resolve) => {
        (entry as FileSystemFileEntry).file((file) => {
          resolve(file);
        });
      });
      result.push({
        fullPath,
        relativePath: fullPath.replace(rootPath + "/", ""),
        parentPath:
          currentPath === rootPath
            ? null
            : currentPath.replace(rootPath + "/", ""),
        name: entry.name,
        isFolder: false,
        file: file,
      });
    } else if (entry.isDirectory) {
      if (includeRootFolder || currentPath !== rootPath) {
        result.push({
          fullPath,
          relativePath: fullPath.replace(rootPath + "/", ""),
          parentPath:
            currentPath === rootPath
              ? null
              : currentPath.replace(rootPath + "/", ""),
          name: entry.name,
          isFolder: true,
        });
      }

      const reader = (entry as FileSystemDirectoryEntry).createReader();
      await new Promise<void>((resolve) => {
        reader.readEntries(async (entries) => {
          for (const child of entries) {
            // await traverse(child, fullPath + "/", rootPath);
            await traverse(child, fullPath, rootPath);
          }
          resolve();
        });
      });
    }
  };

  await traverse(rootEntry, rootPath);

  return result;
};

const traverseFolder = (
  folderPath: string,
  includeRootFolder = false,
  skipHidden = true,
  basePath = folderPath,
) => {
  const fs = importDynamic("fs");
  const path = importDynamic("path");

  const result: FileOrFolderInfo[] = [];

  const items = fs.readdirSync(folderPath);

  if (includeRootFolder) {
    result.push({
      fullPath: folderPath,
      relativePath: path.basename(folderPath),
      parentPath: null,
      name: path.basename(folderPath),
      isFolder: true,
    });
  }

  for (const item of items) {
    console.log(item);
    const fullPath = path.join(folderPath, item);
    const relativePath = path.relative(basePath, fullPath);
    const name = path.basename(relativePath);
    // skip hidden files or directories (those starting with a dot)
    if (skipHidden && name.startsWith(".")) {
      return;
    }
    const parentPath =
      includeRootFolder && path.dirname(relativePath) === "."
        ? path.basename(folderPath)
        : path.dirname(relativePath);
    const stat = fs.lstatSync(fullPath);

    if (stat.isDirectory()) {
      result.push({
        fullPath,
        relativePath,
        parentPath,
        name,
        isFolder: true,
      });

      // recursively traverse folder contents
      result.push(...traverseFolder(fullPath, false, skipHidden, basePath));
    } else {
      result.push({
        fullPath,
        relativePath,
        parentPath,
        name,
        isFolder: false,
      });
    }
  }
  return result;
};

type FileOrFolderInfo = {
  fullPath: string;
  relativePath: string;
  parentPath: string;
  name: string;
  isFolder: boolean;
  id?: string;
  file?: File;
};

export type FolderSource = string | FileSystemEntry;

export type FolderCreateOptions = {
  parentId?: string;
};

export type FolderUploadOptions = {
  parentId?: string;
  includeRootFolder?: boolean;
  withFiles?: boolean;
  skipHidden?: boolean;
};

export { FolderModule };
