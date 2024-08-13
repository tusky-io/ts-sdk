import { membershipStatus, status } from "../constants";
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
  } as ListOptions;

  protected defaultGetOptions = {
    shouldDecrypt: true,
    deep: false
  } as VaultGetOptions;

  protected defaultCreateOptions = {
    public: false,
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
    return this.service.processVault(result, !result.public && getOptions.shouldDecrypt, result.__keys__);
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
      return this.list(listOptions);
    }
    return paginate<Vault>(list, options);
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

    this.service.setIsPublic(createOptions.public);

    const memberService = new MembershipService(this.service);
    memberService.setVaultId(this.service.vaultId);

    let keys: EncryptedKeys[];
    if (!this.service.isPublic) {
      const { memberKeys, keyPair } = await memberService.rotateMemberKeys(
        new Map([["member", this.service.encrypter.wallet.publicKey()]])
      );
      // TODO: send encrypted keys
      const keys = memberKeys.get("member");
      this.service.setRawDataEncryptionPublicKey(keyPair.publicKey);
      this.service.setKeys([{ encPublicKey: keys[0].encPublicKey, encPrivateKey: keys[0].encPrivateKey }]);
      memberService.setRawDataEncryptionPublicKey(keyPair.publicKey);
      memberService.setKeys([{ encPublicKey: keys[0].encPublicKey, encPrivateKey: keys[0].encPrivateKey }]);
    }

    await this.service.setName(name);
    await this.service.setDescription(createOptions.description);

    const vault = await this.service.api.createVault({ name: this.service.name, description: this.service.description, public: this.service.isPublic });

    // if (!this.service.api.autoExecute) {
    //   const signature = await this.service.signer.sign(bytes);
    //   await this.service.api.postTransaction(digest, signature);
    // }
    return this.service.processVault(vault, true, this.service.keys);
  }

  /**
   * @param id vault id
   * @param name new vault name
   * @returns Promise with vault object
   */
  public async rename(id: string, name: string): Promise<Vault> {
    await this.service.setVaultContext(id);
    await this.service.setName(name);

    const vault = await this.service.api.updateVault({ id: id, name: this.service.name });
    return this.service.processVault(vault, true, this.service.keys);
  }

  /**
   * The vault will be moved to the trash. All vault data will be permanently deleted within 30 days.
   * To undo this action, call vault.restore() within the 30-day period.
   * @param id vault id
   * @returns Promise with the updated vault
   */
  public async delete(id: string): Promise<Vault> {
    const vault = await this.service.api.updateVault({ id: id, status: status.DELETED });
    return this.service.processVault(vault, true, this.service.keys);
  }

  /**
   * Restores the vault from the trash, recovering all vault data.
   * This action must be performed within 30 days of the vault being moved to the trash to prevent permanent deletion.
   * @param  {string} id
   * @returns Promise with the updated vault
   */
  public async restore(id: string): Promise<Vault> {
    const vault = await this.service.api.updateVault({ id: id, status: status.ACTIVE });
    return this.service.processVault(vault, true, this.service.keys);
  }

  /**
   * The vault and all its contents will be permanently deleted.
   * This action is irrevocable and can only be performed if the vault is already in trash.
   * @param  {string} id vault id
   * @returns {Promise<void>}
   */
  public async deletePermanently(id: string): Promise<void> {
    return this.service.api.deleteVault(id);
  }
};

export {
  VaultModule
}