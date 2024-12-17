import { Vault } from "../types/vault";
import { Membership } from "../types/membership";
import {
  CreateVaultTxPayload,
  CreateFolderTxPayload,
  UpdateVaultTxPayload,
  UpdateFolderTxPayload,
  UpdateMembershipTxPayload,
  CreateMembershipTxPayload,
  UpdateFileTxPayload,
} from "../types/transaction";
import { Paginated } from "../types/paginated";
import {
  ListApiOptions,
  ListOptions,
  VaultApiGetOptions,
} from "../types/query-options";
import { User, UserMutable } from "../types/user";
import { ApiConfig } from "./config";
import { FileGetOptions } from "../core/file";
import { File, Folder } from "../types";
import { Storage } from "../types/storage";
import { ApiKey } from "../types/api-key";
import {
  PaymentPlan,
  PaymentSession,
  PaymentSessionOptions,
} from "../types/payment";
import {
  CreateChallengeRequestPayload,
  GenerateJWTRequestPayload,
  GenerateJWTResponsePayload,
  VerifyChallengeRequestPayload,
} from "../types/auth";

abstract class Api {
  config: ApiConfig;
  clientName: string; // name of the client consuming the API

  constructor() {}

  abstract generateJWT(
    payload: GenerateJWTRequestPayload,
  ): Promise<GenerateJWTResponsePayload>;

  abstract createAuthChallenge(
    payload: CreateChallengeRequestPayload,
  ): Promise<{ nonce: string }>;

  abstract verifyAuthChallenge(
    payload: VerifyChallengeRequestPayload,
  ): Promise<GenerateJWTResponsePayload>;

  abstract getMe(): Promise<User>;

  abstract updateMe(input: UserMutable): Promise<User>;

  abstract updateFile(tx: UpdateFileTxPayload): Promise<File>;

  abstract deleteFile(id: string): Promise<void>;

  abstract createFolder(tx: CreateFolderTxPayload): Promise<Folder>;

  abstract updateFolder(tx: UpdateFolderTxPayload): Promise<Folder>;

  abstract deleteFolder(id: string): Promise<void>;

  abstract createVault(tx: CreateVaultTxPayload): Promise<Vault>;

  abstract updateVault(tx: UpdateVaultTxPayload): Promise<Vault>;

  abstract deleteVault(id: string): Promise<void>;

  abstract getTrash(): Promise<Folder>;

  abstract emptyTrash(): Promise<Folder>;

  abstract createMembership(tx: CreateMembershipTxPayload): Promise<Membership>;

  abstract updateMembership(tx: UpdateMembershipTxPayload): Promise<Membership>;

  abstract deleteMembership(tx: UpdateMembershipTxPayload): Promise<void>;

  abstract downloadFile(
    id: string,
    options?: FileGetOptions,
  ): Promise<ArrayBuffer | ReadableStream<Uint8Array>>;

  abstract getStorage(): Promise<Storage>;

  abstract getPaymentPlans(): Promise<PaymentPlan[]>;

  abstract createSubscriptionPaymentSession(
    options: PaymentSessionOptions,
  ): Promise<PaymentSession>;

  abstract getFile(id: string): Promise<File>;

  abstract getFolder(id: string): Promise<Folder>;

  abstract getMembership(id: string): Promise<Membership>;

  abstract getVault(id: string, options?: VaultApiGetOptions): Promise<Vault>;

  abstract getVaults(options?: ListOptions): Promise<Paginated<Vault>>;

  abstract getFiles(options?: ListApiOptions): Promise<Paginated<File>>;

  abstract getFolders(options?: ListApiOptions): Promise<Paginated<Folder>>;

  abstract getMembers(vaultId: string): Promise<Array<Membership>>;

  abstract getApiKeys(): Promise<Paginated<ApiKey>>;

  abstract generateApiKey(): Promise<ApiKey>;

  abstract revokeApiKey(key: string): Promise<ApiKey>;
}

export { Api };
