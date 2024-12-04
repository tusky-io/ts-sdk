export enum objects {
  VAULT = "Vault",
  MEMBERSHIP = "Membership",
  FILE = "File",
  FOLDER = "Folder",
}

export enum status {
  ACTIVE = "active",
  DELETED = "deleted",
}

export enum membershipStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  REVOKED = "revoked",
}

export enum apiKeyStatus {
  ACTIVE = "active",
  REVOKED = "revoked",
}

export enum role {
  OWNER = "owner",
  CONTRIBUTOR = "contributor",
  VIEWER = "viewer",
}

export enum actions {
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
}
