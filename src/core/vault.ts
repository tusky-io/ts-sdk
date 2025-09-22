import { role } from "../constants";
import { Vault, VaultCreateOptions } from "../types/vault";
import {
  ListOptions,
  ListPaginatedApiOptions,
  VaultGetOptions,
  validateListPaginatedApiOptions,
} from "../types/query-options";
import { Paginated } from "../types/paginated";
import { paginate, processListItems } from "./common";
import { MembershipService } from "./service/membership";
import { VaultService } from "./service/vault";
import { ServiceConfig } from ".";
import { arrayToBase64, generateKeyPair, jsonToBase64 } from "../crypto";
import {
  EncryptedVaultKeyPair,
  Membership,
  MembershipAirdropOptions,
  OwnerAccess,
  RoleType,
  VaultUpdateOptions,
} from "../types";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { UserEncryption } from "../crypto/user-encryption";
import * as pwd from "micro-key-producer/password.js";
import { randomBytes } from "@noble/hashes/utils";
import { BadRequest } from "../errors/bad-request";
import { MISSING_ENCRYPTION_ERROR_MESSAGE } from "../crypto/encrypter";

const DEFAULT_AIRDROP_ACCESS_ROLE = role.VIEWER;

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
    deep: false,
  } as VaultGetOptions;

  protected defaultCreateOptions = {
    encrypted: true,
    description: undefined,
  } as VaultCreateOptions;

  /**
   * @param {string} vaultId
   * @returns Promise with the decrypted vault
   */
  public async get(
    vaultId: string,
    options: VaultGetOptions = this.defaultGetOptions,
  ): Promise<Vault> {
    const getOptions = {
      ...this.defaultGetOptions,
      ...options,
    };
    const start = Date.now();
    const result = await this.service.api.getVault(vaultId, getOptions);
    const end = Date.now();
    console.log(`[time] Api call vault.get() took ${end - start} ms`);
    return this.service.processVault(
      result,
      result.encrypted && getOptions.shouldDecrypt,
      result.__keys__,
    );
  }

  /**
   * @param {ListOptions} options
   * @returns Promise with paginated user vaults
   */
  public async list(
    options: ListOptions = this.defaultListOptions,
  ): Promise<Paginated<Vault>> {
    validateListPaginatedApiOptions(options);
    const listOptions = {
      ...this.defaultListOptions,
      ...options,
    };
    const start = Date.now();
    const response = await this.service.api.getVaults(listOptions);
    const end = Date.now();
    console.log(`[time] Api call vault.list() took ${end - start} ms`);
    const items = [];
    const errors = [];
    const processVault = async (vaultProto: Vault) => {
      try {
        const node = await this.service.processVault(
          vaultProto,
          listOptions.shouldDecrypt,
          vaultProto.keys,
        );
        items.push(node);
      } catch (error) {
        errors.push({ id: vaultProto.id, error });
      }
    };
    await processListItems(response.items, processVault);
    return {
      items,
      nextToken: response.nextToken,
      errors,
    };
  }

  /**
   * @param {ListOptions} options
   * @returns Promise with currently authenticated user vaults
   */
  public async listAll(
    options: ListOptions = this.defaultListOptions,
  ): Promise<Array<Vault>> {
    const list = async (listOptions: ListOptions) => {
      return this.list(listOptions);
    };
    return paginate<Vault>(list, options);
  }

  /**
   * @param {string} name new vault name
   * @param {VaultCreateOptions} options public/private, description, tags, etc.
   * @returns {Promise<Vault>} Promise with newly created vault
   */
  public async create(
    name: string,
    options: VaultCreateOptions = this.defaultCreateOptions,
  ): Promise<Vault> {
    const createOptions = {
      ...this.defaultCreateOptions,
      ...options,
    };

    this.service.setEncrypted(
      !createOptions.whitelist && createOptions.encrypted,
    );

    const memberService = new MembershipService(this.service);
    memberService.setVaultId(this.service.vaultId);

    if (this.service.encrypted) {
      if (!this.service.encrypter) {
        throw new BadRequest(
          MISSING_ENCRYPTION_ERROR_MESSAGE +
            " or use `{ encrypted: false }` options if you want your data publicly available",
        );
      }
      const vaultKeyPair = await generateKeyPair();
      this.service.setDecryptedKeys([
        {
          publicKey: vaultKeyPair.publicKey,
          privateKey: vaultKeyPair.privateKey,
        },
      ]);
      // encrypt vault private key to user public key
      const encryptedVaultPrivateKey = await this.service.encrypter.encrypt(
        vaultKeyPair.privateKey,
      );
      const keys = [
        {
          publicKey: arrayToBase64(vaultKeyPair.publicKey),
          encPrivateKey: encryptedVaultPrivateKey,
        },
      ];
      this.service.setKeys(keys);
    }

    await this.service.setName(name);
    if (createOptions.description) {
      await this.service.setDescription(createOptions.description);
    }

    const vault = await this.service.api.createVault({
      name: this.service.name,
      description: this.service.description,
      encrypted: this.service.encrypted,
      tags: createOptions.tags,
      keys: this.service.keys,
      whitelist: createOptions.whitelist,
    });
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

    const vault = await this.service.api.updateVault({
      id: id,
      name: this.service.name,
    });
    return this.service.processVault(vault, true, this.service.keys);
  }

  /**
   * Update vault metadata: name, description, tags
   * @param id vault id
   * @param updates vault metadata updates
   * @returns Promise with vault object
   */
  public async update(id: string, updates: VaultUpdateOptions): Promise<Vault> {
    await this.service.setVaultContext(id);

    if (updates.name) {
      await this.service.setName(updates.name);
    }

    if (updates.description) {
      await this.service.setDescription(updates.description);
    }

    const vault = await this.service.api.updateVault({
      id: id,
      name: this.service.name,
      description: this.service.description,
      tags: updates.tags,
    });
    return this.service.processVault(vault, true, this.service.keys);
  }

  /**
   * Purge the vault data
   * @param id vault id
   * Puts all the vault data in the trash
   * @returns {Promise<void>}
   */
  public async purge(id: string): Promise<void> {
    return this.service.api.purgeVault(id);
  }

  /**
   * Delete the vault\
   * This action must be performed only for vault with no contents, it will fail if the vault is not empty.
   * Use vault.purge() if you would like to put all vault content in the trash
   * @param id vault id
   * @returns {Promise<void>}
   */
  public async delete(id: string): Promise<void> {
    return this.service.api.deleteVault(id);
  }

  /**
   * Airdrop access to the vault directly through public keys
   * @param {string} vaultId
   * @param {MembershipAirdropOptions} options airdrop options
   * @returns {Promsise<Membership>} Promise with new membership
   */
  public async airdropAccess(
    vaultId: string,
    options: MembershipAirdropOptions = {
      role: DEFAULT_AIRDROP_ACCESS_ROLE,
    },
  ): Promise<{
    identityPrivateKey: string;
    password: string;
    membership: Membership;
  }> {
    await this.service.setVaultContext(vaultId);

    const memberService = new MembershipService(this.service);
    memberService.setVaultId(this.service.vaultId);

    // generate member identity key pair for authentication
    const memberKeyPair = options.keypair || new Ed25519Keypair();

    let keys: EncryptedVaultKeyPair[];
    let userEncPrivateKey: string;
    let password: string;
    let ownerAccessJson = {
      identityPrivateKey: memberKeyPair?.getSecretKey(),
    } as OwnerAccess;
    let ownerAccess: string;

    if (this.service.encrypted) {
      if (options.password) {
        password = options.password;
      } else {
        // generate password & add it for owner access
        password = generateRandomPassword();
        ownerAccessJson.password = password;
      }
      if (!this.service.encrypter) {
        throw new BadRequest(MISSING_ENCRYPTION_ERROR_MESSAGE);
      }
      // encrypt owner access
      ownerAccess = await this.service.encrypter.encrypt(
        jsonToBase64(ownerAccessJson),
      );

      const { encPrivateKey, keypair } =
        await new UserEncryption().setupPassword(password, false);
      userEncPrivateKey = encPrivateKey;
      keys = await memberService.prepareMemberKeys(
        arrayToBase64(keypair.publicKey),
      );
    } else {
      ownerAccess = jsonToBase64(ownerAccessJson);
    }

    const membership = await this.service.api.createMembership({
      vaultId: vaultId,
      address: options.address || memberKeyPair.toSuiAddress(),
      allowedStorage: options.allowedStorage,
      allowedPaths: options.allowedPaths,
      expiresAt: options.expiresAt,
      name: options.name,
      role: options.role || DEFAULT_AIRDROP_ACCESS_ROLE,
      keys: keys,
      encPrivateKey: userEncPrivateKey,
      ownerAccess: ownerAccess,
    });

    const me = await this.service.api.getMe();
    return {
      identityPrivateKey: memberKeyPair?.getSecretKey(),
      password: password,
      membership: await memberService.processMembership(
        membership,
        this.service.vault.owner === me.address,
      ),
    };
  }

  /**
   * Revoke member access\
   * If private vault, vault keys will be rotated & distributed to all valid members
   * @param  {string} id membership id
   * @returns {Promise<void>}
   */
  public async revokeAccess(id: string): Promise<void> {
    const memberService = new MembershipService(this.service);
    await memberService.setVaultContextFromMembershipId(id);

    // TODO: rotate member keys
    // let keys: Map<string, EncryptedVaultKeyPair[]>;
    // if (!this.service.isPublic) {
    //   const memberships = await this.members(this.service.vaultId);

    //   const activeMembers = memberships.filter((member: Membership) =>
    //     member.id !== id // filter out the member being revoked
    //     && (member.status === membershipStatus.ACCEPTED || member.status === membershipStatus.PENDING));

    //     console.log(activeMembers)
    //   // rotate keys for all active members
    //   const memberPublicKeys = new Map<string, string>();
    //   await Promise.all(activeMembers.map(async (member: Membership) => {
    //     const { publicKey } = await this.service.api.getUserPublicData(member.email);
    //     memberPublicKeys.set(member.id, publicKey);
    //   }));
    //   const { memberKeys } = await memberService.rotateMemberKeys(memberPublicKeys);
    //   keys = memberKeys;
    // }

    await this.service.api.deleteMembership({
      id: id,
      // keys: keys
    });
  }

  /**
   * Join vault
   * @param  {string} id vault id
   * @returns {Promise<void>}
   */
  public async join(id: string): Promise<Membership> {
    return this.service.api.joinVault({ vaultId: id });
  }

  /**
   * @param  {string} id membership id
   * @param  {RoleType} role VIEWER/CONTRIBUTOR/OWNER
   * @returns {Promise<Membership>}
   */
  public async changeAccess(id: string, role: RoleType): Promise<Membership> {
    const membership = await this.service.api.updateMembership({
      id: id,
      role: role,
    });
    return new Membership(membership);
  }

  /**
   * Retrieve vault members
   * @param  {string} vaultId
   * @returns {Promise<Paginated<Membership>>}
   */
  public async members(
    vaultId: string,
    options: ListPaginatedApiOptions = {},
  ): Promise<Paginated<Membership>> {
    const paginated = await this.service.api.getMembers({
      vaultId: vaultId,
      ...options,
    });
    await this.service.setVaultContext(vaultId);
    const memberService = new MembershipService(this.service);
    const me = await this.service.api.getMe();
    return {
      items: await Promise.all(
        paginated.items?.map(async (member) =>
          memberService.processMembership(
            member,
            this.service.vault.owner === me.address,
          ),
        ),
      ),
      nextToken: paginated.nextToken,
      errors: paginated.errors,
    };
  }

  /**
   * Retrieve all vault members
   * @param  {string} vaultId
   * @returns {Promise<Array<Membership>>}
   */
  public async membersAll(vaultId: string): Promise<Array<Membership>> {
    const list = async (listOptions: ListOptions) => {
      return this.service.api.getMembers(listOptions);
    };
    const members = await paginate<Membership>(list, {
      vaultId: vaultId,
    });
    await this.service.setVaultContext(vaultId);
    const memberService = new MembershipService(this.service);
    const me = await this.service.api.getMe();
    return Promise.all(
      members?.map(async (member: Membership) =>
        memberService.processMembership(
          member,
          this.service.vault.owner === me.address,
        ),
      ),
    );
  }
}

function generateRandomPassword() {
  const seed = randomBytes(32);
  return pwd.secureMask.apply(seed).password;
}

export { VaultModule };
