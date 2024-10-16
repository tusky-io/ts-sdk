import { Encryptable } from "../crypto";
import { User } from "./user";

export type RoleType = "viewer" | "contributor" | "owner";
export type StatusType = "accepted" | "pending" | "revoked";

export const activeStatus = ["accepted", "pending"] as StatusType[];

export type EncryptedVaultKeyPair = {
  publicKey: string,
  encPrivateKey: string // vault private key encrypted with member private key
};

export type VaultKeyPair = {
  publicKey: Uint8Array,
  privateKey: Uint8Array,
};

export class Membership extends Encryptable {
  id: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  status: StatusType;
  memberAddress: string;
  role: RoleType;
  data?: string[];
  encPublicSigningKey: string;
  email: string;
  memberDetails: User;
  contextPath: ContextPath // defines granular permissions to fragments of the vault
  vaultId: string;
  keys: VaultKeyPair[];

  // vault context
  __public__?: boolean;

  constructor(membershipProto: any, keys?: Array<EncryptedVaultKeyPair>) {
    super(keys);
    this.id = membershipProto.id;
    this.owner = membershipProto.owner;
    this.memberAddress = membershipProto.memberAddress;
    this.createdAt = membershipProto.createdAt;
    this.updatedAt = membershipProto.updatedAt;
    this.expiresAt = membershipProto.expiresAt;
    this.status = membershipProto.status;
    this.role = membershipProto.role;
    this.encPublicSigningKey = membershipProto.encPublicSigningKey;
    this.email = membershipProto.email;
    this.vaultId = membershipProto.vaultId;
    this.keys = membershipProto.keys;
    this.memberDetails = membershipProto.memberDetails ? new User(membershipProto.memberDetails) : undefined;
    this.contextPath = membershipProto.contextPath ? JSON.parse(membershipProto.contextPath) : undefined;
    this.__public__ = membershipProto.__public__;
  }
}

export type MembershipKeys = {
  isEncrypted: boolean;
  keys: EncryptedVaultKeyPair[];
  publicKey?: string;
};

export type MembershipCreateOptions = {
  message?: string
}

export type MembershipAirdropOptions = {
  name?: string
  expiresAt?: number // expiration date
  allowedStorage?: number // allowed storage
  contextPath?: ContextPath // folder ids, file ids, if not provided defaults to vault id
  role?: RoleType //  member role,
  password?: string // password to protect member encryption keys, if not provided a random password will be generated
}

export type ContextPath = {
  folder?: string[] // folder ids to share within the vault
  file?: string[] // file ids to share within the vault
}