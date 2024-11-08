import { objects } from "../../constants";
import { Service, ServiceConfig } from "./service";
import { IncorrectEncryptionKey } from "../../errors/incorrect-encryption-key";
import { EncryptedVaultKeyPair } from "../../types";
import { arrayToBase64, base64ToArray, jsonToBase64 } from "../../crypto";
import { encryptWithPublicKey, generateKeyPair } from "../../crypto/lib";

class MembershipService extends Service {

  constructor(config?: ServiceConfig) {
    super(config);
    this.type = objects.MEMBERSHIP;
  }

  async setVaultContextFromMembershipId(membershipId: string) {
    const membership = await this.api.getMembership(membershipId);
    const vault = await this.api.getVault(membership.vaultId);
    this.setVault(vault);
    this.setVaultId(membership.vaultId);
    this.setEncrypted(membership.__encrypted__);
    await this.setMembershipKeys(membership);
    this.setObject(membership);
    this.setObjectId(membershipId);
  }

  async prepareMemberKeys(publicKey: string): Promise<EncryptedVaultKeyPair[]> {
    const keys = [] as EncryptedVaultKeyPair[];
    await this.decryptKeys();
    for (let keypair of this.decryptedKeys) {
      // encrypt private key with member's public key
      const memberEncPrivateKey = await encryptWithPublicKey(base64ToArray(publicKey), keypair.privateKey);
      keys.push({
        publicKey: arrayToBase64(keypair.publicKey),
        encPrivateKey: jsonToBase64(memberEncPrivateKey)
      });
    }
    return keys;
  }

  async rotateMemberKeys(publicKeys: Map<string, string>): Promise<{
    memberKeys: Map<string, EncryptedVaultKeyPair[]>,
    keypair: any
  }> {
    const memberKeys = new Map<string, EncryptedVaultKeyPair[]>();
    // generate a new vault key pair
    const keypair = await generateKeyPair();

    for (let [memberId, publicKey] of publicKeys) {
      try {
        // encrypt private key with member's public key
        const memberEncPrivateKey = await encryptWithPublicKey(base64ToArray(publicKey), keypair.privateKey);
        memberKeys.set(memberId, [{ publicKey: arrayToBase64(keypair.publicKey), encPrivateKey: jsonToBase64(memberEncPrivateKey) }]);
      } catch (error) {
        throw new IncorrectEncryptionKey(error);
      }
    }
    return { memberKeys, keypair };
  }
}

export {
  MembershipService
}