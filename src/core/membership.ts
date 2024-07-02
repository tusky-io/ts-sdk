import { actionRefs, status, functions, protocolTags } from "../constants";
import { v4 as uuidv4 } from "uuid";
import { Membership, MembershipAirdropOptions, MembershipCreateOptions, MembershipCreateResult, MembershipUpdateResult, RoleType } from "../types/membership";
import { deriveAddress, base64ToArray } from "@akord/crypto";
import { GetOptions, ListOptions, validateListPaginatedApiOptions } from "../types/query-options";
import { ServiceConfig } from "./service/service";
import { MembershipInput, Tag, Tags } from "../types/contract";
import { Paginated } from "../types/paginated";
import { BadRequest } from "../errors/bad-request";
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
        { status: { eq: status.ACCEPTED } },
        { status: { eq: status.PENDING } }
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
   * Invite user with an Akord account
   * @param  {string} vaultId
   * @param  {string} email invitee's email
   * @param  {RoleType} role VIEWER/CONTRIBUTOR/OWNER
   * @param  {MembershipCreateOptions} [options] invitation email message, etc.
   * @returns Promise with new membership id & corresponding transaction id
   */
  public async invite(vaultId: string, email: string, role: RoleType, options: MembershipCreateOptions = {}): Promise<MembershipCreateResult> {
    await this.service.setVaultContext(vaultId);
    this.service.setActionRef(actionRefs.MEMBERSHIP_INVITE);
    this.service.setFunction(functions.MEMBERSHIP_INVITE);
    const membershipId = uuidv4();
    this.service.setObjectId(membershipId);

    const { address, publicKey, publicSigningKey } = await this.service.api.getUserPublicData(email);
    const state = {
      keys: await this.service.prepareMemberKeys(publicKey),
      encPublicSigningKey: await this.service.processWriteString(publicSigningKey)
    };

    this.service.arweaveTags = [new Tag(protocolTags.MEMBER_ADDRESS, address)]
      .concat(await this.service.getTxTags());

    const input = {
      function: this.service.function,
      address,
      role,
    }

    const { id, object } = await this.service.api.postContractTransaction<Membership>(
      this.service.vaultId,
      input,
      this.service.arweaveTags,
      state,
      false,
      { message: options.message }
    );
    return { membershipId, transactionId: id, object: object };
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
    transactionId: string,
    members: Array<{ id: string, address: string }>
  }> {
    await this.service.setVaultContext(vaultId);
    this.service.setActionRef("MEMBERSHIP_AIRDROP");
    this.service.setFunction(functions.MEMBERSHIP_ADD);
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

    this.service.arweaveTags = memberTags.concat(await this.service.getTxTags());

    const input = {
      function: this.service.function,
      members: memberArray
    };

    const { id } = await this.service.api.postContractTransaction(
      this.service.vaultId,
      input,
      this.service.arweaveTags,
      dataArray,
      false,
      { members: membersMetadata }
    );
    return { members: input.members, transactionId: id };
  }

  /**
   * @param  {string} membershipId
   * @returns Promise with corresponding transaction id
   */
  public async accept(membershipId: string): Promise<MembershipUpdateResult> {
    await this.service.setVaultContextFromMembershipId(membershipId);
    const state = {
      encPublicSigningKey: await this.service.processWriteString(await this.service.signer.signingPublicKey())
    }
    this.service.setActionRef(actionRefs.MEMBERSHIP_ACCEPT);
    this.service.setFunction(functions.MEMBERSHIP_ACCEPT);

    const { id, object } = await this.service.api.postContractTransaction<Membership>(
      this.service.vaultId,
      { function: this.service.function },
      await this.service.getTxTags(),
      state
    );
    return { transactionId: id, object: new Membership(object) };
  }

  /**
   * @param  {string} membershipId
   * @returns Promise with corresponding transaction id
   */
  public async confirm(membershipId: string): Promise<MembershipUpdateResult> {
    await this.service.setVaultContextFromMembershipId(membershipId);
    this.service.setActionRef(actionRefs.MEMBERSHIP_CONFIRM);
    this.service.setFunction(functions.MEMBERSHIP_INVITE);
    const { address, publicKey, publicSigningKey } = await this.service.api.getUserPublicData(this.service.object.email);

    const state = {
      keys: await this.service.prepareMemberKeys(publicKey),
      encPublicSigningKey: await this.service.processWriteString(publicSigningKey)
    };

    this.service.arweaveTags = [new Tag(protocolTags.MEMBER_ADDRESS, address)]
      .concat(await this.service.getTxTags());

    const input = {
      function: this.service.function,
      address,
      role: this.service.object.role
    }

    const { id, object } = await this.service.api.postContractTransaction<Membership>(
      this.service.vaultId,
      input,
      this.service.arweaveTags,
      state
    );
    return { transactionId: id, object: new Membership(object) };
  }

  /**
   * @param  {string} membershipId
   * @returns Promise with corresponding transaction id
   */
  public async reject(membershipId: string): Promise<MembershipUpdateResult> {
    await this.service.setVaultContextFromMembershipId(membershipId);
    this.service.setActionRef(actionRefs.MEMBERSHIP_REJECT);
    this.service.setFunction(functions.MEMBERSHIP_REJECT);

    const { id, object } = await this.service.api.postContractTransaction<Membership>(
      this.service.vaultId,
      { function: this.service.function },
      await this.service.getTxTags()
    );
    return { transactionId: id, object: new Membership(object) };
  }

  /**
   * @param  {string} membershipId
   * @returns Promise with corresponding transaction id
   */
  public async leave(membershipId: string): Promise<MembershipUpdateResult> {
    await this.service.setVaultContextFromMembershipId(membershipId);
    this.service.setActionRef(actionRefs.MEMBERSHIP_LEAVE);
    this.service.setFunction(functions.MEMBERSHIP_REJECT);

    const { id, object } = await this.service.api.postContractTransaction<Membership>(
      this.service.vaultId,
      { function: this.service.function },
      await this.service.getTxTags()
    );
    return { transactionId: id, object: new Membership(object) };
  }

  /**
   * @param  {string} membershipId
   * @returns Promise with corresponding transaction id
   */
  public async revoke(membershipId: string): Promise<MembershipUpdateResult> {
    await this.service.setVaultContextFromMembershipId(membershipId);
    this.service.setActionRef(actionRefs.MEMBERSHIP_REVOKE);
    this.service.setFunction(functions.MEMBERSHIP_REVOKE);

    this.service.arweaveTags = await this.service.getTxTags();

    let data: { id: string, value: any }[];
    if (!this.service.isPublic) {
      const memberships = await this.listAll(this.service.vaultId, { shouldDecrypt: false });

      const activeMembers = memberships.filter((member: Membership) =>
        member.id !== this.service.objectId
        && (member.status === status.ACCEPTED || member.status === status.PENDING));

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

    const { id, object } = await this.service.api.postContractTransaction<Membership>(
      this.service.vaultId,
      { function: this.service.function },
      this.service.arweaveTags,
      data
    );
    return { transactionId: id, object: new Membership(object) };
  }

  /**
   * @param  {string} membershipId
   * @param  {RoleType} role VIEWER/CONTRIBUTOR/OWNER
   * @returns Promise with corresponding transaction id
   */
  public async changeRole(membershipId: string, role: RoleType): Promise<MembershipUpdateResult> {
    await this.service.setVaultContextFromMembershipId(membershipId);
    this.service.setActionRef(actionRefs.MEMBERSHIP_CHANGE_ROLE);
    this.service.setFunction(functions.MEMBERSHIP_CHANGE_ROLE);

    const { id, object } = await this.service.api.postContractTransaction<Membership>(
      this.service.vaultId,
      { function: this.service.function, role },
      await this.service.getTxTags()
    );
    return { transactionId: id, object: new Membership(object) };
  }

  /**
   * Invite user without an Akord account
   * @param  {string} vaultId
   * @param  {string} email invitee's email
   * @param  {string} role CONTRIBUTOR or VIEWER
   * @param  {MembershipCreateOptions} [options] invitation email message, etc.
   * @returns Promise with new membership id & corresponding transaction id
   */
  public async inviteNewUser(vaultId: string, email: string, role: RoleType, options: MembershipCreateOptions = {}): Promise<{
    membershipId: string
  }> {
    const { id } = await this.service.api.inviteNewUser(vaultId, email, role, options.message);
    return { membershipId: id };
  }

  /**
 * Revoke invite for user without an Akord account
 * @param  {string} vaultId
 * @param  {string} membershipId
 */
  public async revokeInvite(vaultId: string, membershipId: string): Promise<void> {
    await this.service.api.revokeInvite(vaultId, membershipId);
  }

  /**
   * @param  {string} membershipId
   * @returns Promise with corresponding transaction id
   */
  public async inviteResend(membershipId: string): Promise<void> {
    const membership = await this.service.api.getMembership(membershipId);
    if (membership.status !== status.PENDING && membership.status !== status.INVITED) {
      throw new BadRequest("Cannot resend the invitation for member: " + membershipId +
        ". Found invalid status: " + membership.status);
    }
    await this.service.api.inviteResend(membership.vaultId, membershipId);
  }
};

export {
  MembershipModule
}
