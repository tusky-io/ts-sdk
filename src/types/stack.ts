import { encrypted, EncryptedKeys } from "@akord/crypto";
import { Node, NodeCreateOptions, StorageType } from "./node";
import { FileVersion } from "./file-version";
import { FileUploadOptions } from "../core/file";

export class Stack extends Node {
  @encrypted() name: string;
  versions: Array<FileVersion>;
  uri: string // latest file version uri

  constructor(nodeLike: any, keys: Array<EncryptedKeys>) {
    super(nodeLike, keys);
    this.name = nodeLike.name;
    this.versions = (nodeLike.versions || []).map((version: FileVersion) => new FileVersion(version, keys));
    this.uri = this.getUri();
  }

  getUri(type: StorageType = StorageType.ARWEAVE, index?: number): string {
    const version = this.getVersion(index);
    const uri = version?.getUri(type);
    return uri ? uri : version?.getUri(StorageType.S3);
  }

  getVersion(index?: number): FileVersion {
    return super.getVersion(index) as FileVersion;
  }
}

export type StackCreateOptions = NodeCreateOptions & FileUploadOptions & { overrideFileName?: boolean };

export type StackCreateResult = {
  stackId: string,
  transactionId: string,
  object: Stack,
  uri: string
}

export type StackUpdateResult = {
  transactionId: string,
  object: Stack,
  uri: string
}
