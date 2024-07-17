import { actions, membershipStatus } from "../constants";
import { v4 as uuidv4 } from "uuid";
import { EncryptedKeys } from "@akord/crypto";
import { Vault, VaultCreateOptions } from "../types/vault";
import { ListOptions, VaultGetOptions, validateListPaginatedApiOptions } from "../types/query-options";
import { Paginated } from "../types/paginated";
import { paginate, processListItems } from "./common";
import { MembershipService } from "./service/membership";
import { VaultService } from "./service/vault";
import { ServiceConfig } from ".";

class VaultModule {
  protected service: VaultService;

  constructor(config?: ServiceConfig) {
    this.service = new VaultService(config);
  }

  protected defaultListOptions = {
    shouldDecrypt: true,
    filter: { status: { eq: membershipStatus.ACCEPTED } }
  } as ListOptions;

  protected defaultGetOptions = {
    shouldDecrypt: true,
    deep: false
  } as VaultGetOptions;

  protected defaultCreateOptions = {
    public: false,
    termsOfAccess: undefined,
    description: undefined,
  } as VaultCreateOptions;

  /**
   * @param  {string} vaultId
   * @returns Promise with the decrypted vault
   */
  public async get(vaultId: string, options: VaultGetOptions = this.defaultGetOptions): Promise<Vault> {
    const getOptions = {
      ...this.defaultGetOptions,
      ...options
    }
    const result = await this.service.api.getVault(vaultId, getOptions);
    return await this.service.processVault(result, !result.public && getOptions.shouldDecrypt, result.__keys__);
  }

  /**
   * @param  {ListOptions} options
   * @returns Promise with paginated user vaults
   */
  public async list(options: ListOptions = this.defaultListOptions): Promise<Paginated<Vault>> {
    validateListPaginatedApiOptions(options);
    const listOptions = {
      ...this.defaultListOptions,
      ...options
    }
    const response = await this.service.api.getVaults(listOptions);
    const items = [];
    const errors = [];
    const processVault = async (vaultProto: Vault) => {
      try {
        const node = await this.service.processVault(vaultProto, listOptions.shouldDecrypt, vaultProto.keys);
        items.push(node);
      } catch (error) {
        errors.push({ id: vaultProto.id, error });
      };
    }
    await processListItems(response.items, processVault);
    return {
      items,
      nextToken: response.nextToken,
      errors
    }
  }

  /**
   * @param  {ListOptions} options
   * @returns Promise with currently authenticated user vaults
   */
  public async listAll(options: ListOptions = this.defaultListOptions): Promise<Array<Vault>> {
    const list = async (listOptions: ListOptions) => {
      return await this.list(listOptions);
    }
    return await paginate<Vault>(list, options);
  }

  /**
   * @param  {string} name new vault name
   * @param  {VaultCreateOptions} options public/private, terms of access, etc.
   * @returns Promise with newly created vault
   */
  public async create(name: string, options: VaultCreateOptions = this.defaultCreateOptions): Promise<Vault> {
    const createOptions = {
      ...this.defaultCreateOptions,
      ...options
    }
    const vaultId = uuidv4();

    this.service.setAction(actions.VAULT_CREATE);
    this.service.setIsPublic(createOptions.public);
    this.service.setVaultId(vaultId);
    this.service.setObjectId(vaultId);

    const address = await this.service.signer.getAddress();
    const membershipId = uuidv4();

    this.service.setMembershipId(membershipId);

    const memberService = new MembershipService(this.service);
    memberService.setVaultId(this.service.vaultId);
    memberService.setObjectId(membershipId);

    let keys: EncryptedKeys[];
    if (!this.service.isPublic) {
      const { memberKeys, keyPair } = await memberService.rotateMemberKeys(
        new Map([[membershipId, this.service.encrypter.wallet.publicKey()]])
      );
      keys = memberKeys.get(membershipId);
      this.service.setRawDataEncryptionPublicKey(keyPair.publicKey);
      this.service.setKeys([{ encPublicKey: keys[0].encPublicKey, encPrivateKey: keys[0].encPrivateKey }]);
      memberService.setRawDataEncryptionPublicKey(keyPair.publicKey);
      memberService.setKeys([{ encPublicKey: keys[0].encPublicKey, encPrivateKey: keys[0].encPrivateKey }]);
    }

    this.service.setName(name);
    this.service.setDescription(createOptions.description);

    const memberState = {
      keys,
      encPublicSigningKey: await memberService.processWriteString(await this.service.signer.signingPublicKey())
    }

    const tx = await this.service.formatTransaction();

    const object = await this.service.api.postContractTransaction<Vault>(tx);
    const vault = await this.service.processVault(object, true, this.service.keys);
    return vault;
  }

  /**
   * @param vaultId
   * @param name new vault name
   * @returns Promise with vault object
   */
  public async rename(vaultId: string, name: string): Promise<Vault> {
    await this.service.setVaultContext(vaultId);
    this.service.setAction(actions.VAULT_UPDATE);
    this.service.setName(name);

    const tx = await this.service.formatTransaction();

    const object = await this.service.api.postContractTransaction<Vault>(tx);
    const vault = await this.service.processVault(object, true, this.service.keys);
    return vault;
  }

  /**
   * The vault will be moved to the trash. All vault data will be permanently deleted within 30 days.
   * To undo this action, call vault.restore() within the 30-day period.
   * @param  {string} vaultId
   * @returns Promise with the updated vault
   */
  public async delete(vaultId: string): Promise<Vault> {
    await this.service.setVaultContext(vaultId);
    this.service.setAction(actions.VAULT_DELETE);

    const tx = await this.service.formatTransaction();

    const object = await this.service.api.postContractTransaction<Vault>(tx);
    const vault = await this.service.processVault(object, true, this.service.keys);
    return vault;
  }

  /**
   * Restores the vault from the trash, recovering all vault data.
   * This action must be performed within 30 days of the vault being moved to the trash to prevent permanent deletion.
   * @param  {string} vaultId
   * @returns Promise with the updated vault
   */
  public async restore(vaultId: string): Promise<Vault> {
    await this.service.setVaultContext(vaultId);
    this.service.setAction(actions.VAULT_RESTORE);

    const tx = await this.service.formatTransaction();

    const object = await this.service.api.postContractTransaction<Vault>(tx);
    const vault = await this.service.processVault(object, true, this.service.keys);
    return vault;
  }
};

export {
  VaultModule
}