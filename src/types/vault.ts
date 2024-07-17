import { Encryptable, encrypted, EncryptedKeys } from "@akord/crypto";
import { Membership } from "./membership";
import { Folder } from "./folder";
import { File } from "./file-version";

export class Vault extends Encryptable {
  id: string;
  status: string;
  public: boolean;
  createdAt: string;
  updatedAt: string;
  owner: string;
  data: Array<string>;
  size?: number;
  cloud?: boolean;
  tags?: string[];
  termsOfAccess?: string;
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
    this.name = vaultProto.name;
    this.description = vaultProto.description;
    this.termsOfAccess = vaultProto.termsOfAccess;
    this.tags = vaultProto.tags;
    this.status = vaultProto.status;
    this.data = vaultProto.data;
    this.cloud = vaultProto.cloud;
    this.tags = vaultProto.tags;
    this.memberships = vaultProto?.memberships?.map((membership: Membership) => new Membership(membership, keys));
    this.files = vaultProto?.files?.map((file: File) => new File(file, keys));
    this.folders = vaultProto?.folders?.map((folder: Folder) => new Folder(folder, keys));
  }
}

export type VaultCreateOptions = {
  public?: boolean,
  termsOfAccess?: string // if the vault is intended for professional or legal use, you can add terms of access and they must be digitally signed before accessing the vault
  description?: string,
}

export enum DefaultVaults {
  DEFAULT_PRIVATE_CLOUD = "Private cloud",
  DEFAULT_PRIVATE_PERMA = "Private perma",
  DEFAULT_PUBLIC_CLOUD = "Public cloud",
  DEFAULT_PUBLIC_PERMA = "Public perma"
}