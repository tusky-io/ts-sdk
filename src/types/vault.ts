import { Encryptable, encrypted, EncryptedKeys } from "@akord/crypto";
import { Membership } from "./membership";
import { Folder } from "./folder";
import { File } from "./file-version";

export class Vault extends Encryptable {
  id: string;
  status: string;
  public: boolean;
  createdAt: number;
  updatedAt: number;
  owner: string;
  size?: number;
  trash?: number;
  tags?: string[];
  @encrypted() name: string;
  @encrypted() description?: string;

  memberships?: Array<Membership>;
  files?: Array<File>;
  folders?: Array<Folder>;

  constructor(vaultProto: any, keys: Array<EncryptedKeys>) {
    super(keys, null);
    this.id = vaultProto.id;
    this.owner = vaultProto.owner;
    this.public = vaultProto.public;
    this.createdAt = vaultProto.createdAt;
    this.updatedAt = vaultProto.updatedAt;
    this.size = vaultProto.size;
    this.trash = vaultProto.trash;
    this.name = vaultProto.name;
    this.description = vaultProto.description;
    this.tags = vaultProto.tags;
    this.status = vaultProto.status;
    this.memberships = vaultProto?.memberships?.map((membership: Membership) => new Membership(membership, keys));
    this.files = vaultProto?.files?.map((file: File) => new File(file, keys));
    this.folders = vaultProto?.folders?.map((folder: Folder) => new Folder(folder, keys));
  }
}

export type VaultCreateOptions = {
  public?: boolean,
  description?: string,
}