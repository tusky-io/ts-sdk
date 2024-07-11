import { Service } from './service';
import { functions, protocolTags, status } from "../../constants";
import { Object, ObjectType } from "../../types/object";
import { EncryptedKeys, Encrypter } from '@akord/crypto';
import { GetOptions, ListOptions } from '../../types/query-options';
import { ContractInput, Tag, Tags } from '../../types/contract';
import { v4 as uuidv4 } from "uuid";
import { IncorrectEncryptionKey } from '../../errors/incorrect-encryption-key';
import { BadRequest } from '../../errors/bad-request';
import { Folder } from '../../types/folder';
import { Api } from '../../api/api';
import { File, Vault } from '../../types';
import { Signer } from '../../signer';

class NodeService<T> extends Service {
  type: ObjectType;

  defaultListOptions = {
    shouldDecrypt: true,
    parentId: undefined,
    filter: {
      status: { ne: status.DELETED }
    }
  } as ListOptions;

  protected defaultGetOptions = {
    shouldDecrypt: true,
  } as GetOptions;

  defaultCreateOptions = {
    parentId: undefined,
    tags: [],
    txTags: [],
  } as NodeCreateOptions;

  constructor(config?: NodeServiceConfig) {
    super(config);
    this.type = config.type;
    this.NodeType = config.nodeType;
  }

  async nodeCreate<T>(state?: any, clientInput?: { parentId?: string }, clientTags?: Tags, file?: any): Promise<{
    nodeId: string,
    transactionId: string,
    object: T
  }> {
    const nodeId = uuidv4();
    this.setObjectId(nodeId);
    this.setParentId(clientInput.parentId ? clientInput.parentId : this.vaultId);

    this.txTags = await this.getTxTags();
    clientTags?.map((tag: Tag) => this.txTags.push(tag));

    const input = {
      function: this.function,
      ...clientInput
    } as ContractInput;

    const { id, object } = await this.api.postContractTransaction<T>(
      this.vaultId,
      input,
      this.txTags,
      state,
      file
    );
    const node = await this.processNode(object as any, !this.isPublic, this.keys) as any;
    return { nodeId, transactionId: id, object: node };
  }

  async nodeUpdate<T>(stateUpdates?: any, clientInput?: { parentId?: string }, metadata?: any): Promise<{ transactionId: string, object: T }> {
    const input = {
      function: this.function,
      ...clientInput
    } as ContractInput;

    this.setParentId(clientInput?.parentId);
    this.txTags = await this.getTxTags();

    const { id, object } = await this.api.postContractTransaction<T>(
      this.vaultId,
      input,
      this.txTags,
      stateUpdates,
      undefined,
      false,
      metadata
    );
    const node = await this.processNode(object as any, !this.isPublic, this.keys) as any;
    return { transactionId: id, object: node };
  }

  setParentId(parentId?: string) {
    this.parentId = parentId;
  }

  async setVaultContextFromNodeId(nodeId: string, type: ObjectType, vaultId?: string) {
    const object = await this.api.getNode<File | Folder>(nodeId, type, vaultId);
    const vault = await this.api.getVault(object.vaultId);
    this.setVault(vault);
    this.setVaultId(object.vaultId);
    this.setIsPublic(object.__public__);
    await this.setMembershipKeys(object);
    this.setObject(object);
    this.setObjectId(nodeId);
    this.setType(type);
  }

  async getTxTags(): Promise<Tags> {
    const tags = await super.getTxTags();
    tags.push(new Tag(protocolTags.NODE_ID, this.objectId))
    tags.push(new Tag(protocolTags.PARENT_ID, this.parentId ? this.parentId : this.vaultId ));
    return tags;
  }

  async processNode(object: File | Folder, shouldDecrypt: boolean, keys?: EncryptedKeys[]): Promise<T> {
    const node = this.nodeInstance(object, keys);
    if (shouldDecrypt) {
      try {
        await node.decrypt();
      } catch (error) {
        throw new IncorrectEncryptionKey(error);
      }
    }
    return node as T;
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

  NodeType: new (arg0: any, arg1: EncryptedKeys[]) => File | Folder

  private nodeInstance(nodeProto: any, keys: Array<EncryptedKeys>): File | Folder {
    if (this.type === "Folder") {
      return new Folder(nodeProto, keys);
    } else if (this.type === "File") {
      return new File(nodeProto, keys);
    } else {
      throw new BadRequest("Given type is not supported: " + this.type);
    }
  }
}

export type VaultOptions = {
  vaultId?: string,
  cloud?: boolean,
  public?: boolean
}

export type NodeCreateOptions = {
  parentId?: string,
  tags?: string[],
  txTags?: Tags
}

export type NodeServiceConfig = {
  api?: Api,
  signer?: Signer,
  encrypter?: Encrypter,
  keys?: Array<EncryptedKeys>
  vaultId?: string,
  objectId?: string,
  type?: ObjectType,
  nodeType?: new (arg0: any, arg1: EncryptedKeys[]) => File | Folder,
  function?: functions,
  isPublic?: boolean,
  vault?: Vault,
  object?: Object,
  actionRef?: string,
  groupRef?: string,
  tags?: string[], // akord tags for easier search
  contentType?: string
}

export {
  NodeService
}