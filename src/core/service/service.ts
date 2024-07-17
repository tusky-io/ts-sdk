import { Api } from "../../api/api";
import {
  Encrypter,
  jsonToBase64,
  base64ToArray,
  arrayToString,
  stringToArray,
  arrayToBase64,
  base64ToJson,
  deriveAddress,
  EncryptedKeys
} from "@akord/crypto";
import { actions } from '../../constants';
import { Vault } from "../../types/vault";
import { Object, ObjectType } from "../../types/object";
import { EncryptOptions, EncryptedPayload } from "@akord/crypto/lib/types";
import { IncorrectEncryptionKey } from "../../errors/incorrect-encryption-key";
import { getEncryptedPayload } from "../common";
import { EncryptionMetadata } from "../../types/encryption";
import { Signer } from "../../signer";
import { TxPayload, TxPayloads } from "../../types";

export const STATE_CONTENT_TYPE = "application/json";

class Service {
  api: Api

  signer: Signer
  encrypter: Encrypter

  keys: Array<EncryptedKeys>

  vaultId: string
  parentId: string
  objectId: string
  type: ObjectType
  isPublic: boolean
  vault: Vault
  object: Object
  groupRef: string

  action: actions
  userAgent: string // client name

  constructor(config: ServiceConfig) {
    this.signer = config.signer;
    this.api = config.api;
    this.encrypter = new Encrypter(config.encrypter?.wallet, config.encrypter?.keys, config.encrypter?.publicKey);
    // set context from config / another service
    this.vault = config.vault;
    this.vaultId = config.vaultId;
    this.keys = config.keys;
    this.action = config.action;
    this.objectId = config.objectId;
    this.isPublic = config.isPublic;
    this.type = config.type;
    this.object = config.object;
    this.groupRef = config.groupRef;
    this.userAgent = config.userAgent;
  }

