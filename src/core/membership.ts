import { actions, membershipStatus } from "../constants";
import { Membership, MembershipAirdropOptions, RoleType } from "../types/membership";
import { GetOptions, ListOptions, validateListPaginatedApiOptions } from "../types/query-options";
import { ServiceConfig } from "./service/service";
import { Paginated } from "../types/paginated";
import { paginate } from "./common";
import { MembershipService } from "./service/membership";
import { BadRequest } from "../errors/bad-request";

// NOTE: membership flow not working currently

// TODO: move membership flow to vault module

export const DEFAULT_ROLE = "CONTRIBUTOR";

class MembershipModule {
  protected service: MembershipService;

  constructor(config?: ServiceConfig) {
    this.service = new MembershipService(config);
  }

  protected defaultListOptions = {
    shouldDecrypt: true
  } as ListOptions;

  protected defaultGetOptions = {
    shouldDecrypt: true,
  } as GetOptions;

  /**
   * @param  {string} id member id
   * @returns Promise with the decrypted membership
   */
  public async get(id: string, options: GetOptions = this.defaultGetOptions): Promise<Membership> {
    const getOptions = {
      ...this.defaultGetOptions,
      ...options
    }
    const membershipProto = await this.service.api.getMembership(id);
    return new Membership(membershipProto, membershipProto.__keys__);
  }

  /**
   * @param  {string} vaultId
   * @param  {ListOptions} options
   * @returns Promise with paginated memberships within given vault
   */
  public async list(vaultId: string, options: ListOptions = this.defaultListOptions): Promise<Paginated<Membership>> {
    validateListPaginatedApiOptions(options);
    const listOptions = {
      ...this.defaultListOptions,
      ...options
    }
    const { items, nextToken } = await this.service.api.getMembershipsByVaultId(vaultId, listOptions);
    return {
      items: items.map((memProto: Membership) => new Membership(memProto)),
      nextToken: nextToken
    }
  }

  /**
   * @param  {string} vaultId
   * @param  {ListOptions} options
   * @returns Promise with all memberships within given vault
   */
  public async listAll(vaultId: string, options: ListOptions = this.defaultListOptions): Promise<Array<Membership>> {
    const list = async (options: ListOptions & { vaultId: string }) => {
      return this.list(options.vaultId, options);
    }
    return paginate<Membership>(list, { ...options, vaultId });
  }

  /**
   * Airdrop access to the vault directly through public keys
   * @param  {string} vaultId
   * @param  {string} address member address
   * @param  {MembershipAirdropOptions} options airdrop options
   * @returns Promise with new membership
   */
  public async airdrop(vaultId: string, address: string, options: MembershipAirdropOptions = {
    role: "CONTRIBUOTR"
  }): Promise<Membership> {
    await this.service.setVaultContext(vaultId);

    if (!this.service.isPublic) {
      if (!options?.publicKey) {
        throw new BadRequest("Missing member public key for encryption context.");
      }
      // TODO: send encrypted keys
      const keys = await this.service.prepareMemberKeys(options?.publicKey);
    }

    const { membership } = await this.service.api.createMembership({
      vaultId: vaultId,
      address: address,
      expiresAt: options.expiresAt,
      role: options.role || DEFAULT_ROLE
    });
    return new Membership(membership);
  }

  /**
   * Leave the vault by the currently authenticated user
   * @param  {string} id membership id
   * @returns Promise with corresponding transaction id
   */
  public async leave(id: string): Promise<Membership> {
    const { membership } = await this.service.api.updateMembership({
      id: id,
      status: membershipStatus.REJECTED
    });
    return new Membership(membership);
  }

  /**
   * Revoke member access
   * If private vault, vault keys will be rotated & distributed to all valid members
   * @param  {string} id membership id
   * @returns Promise with the updated membership
   */
  public async revoke(id: string): Promise<Membership> {
    await this.service.setVaultContextFromMembershipId(id);

    let data: { id: string, value: any }[];
    if (!this.service.isPublic) {
      const memberships = await this.listAll(this.service.vaultId, { shouldDecrypt: false });

      const activeMembers = memberships.filter((member: Membership) =>
        member.id !== this.service.objectId
        && (member.status === membershipStatus.ACCEPTED || member.status === membershipStatus.PENDING));

      // rotate keys for all active members
      const memberPublicKeys = new Map<string, string>();
      await Promise.all(activeMembers.map(async (member: Membership) => {
        const { publicKey } = await this.service.api.getUserPublicData(member.email);
        memberPublicKeys.set(member.id, publicKey);
      }));
      const { memberKeys } = await this.service.rotateMemberKeys(memberPublicKeys);

      // upload new state for all active members
      data = [];
      await Promise.all(activeMembers.map(async (member: Membership) => {
        const memberService = new MembershipService(this.service);
        memberService.setVaultId(this.service.vaultId);
        memberService.setObjectId(member.id);
        memberService.setObject(member);
        data.push({ id: member.id, value: { keys: memberKeys.get(member.id) } });
      }));
    }

    const { membership } = await this.service.api.updateMembership({
      id: id,
      status: membershipStatus.REVOKED
    });
    return new Membership(membership);
  }

  /**
   * @param  {string} id membership id
   * @param  {RoleType} role VIEWER/CONTRIBUTOR/OWNER
   * @returns Promise with corresponding transaction id
   */
  public async changeAccess(id: string, role: RoleType): Promise<Membership> {
    const { membership } = await this.service.api.updateMembership({
      id: id,
      role: role
    });
    return new Membership(membership);
  }
};

export {
  MembershipModule
}
