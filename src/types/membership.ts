import { Encryptable, EncryptedKeys } from "@akord/crypto";
import { User } from "./user";

export type RoleType = "VIEWER" | "CONTRIBUTOR" | "OWNER";
export type StatusType = "ACCEPTED" | "PENDING" | "REVOKED" | "INVITED";

export const activeStatus = ["ACCEPTED", "PENDING", "INVITED"] as StatusType[];

export class Membership extends Encryptable {
  id: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  status: StatusType;
  address: string;
  role: RoleType;
  data?: string[];
  encPublicSigningKey: string;
  email: string;
  memberDetails: User;
  vaultId: string;
  keys: EncryptedKeys[];

  // vault context
  __public__?: boolean;
  __cloud__?: boolean;

  constructor(membershipProto: any, keys?: Array<EncryptedKeys>) {
    super(keys, null)
    this.id = membershipProto.id;
    this.owner = membershipProto.owner;
    this.address = membershipProto.address;
    this.createdAt = membershipProto.createdAt;
    this.updatedAt = membershipProto.updatedAt;
    this.expiresAt = membershipProto.expiresAt;
    this.data = membershipProto.data;
    this.status = membershipProto.status;
    this.role = membershipProto.role;
    this.encPublicSigningKey = membershipProto.encPublicSigningKey;
    this.email = membershipProto.email;
    this.vaultId = membershipProto.vaultId;
    this.keys = membershipProto.keys;
    this.memberDetails = membershipProto.memberDetails;
    this.__public__ = membershipProto.__public__;
    this.__cloud__ = membershipProto.__cloud__;
  }
}

export type MembershipKeys = {
  isEncrypted: boolean;
  keys: EncryptedKeys[];
  publicKey?: string;
};

export type MembershipCreateOptions = {
  message?: string
}

export type MembershipCreateResult = {
  membershipId: string,
  transactionId: string,
  object: Membership
}

export type MembershipUpdateResult = {
  transactionId: string,
  object: Membership
}

export type MembershipAirdropOptions = {
  name?: string
  expirationDate?: Date
  allowedStorage?: number
}
