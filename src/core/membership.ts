import { actions, functions, protocolTags, membershipStatus } from "../constants";
import { v4 as uuidv4 } from "uuid";
import { Membership, MembershipAirdropOptions, RoleType } from "../types/membership";
import { deriveAddress, base64ToArray } from "@akord/crypto";
import { GetOptions, ListOptions, validateListPaginatedApiOptions } from "../types/query-options";
import { ServiceConfig } from "./service/service";
import { MembershipInput, Tag, Tags } from "../types/contract";
import { Paginated } from "../types/paginated";
import { paginate } from "./common";
import { MembershipService } from "./service/membership";

class MembershipModule {
  protected service: MembershipService;

  constructor(config?: ServiceConfig) {
    this.service = new MembershipService(config);
  }

  protected defaultListOptions = {
    shouldDecrypt: true,
    filter: {
      or: [
        { status: { eq: membershipStatus.ACCEPTED } },
        { status: { eq: membershipStatus.PENDING } }
      ]
    }
  } as ListOptions;

  protected defaultGetOptions = {
    shouldDecrypt: true,
  } as GetOptions;

  /**
   * @param  {string} membershipId
   * @returns Promise with the decrypted membership
   */
  public async get(membershipId: string, options: GetOptions = this.defaultGetOptions): Promise<Membership> {
    const getOptions = {
      ...this.defaultGetOptions,
      ...options
    }
    const membershipProto = await this.service.api.getMembership(membershipId, getOptions.vaultId);
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
      return await this.list(options.vaultId, options);
    }
    return await paginate<Membership>(list, { ...options, vaultId });
  }

  /**
   * Airdrop access to the vault directly through public keys
   * @param  {string} vaultId
   * @param  {{publicKey:string,publicSigningKey:string,role:RoleType,options:MembershipAirdropOptions}[]} members
   * @returns Promise with new memberships & corresponding transaction id
   */
  public async airdrop(
    vaultId: string,
    members: Array<{ publicKey: string, publicSigningKey: string, role: RoleType, options?: MembershipAirdropOptions }>,
  ): Promise<{
    items: Array<Membership>
  }> {
    await this.service.setVaultContext(vaultId);
    this.service.setActionRef(actions.MEMBERSHIP_AIRDROP_ACCESS);
    this.service.setFunction(functions.MEMBERSHIP_AIRDROP_ACCESS);
    const memberArray = [] as MembershipInput[];
    const membersMetadata = [];
    const dataArray = [] as { id: string, data: any }[];
    const memberTags = [] as Tags;
    for (const member of members) {
      const membershipId = uuidv4();
      this.service.setObjectId(membershipId);

      const memberAddress = await deriveAddress(base64ToArray(member.publicSigningKey));

      const state = {
        id: membershipId,
        address: memberAddress,
        keys: await this.service.prepareMemberKeys(member.publicKey),
        encPublicSigningKey: await this.service.processWriteString(member.publicSigningKey),
      };

      dataArray.push({
        id: membershipId,
        data: state
      })
      membersMetadata.push({
        address: memberAddress,
        publicKey: member.publicKey,
        publicSigningKey: member.publicSigningKey,
        ...member.options
      })
      memberArray.push({ address: memberAddress, id: membershipId, role: member.role });
      memberTags.push(new Tag(protocolTags.MEMBER_ADDRESS, memberAddress));
      memberTags.push(new Tag(protocolTags.MEMBERSHIP_ID, membershipId));
    }

    this.service.txTags = memberTags.concat(await this.service.getTxTags());

    const input = {
      function: this.service.function,
      members: memberArray
    };

    const object = await this.service.api.postContractTransaction(
      this.service.vaultId,
      input,
      this.service.txTags,
      dataArray,
      undefined,
      false,
      { members: membersMetadata }
    );
    return { items: input.members as any };
  }

  /**
   * Leave the vault by the currently authenticated user
   * @param  {string} id membership id
   * @returns Promise with corresponding transaction id
   */
  public async leave(id: string): Promise<Membership> {
    await this.service.setVaultContextFromMembershipId(id);
    this.service.setActionRef(actions.MEMBERSHIP_LEAVE);
    this.service.setFunction(functions.MEMBERSHIP_LEAVE);

    const { object } = await this.service.api.postContractTransaction<Membership>(
      this.service.vaultId,
      { function: this.service.function },
      await this.service.getTxTags()
    );
    return new Membership(object);
  }

  /**
   * Revoke member access
   * If private vault, vault keys will be rotated & distributed to all valid members
   * @param  {string} id membership id
   * @returns Promise with the updated membership
   */
  public async revoke(id: string): Promise<Membership> {
    await this.service.setVaultContextFromMembershipId(id);
    this.service.setActionRef(actions.MEMBERSHIP_REVOKE_ACCESS);
    this.service.setFunction(functions.MEMBERSHIP_REVOKE_ACCESS);

    this.service.txTags = await this.service.getTxTags();

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

    const { object } = await this.service.api.postContractTransaction<Membership>(
      this.service.vaultId,
      { function: this.service.function },
      this.service.txTags,
      data
    );
    return new Membership(object);
  }

  /**
   * @param  {string} id membership id
   * @param  {RoleType} role VIEWER/CONTRIBUTOR/OWNER
   * @returns Promise with corresponding transaction id
   */
  public async changeAccess(id: string, role: RoleType): Promise<Membership> {
    await this.service.setVaultContextFromMembershipId(id);
    this.service.setActionRef(actions.MEMBERSHIP_CHANGE_ACCESS);
    this.service.setFunction(functions.MEMBERSHIP_CHANGE_ACCESS);

    const { object } = await this.service.api.postContractTransaction<Membership>(
      this.service.vaultId,
      { function: this.service.function, role },
      await this.service.getTxTags()
    );
    return new Membership(object);
  }
};

export {
  MembershipModule
}
