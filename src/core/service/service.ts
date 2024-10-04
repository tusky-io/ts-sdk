import { Api } from "../../api/api";
import { jsonToBase64, base64ToArray, encryptWithPublicKey } from "../../crypto";
import { actions } from '../../constants';
import { Vault } from "../../types/vault";
import { Object, ObjectType } from "../../types/object";
import { Signer } from "../../signer";
import { EncryptedVaultKeyPair, Env, VaultKeyPair } from "../../types";
import { Encrypter } from "../../crypto/encrypter";

export const STATE_CONTENT_TYPE = "application/json";

class Service {
  api: Api

  signer: Signer
  encrypter: Encrypter

  keys: Array<EncryptedVaultKeyPair>
  decryptedKeys: Array<VaultKeyPair>

  vaultId: string
  parentId: string
  objectId: string
  type: ObjectType
  isPublic: boolean
  vault: Vault
  object: Object
  groupRef: string

  userAgent: string // client name

  storage: Storage // user session storage
  env: Env

  constructor(config: ServiceConfig) {
    this.signer = config.signer;
    this.api = config.api;
    this.encrypter = config.encrypter;
    // set context from config / another service
    this.vault = config.vault;
    this.vaultId = config.vaultId;
    this.keys = config.keys;
    this.decryptedKeys = config.decryptedKeys || [];
    this.objectId = config.objectId;
    this.isPublic = config.isPublic;
    this.type = config.type;
    this.object = config.object;
    this.groupRef = config.groupRef;
    this.userAgent = config.userAgent;
    this.storage = config.storage;
    this.env = config.env;
  }

  setKeys(keys: EncryptedVaultKeyPair[]) {
    this.keys = keys;
  }

  setDecryptedKeys(keys: VaultKeyPair[]) {
    this.decryptedKeys = keys;
  }

  async decryptKeys() {
    if (!this.decryptedKeys || this.decryptedKeys.length === 0) {
      this.decryptedKeys = [];
      if (this.keys && this.keys.length > 0) {
        for (let keypair of this.keys) {
          const privateKey = await this.encrypter.decrypt(keypair.encPrivateKey);
          this.decryptedKeys.push({ publicKey: base64ToArray(keypair.publicKey), privateKey: privateKey });
        }
      }
    }
  }

  setVaultId(vaultId: string) {
    this.vaultId = vaultId;
  }

  setParentId(parentId: string) {
    this.parentId = parentId;
  }

  setObjectId(objectId: string) {
    this.objectId = objectId;
  }

  setGroupRef(groupRef: string) {
    this.groupRef = groupRef;
  }

  setObject(object: Object) {
    this.object = object;
  }

  setIsPublic(isPublic: boolean) {
    this.isPublic = isPublic;
  }

  setVault(vault: Vault) {
    this.vault = vault;
  }

  async processWriteString(data: string): Promise<string> {
    if (this.isPublic) return data;
    const currentVaultPublicKey = this.keys[this.keys.length - 1].publicKey;
    const encryptedMessage = await encryptWithPublicKey(base64ToArray(currentVaultPublicKey), data);
    return jsonToBase64(encryptedMessage);
  }

  async setVaultContext(vaultId: string) {
    const vault = await this.api.getVault(vaultId);
    this.setVault(vault);
    this.setVaultId(vaultId);
    this.setIsPublic(vault.public);
    await this.setMembershipKeys(vault);
  }

  async setMembershipKeys(object: Object) {
    if (!this.isPublic) {
      this.setKeys(object.__keys__);
    }
  }
}

export type ServiceConfig = {
  decryptedKeys?: VaultKeyPair[];
  api?: Api,
  signer?: Signer,
  encrypter?: Encrypter,
  keys?: Array<EncryptedVaultKeyPair>
  vaultId?: string,
  objectId?: string,
  type?: ObjectType,
  action?: actions,
  isPublic?: boolean,
  vault?: Vault,
  object?: Object,
  actionRef?: string,
  groupRef?: string,
  contentType?: string,
  userAgent?: string,
  storage?: Storage,
  env?: Env
}

export type VaultOptions = {
  vaultId?: string,
  public?: boolean
}

export { Service };