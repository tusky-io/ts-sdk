import { objectType, protocolTags } from "../../constants";
import { EncryptedKeys, Encrypter, base64ToArray, generateKeyPair, Keys } from "@akord/crypto";
import { Service, ServiceConfig } from "./service";
import { Tag, Tags } from "../../types/contract";
import { IncorrectEncryptionKey } from "../../errors/incorrect-encryption-key";

class MembershipService extends Service {

  constructor(config?: ServiceConfig) {
    super(config);
    this.objectType = objectType.MEMBERSHIP;
  }

  async setVaultContextFromMembershipId(membershipId: string, vaultId?: string) {
    const membership = await this.api.getMembership(membershipId, vaultId);
    const vault = await this.api.getVault(membership.vaultId);
    this.setVault(vault);
    this.setVaultId(membership.vaultId);
    this.setIsPublic(membership.__public__);
    await this.setMembershipKeys(membership);
    this.setObject(membership);
    this.setObjectId(membershipId);
    this.setObjectType(this.objectType);
  }

  async getTxTags(): Promise<Tags> {
    const tags = await super.getTxTags();
    return tags.concat(new Tag(protocolTags.MEMBERSHIP_ID, this.objectId));
  }

  async prepareMemberKeys(publicKey: string): Promise<EncryptedKeys[]> {
    if (!this.isPublic) {
      const keysEncrypter = new Encrypter(this.encrypter.wallet, this.encrypter.keys, base64ToArray(publicKey));
      try {
        const keys = await keysEncrypter.encryptMemberKeys([]);
        return keys.map((keyPair: EncryptedKeys) => {
          delete keyPair.publicKey;
          return keyPair;
        });
      } catch (error) {
        throw new IncorrectEncryptionKey(error);
      }
    } else {
      return null;
    }
  }

  async rotateMemberKeys(publicKeys: Map<string, string>): Promise<{
    memberKeys: Map<string, EncryptedKeys[]>,
    keyPair: Keys
  }> {
    const memberKeys = new Map<string, EncryptedKeys[]>();
    // generate a new vault key pair
    const keyPair = await generateKeyPair();

    for (let [memberId, publicKey] of publicKeys) {
      const memberKeysEncrypter = new Encrypter(
        this.encrypter.wallet,
        this.encrypter.keys,
        base64ToArray(publicKey)
      );
      try {
        memberKeys.set(memberId, [await memberKeysEncrypter.encryptMemberKey(keyPair)]);
      } catch (error) {
        throw new IncorrectEncryptionKey(error);
      }
    }
    return { memberKeys, keyPair };
  }
}

export {
  MembershipService
}