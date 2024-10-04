import { membershipStatus, role, status } from "../constants";
import { Vault, VaultCreateOptions } from "../types/vault";
import { ListOptions, VaultGetOptions, validateListPaginatedApiOptions } from "../types/query-options";
import { Paginated } from "../types/paginated";
import { paginate, processListItems } from "./common";
import { MembershipService } from "./service/membership";
import { VaultService } from "./service/vault";
import { ServiceConfig } from ".";
import { arrayToBase64, generateKeyPair } from "../crypto";
import { EncryptedVaultKeyPair, Membership, MembershipAirdropOptions, RoleType } from "../types";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Encrypter } from "../crypto/encrypter";
import { UserEncryption } from "../crypto/user-encryption";

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

    if (!this.service.isPublic) {
      const vaultKeyPair = await generateKeyPair();
      this.service.setDecryptedKeys([{
        publicKey: vaultKeyPair.publicKey,
        privateKey: vaultKeyPair.privateKey
      }]);
      // encrypt vault private key to user public key
      const encryptedVaultPrivateKey = await this.service.encrypter.encrypt(vaultKeyPair.privateKey)
      const keys = [{
        publicKey: arrayToBase64(vaultKeyPair.publicKey),
        encPrivateKey: encryptedVaultPrivateKey
      }];
      this.service.setKeys(keys);
    }

    await this.service.setName(name);
    if (createOptions.description) {
      await this.service.setDescription(createOptions.description);
    }

    const vault = await this.service.api.createVault({ name: this.service.name, description: this.service.description, public: this.service.isPublic, keys: this.service.keys });

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

  /**
   * Airdrop access to the vault directly through public keys
   * @param  {string} vaultId
   * @param  {MembershipAirdropOptions} options airdrop options
   * @returns Promise with new membership
   */
  public async airdropAccess(vaultId: string, options: MembershipAirdropOptions = {
    role: role.CONTRIBUTOR
  }): Promise<{ identityPrivateKey: string, password: string, membership: Membership }> {
    await this.service.setVaultContext(vaultId);

    const memberService = new MembershipService(this.service);
    memberService.setVaultId(this.service.vaultId);

    // generate member identity key pair for authentication
    const memberKeyPair = new Ed25519Keypair();

    let keys: EncryptedVaultKeyPair[];
    let userEncPrivateKey: string;
    let password: string;
    if (!this.service.isPublic) {
      password = options.password ? options.password : generateRandomPassword(16);
      const { encPrivateKey, keyPair } = await new UserEncryption().setupPassword(password, false);
      userEncPrivateKey = encPrivateKey;
      memberService.encrypter = new Encrypter({ keypair: keyPair });
      keys = await memberService.prepareMemberKeys(keyPair.getPublicKeyHex());
    }

    const membership = await this.service.api.createMembership({
      vaultId: vaultId,
      address: memberKeyPair.toSuiAddress(),
      allowedStorage: options.allowedStorage,
      contextPath: options.contextPath,
      expiresAt: options.expiresAt,
      role: options.role || role.CONTRIBUTOR,
      keys: keys,
      encPrivateKey: userEncPrivateKey
    });

    return {
      identityPrivateKey: memberKeyPair.getSecretKey(),
      password: password,
      membership: membership
    }
  }


  /**
   * Revoke member access
   * If private vault, vault keys will be rotated & distributed to all valid members
   * @param  {string} id membership id
   * @returns Promise with the updated membership
   */
  public async revokeAccess(id: string): Promise<Membership> {
    const memberService = new MembershipService(this.service);
    await memberService.setVaultContextFromMembershipId(id);

    let keys: Map<string, EncryptedVaultKeyPair[]>;
    if (!this.service.isPublic) {
      const memberships = await (<any>memberService).listAll({ vaultId: this.service.vaultId, shouldDecrypt: false });

      const activeMembers = memberships.filter((member: Membership) =>
        member.id !== this.service.objectId
        && (member.status === membershipStatus.ACCEPTED || member.status === membershipStatus.PENDING));

      // rotate keys for all active members
      const memberPublicKeys = new Map<string, string>();
      await Promise.all(activeMembers.map(async (member: Membership) => {
        const { publicKey } = await this.service.api.getUserPublicData(member.email);
        memberPublicKeys.set(member.id, publicKey);
      }));
      const { memberKeys } = await memberService.rotateMemberKeys(memberPublicKeys);
      keys = memberKeys;
    }

    const membership = await this.service.api.updateMembership({
      id: id,
      status: membershipStatus.REVOKED,
      keys: keys
    });
    return new Membership(membership);
  }

  /**
   * @param  {string} id membership id
   * @param  {RoleType} role VIEWER/CONTRIBUTOR/OWNER
   * @returns Promise with corresponding transaction id
   */
  public async changeAccess(id: string, role: RoleType): Promise<Membership> {
    const membership = await this.service.api.updateMembership({
      id: id,
      role: role
    });
    return new Membership(membership);
  }


};

function generateRandomPassword(length: number) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
  const password = Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map(value => charset[value % charset.length])
    .join('');

  return password;
}

export {
  VaultModule
}