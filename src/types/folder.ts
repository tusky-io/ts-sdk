import { encrypted, EncryptedKeys } from "@akord/crypto";
import { Node } from "./node";

export class Folder extends Node {
  @encrypted() name: string;
  size: number;

  constructor(nodeLike: any, keys: Array<EncryptedKeys>) {
    super(nodeLike, keys);
    this.name = nodeLike.name;
    this.size = nodeLike.size;
  }
}

export type FolderCreateResult = {
  folderId: string,
  transactionId: string,
  object: Folder
}

export const ROOT_FOLDER = "null";