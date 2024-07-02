import { actionRefs, functions } from "../constants";
import { nodeType, NodeCreateOptions } from "../types/node";
import { Folder, FolderCreateResult } from "../types/folder";
import { NodeModule } from "./node";
import { isServer } from "../util/platform";
import { importDynamic } from "../util/import";
import { BadRequest } from "../errors/bad-request";
import { Logger } from "../logger";
import { Tags } from "../types";
import { FileModule } from "./file";
import { ServiceConfig } from ".";

class FolderModule extends NodeModule<Folder> {

  constructor(config?: ServiceConfig) {
    super({ ...config, objectType: nodeType.FOLDER, nodeType: Folder });
  }

  /**
   * @param  {string} vaultId
   * @param  {string} name folder name
   * @param  {NodeCreateOptions} [options] parent id, etc.
   * @returns Promise with new folder id & corresponding transaction id
   */
  public async create(vaultId: string, name: string, options: NodeCreateOptions = this.defaultCreateOptions): Promise<FolderCreateResult> {
    await this.service.setVaultContext(vaultId);
    this.service.setActionRef(actionRefs.FOLDER_CREATE);
    this.service.setFunction(functions.NODE_CREATE);
    this.service.setAkordTags((this.service.isPublic ? [name] : []).concat(options.tags));
    const state = {
      name: await this.service.processWriteString(name),
      tags: options.tags || []
    }
    const { nodeId, transactionId, object } = await this.service.nodeCreate<Folder>(state, { parentId: options.parentId }, options.arweaveTags);
    return { folderId: nodeId, transactionId, object };
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
    options.vaultId = await this.service.validateOrCreateDefaultVault(options);
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
};

export type FolderSource = string | FileSystemEntry

export type FolderUploadOptions = {
  cloud?: boolean,
  arweaveTags?: Tags,
  parentId?: string,
  vaultId?: string,
}

export {
  FolderModule
}