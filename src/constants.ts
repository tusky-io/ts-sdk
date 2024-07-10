export enum objects {
  VAULT = "Vault",
  MEMBERSHIP = "Membership",
  FILE = "File",
  FOLDER = "Folder"
};

export enum status {
  ACTIVE = "ACTIVE",
  DELETED = "DELETED"
};

export enum membershipStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  REVOKED = "REVOKED"
};

export enum role {
  OWNER = "OWNER",
  CONTRIBUTOR = "CONTRIBUTOR",
  VIEWER = "VIEWER"
};

export enum functions {
  VAULT_CREATE = "vault:init",
  VAULT_UPDATE = "vault:update",
  VAULT_DELETE = "vault:delete",
  VAULT_RESTORE = "vault:restore",

  MEMBERSHIP_AIRDROP_ACCESS = "membership:airdrop-access",
  MEMBERSHIP_CHANGE_ACCESS = "membership:change-access",
  MEMBERSHIP_REVOKE_ACCESS = "membership:revoke-access",
  MEMBERSHIP_LEAVE = "membership:leave",

  FILE_CREATE = "file:create",
  FILE_MOVE = "file:move",
  FILE_DELETE = "file:delete",
  FILE_RESTORE = "file:restore",
  FILE_UPDATE = "file:update",

  FOLDER_CREATE = "folder:create",
  FOLDER_MOVE = "folder:move",
  FOLDER_DELETE = "folder:delete",
  FOLDER_RESTORE = "folder:restore",
  FOLDER_UPDATE = "folder:update",
};

export enum actions {
  VAULT_CREATE = "VAULT_CREATE",
  VAULT_RENAME = "VAULT_RENAME",
  VAULT_DELETE = "VAULT_DELETE",
  VAULT_RESTORE = "VAULT_RESTORE",
  MEMBERSHIP_INVITE = "MEMBERSHIP_INVITE",
  MEMBERSHIP_AIRDROP_ACCESS = "MEMBERSHIP_AIRDROP_ACCESS",
  MEMBERSHIP_REVOKE_ACCESS = "MEMBERSHIP_REVOKE_ACCESS",
  MEMBERSHIP_CHANGE_ACCESS = "MEMBERSHIP_CHANGE_ACCESS",
  MEMBERSHIP_LEAVE = "MEMBERSHIP_LEAVE",
  MEMBERSHIP_KEY_ROTATE = "MEMBERSHIP_KEY_ROTATE",
  FOLDER_CREATE = "FOLDER_CREATE",
  FOLDER_RENAME = "FOLDER_RENAME",
  FOLDER_MOVE = "FOLDER_MOVE",
  FOLDER_DELETE = "FOLDER_DELETE",
  FOLDER_RESTORE = "FOLDER_RESTORE",
  FILE_CREATE = "FILE_CREATE",
  FILE_RENAME = "FILE_RENAME",
  FILE_MOVE = "FILE_MOVE",
  FILE_DELETE = "FILE_DELETE",
  FILE_RESTORE = "FILE_RESTORE",
};

export enum protocolTags {
  CLIENT_NAME = "Client-Name",
  PROTOCOL_NAME = "Protocol-Name",
  PROTOCOL_VERSION = "Protocol-Version",
  TIMESTAMP = "Timestamp",
  FUNCTION_NAME = "Function-Name",
  VAULT_ID = "Vault-Id",
  MEMBERSHIP_ID = "Membership-Id",
  NODE_TYPE = "Node-Type",
  NODE_ID = "Node-Id",
  PUBLIC = "Public",
  REF_ID = "Ref-Id",
  REVISION = "Revision",
  ACTION_REF = "Action-Ref",
  GROUP_REF = "Group-Ref",
  SIGNER_ADDRESS = "Signer-Address",
  SIGNATURE = "Signature",
  MEMBER_ADDRESS = "Member-Address",
  PARENT_ID = "Parent-Id"
};

export enum dataTags {
  DATA_TYPE = "Data-Type",
  CONTENT_TYPE = "Content-Type",
  SIGNER_ADDRESS = "Signer-Address",
  SIGNATURE = "Signature",
};

export enum fileTags {
  FILE_NAME = "File-Name",
  FILE_MODIFIED_AT = "File-Modified-At",
  FILE_SIZE = "File-Size",
  FILE_TYPE = "File-Type",
  FILE_HASH = "File-Hash",
  FILE_CHUNK_SIZE = "File-Chunk-Size"
}

export enum encryptionTags {
  IV = "Initialization-Vector",
  ENCRYPTED_KEY = "Encrypted-Key",
  PUBLIC_ADDRESS = "Public-Address"
};

export enum encryptionTagsLegacy {
  IV = "IV",
  ENCRYPTED_KEY = "EncryptedKey",
  PUBLIC_ADDRESS = "Public-Address"
};