  setKeys(keys: EncryptedKeys[]) {
    this.keys = keys;
    this.encrypter.setKeys(keys);
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

  setType(type: ObjectType) {
    this.type = type;
  }

  setAction(action: actions) {
    this.action = action;
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

  setRawDataEncryptionPublicKey(publicKey: Uint8Array) {
    this.encrypter.setRawPublicKey(publicKey);
  }

  // async validateOrCreateDefaultVault(options: VaultOptions = {}): Promise<string> {
  //   let vaultId: string;
  //   if (options.vaultId) {
  //     const vault = await this.api.getVault(options.vaultId);
  //     if (vault.cloud && !options.cloud) {
  //       throw new BadRequest("Context mismatch. Cloud option colliding with vault provided in the vault id option.")
  //     }
  //     vaultId = options.vaultId;
  //   } else {
  //     if (!options.public) {
  //       // const { items: defaultVaults } = await this.service.api.getVaults({ default: true });
  //       const defaultVaults = [];
  //       if (options.cloud) {
  //         const defaultPrivateCloudVault = defaultVaults.find((vault) => vault.private && vault.cloud);
  //         vaultId = defaultPrivateCloudVault?.id;
  //       } else {
  //         const defaultPrivatePermaVault = defaultVaults.find((vault) => vault.private && !vault.cloud);
  //         vaultId = defaultPrivatePermaVault?.id;
  //       }
  //       if (!vaultId) {
  //         Logger.log("Creating vault...")
  //         const vaultModule = new VaultModule(this);
  //         const vaultResult = await vaultModule.create(options.cloud ? DefaultVaults.DEFAULT_PRIVATE_CLOUD : DefaultVaults.DEFAULT_PRIVATE_PERMA, { public: false, cloud: options.cloud })
  //         console.log(vaultResult.object)
  //         vaultId = vaultResult.vaultId;
  //       }
  //     }
  //   }
  //   return vaultId;
  // }

  async processWriteString(data: string): Promise<string> {
    if (this.isPublic) return data;
    let encryptedPayload: string;
    try {
      encryptedPayload = await this.encrypter.encryptRaw(stringToArray(data)) as string;
    } catch (error) {
      throw new IncorrectEncryptionKey(error);
    }
    const decodedPayload = base64ToJson(encryptedPayload) as any;
    decodedPayload.publicAddress = (await this.getActiveKey()).address;
    delete decodedPayload.publicKey;
    return jsonToBase64(decodedPayload);
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
      const keys = object.__keys__.map(((keyPair: any) => {
        return {
          encPrivateKey: keyPair.encPrivateKey,
          encPublicKey: keyPair.publicKey ? keyPair.publicKey : keyPair.encPublicKey
        }
      }))
      this.setKeys(keys);
      try {
        if (object.__publicKey__) {
          this.setRawDataEncryptionPublicKey(base64ToArray(object.__publicKey__));
        } else {
          const currentEncPublicKey = object.__keys__[object.__keys__.length - 1].encPublicKey;
          const publicKey = await this.encrypter.wallet.decrypt(currentEncPublicKey);
          this.setRawDataEncryptionPublicKey(publicKey);
        }
      } catch (error) {
        throw new IncorrectEncryptionKey(error);
      }
    }
  }

  isCloud() {
    return this.vault.cloud;
  }

  async formatTransaction(): Promise<TxPayloads> {
    const tx = {
      action: this.action,
      owner: await this.signer.getAddress(),
      vaultId: this.vaultId,
      timestamp: JSON.stringify(Date.now()),
      type: this.type,
      public: this.isPublic,
      objectId: this.objectId,
      parentId: this.parentId ? this.parentId : this.vaultId,
    } as TxPayload;

    if (this.groupRef) {
      tx.groupId = this.groupRef;
    }
    if (this.userAgent) {
      tx.userAgent = this.userAgent;
    }
    return tx;
  }

  async processWriteRaw(data: ArrayBuffer, options?: EncryptOptions) {
    let processedData: ArrayBuffer;
    const encryptionMetadata = {} as EncryptionMetadata;
    if (this.isPublic) {
      processedData = data;
    } else {
      let encryptedFile: EncryptedPayload;
      try {
        encryptedFile = await this.encrypter.encryptRaw(new Uint8Array(data), options) as EncryptedPayload;
      } catch (error) {
        throw new IncorrectEncryptionKey(error);
      }
      processedData = encryptedFile.encryptedData.ciphertext as ArrayBuffer;
      encryptionMetadata.iv = arrayToBase64(encryptedFile.encryptedData.iv);
      encryptionMetadata.encryptedKey = encryptedFile.encryptedKey
    }
    return { processedData, encryptionMetadata }
  }

  async processReadRaw(data: ArrayBuffer | string, metadata: EncryptionMetadata, shouldDecrypt = true): Promise<ArrayBuffer> {
    if (this.isPublic || !shouldDecrypt) {
      return data as ArrayBuffer;
    }

    const encryptedPayload = getEncryptedPayload(data, metadata);
    try {
      if (encryptedPayload) {
        return this.encrypter.decryptRaw(encryptedPayload, false);
      } else {
        return this.encrypter.decryptRaw(data as string);
      }
    } catch (error) {
      throw new IncorrectEncryptionKey(error);
    }
  }

  async nodeUpdate<T>(stateUpdates?: any, clientInput?: { parentId?: string }, metadata?: any): Promise<T> {
    this.setParentId(clientInput?.parentId);

    const tx = await this.formatTransaction();
    const object = await this.api.postContractTransaction<T>(tx);
    return object;
  }

  async processReadString(data: string, shouldDecrypt = true): Promise<string> {
    if (this.isPublic || !shouldDecrypt) return data;
    const decryptedDataRaw = await this.processReadRaw(data, {});
    return arrayToString(decryptedDataRaw);
  }

  protected async getActiveKey() {
    return {
      address: await deriveAddress(this.encrypter.publicKey),
      publicKey: arrayToBase64(this.encrypter.publicKey)
    };
  }

  private async signData(data: any): Promise<string> {
    const signature = await this.signer.sign(jsonToBase64(data));
    return signature;
  }
}

export type ServiceConfig = {
  api?: Api,
  signer?: Signer,
  encrypter?: Encrypter,
  keys?: Array<EncryptedKeys>
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
  userAgent?: string
}

export type VaultOptions = {
  vaultId?: string,
  cloud?: boolean,
  public?: boolean
}

export { Service };