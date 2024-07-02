import { functions, status } from "../constants";
import { NodeCreateOptions, NodeLike, NodeType } from '../types/node';
import { EncryptedKeys } from '@akord/crypto';
import { GetOptions, ListOptions, validateListPaginatedApiOptions } from '../types/query-options';
import { Paginated } from '../types/paginated';
import { paginate, processListItems } from './common';
import { NodeService, NodeServiceConfig} from './service/node';

class NodeModule<T> {
  protected objectType: NodeType;

  protected service: NodeService<T>;

  protected parentId?: string;

  protected defaultListOptions = {
    shouldDecrypt: true,
    parentId: undefined,
    filter: {
      status: { ne: status.REVOKED },
      and: {
        status: { ne: status.DELETED }
      }
    }
  } as ListOptions;

  protected defaultGetOptions = {
    shouldDecrypt: true,
  } as GetOptions;

  protected defaultCreateOptions = {
    parentId: undefined,
    tags: [],
    arweaveTags: [],
  } as NodeCreateOptions;

  constructor(config?: NodeServiceConfig) {
    this.service = new NodeService<T>(config);
    this.objectType = config.objectType;
  }

  /**
   * @param  {string} nodeId
   * @returns Promise with the decrypted node
   */
  public async get(nodeId: string, options: GetOptions = this.defaultGetOptions): Promise<T> {
    const getOptions = {
      ...this.defaultGetOptions,
      ...options
    }
    const nodeProto = await this.service.api.getNode<NodeLike>(nodeId, this.objectType, getOptions.vaultId);
    const node = await this.service.processNode(nodeProto, !nodeProto.__public__ && getOptions.shouldDecrypt, nodeProto.__keys__);
    return node as T;
  }

  /**
   * @param  {string} vaultId
   * @param  {ListOptions} options
   * @returns Promise with paginated nodes within given vault
   */
  public async list(vaultId: string, options: ListOptions = this.defaultListOptions = this.defaultListOptions): Promise<Paginated<T>> {
    validateListPaginatedApiOptions(options);
    const listOptions = {
      ...this.defaultListOptions,
      ...options
    }
    const response = await this.service.api.getNodesByVaultId<T>(vaultId, this.objectType, listOptions);
    const items = [];
    const errors = [];
    const processItem = async (nodeProto: any) => {
      try {
        const node = await this.service.processNode(nodeProto, !nodeProto.__public__ && listOptions.shouldDecrypt, nodeProto.__keys__);
        items.push(node);
      } catch (error) {
        errors.push({ id: nodeProto.id, error });
      };
    }
    await processListItems(response.items, processItem);
    return {
      items,
      nextToken: response.nextToken,
      errors
    }
  }

  /**
   * @param  {string} vaultId
   * @param  {ListOptions} options
   * @returns Promise with all nodes within given vault
   */
  public async listAll(vaultId: string, options: ListOptions = this.defaultListOptions): Promise<Array<T>> {
    const list = async (options: ListOptions & { vaultId: string }) => {
      return await this.list(options.vaultId, options);
    }
    return await paginate<T>(list, { ...options, vaultId });
  }

  /**
   * @param  {string} nodeId
   * @param  {string} name new name
   * @returns Promise with corresponding transaction id
   */
  public async rename(nodeId: string, name: string): Promise<{ transactionId: string, object: T }> {
    await this.service.setVaultContextFromNodeId(nodeId, this.objectType);
    this.service.setActionRef(this.objectType.toUpperCase() + "_RENAME");
    this.service.setFunction(functions.NODE_UPDATE);
    const state = {
      name: await this.service.processWriteString(name)
    };
    return this.service.nodeUpdate<T>(state);
  }

  /**
   * @param  {string} nodeId
   * @param  {string} [parentId] new parent folder id
   * @returns Promise with corresponding transaction id
   */
  public async move(nodeId: string, parentId?: string, vaultId?: string): Promise<{ transactionId: string, object: T }> {
    await this.service.setVaultContextFromNodeId(nodeId, this.objectType, vaultId);
    this.service.setActionRef(this.objectType.toUpperCase() + "_MOVE");
    this.service.setFunction(functions.NODE_MOVE);
    return this.service.nodeUpdate<T>(null, { parentId });
  }

  /**
   * @param  {string} nodeId
   * @returns Promise with corresponding transaction id
   */
  public async revoke(nodeId: string, vaultId?: string): Promise<{ transactionId: string, object: T }> {
    await this.service.setVaultContextFromNodeId(nodeId, this.objectType, vaultId);
    this.service.setActionRef(this.objectType.toUpperCase() + "_REVOKE");
    this.service.setFunction(functions.NODE_REVOKE);
    return this.service.nodeUpdate<T>();
  }

  /**
   * @param  {string} nodeId
   * @returns Promise with corresponding transaction id
   */
  public async restore(nodeId: string, vaultId?: string): Promise<{ transactionId: string, object: T }> {
    await this.service.setVaultContextFromNodeId(nodeId, this.objectType, vaultId);
    this.service.setActionRef(this.objectType.toUpperCase() + "_RESTORE");
    this.service.setFunction(functions.NODE_RESTORE);
    return this.service.nodeUpdate<T>();
  }

  /**
   * @param  {string} nodeId
   * @returns Promise with corresponding transaction id
   */
  public async delete(nodeId: string, vaultId?: string): Promise<{ transactionId: string, object: T }> {
    await this.service.setVaultContextFromNodeId(nodeId, this.objectType, vaultId);
    this.service.setActionRef(this.objectType.toUpperCase() + "_DELETE");
    this.service.setFunction(functions.NODE_DELETE);
    return this.service.nodeUpdate<T>();
  }

  protected NodeType: new (arg0: any, arg1: EncryptedKeys[]) => NodeLike
}

export {
  NodeModule
}