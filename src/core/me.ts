import { Service } from "./service/service";
import { User, UserMutable } from "../types/user";
import { UserEncryption } from "../crypto/user-encryption";
import { BadRequest } from "../errors/bad-request";
import { ClientConfig } from "../config";
import { arrayToBase64, X25519KeyPair } from "../crypto";

class MeModule {
  protected service: Service;
  private userEncryption: UserEncryption;

  constructor(config?: ClientConfig) {
    this.service = new Service(config);
    this.userEncryption = new UserEncryption(config);
  }

  /**
   * Get currently authenticated user
   * @returns {Promise<User>}
   */
  public async get(): Promise<User> {
    return await this.service.api.getMe();
  }

  /**
   * Update currently authenticated user
   * @param {UserMutable} input
   * @returns {Promise<User>}
   */
  public async update(input: UserMutable): Promise<User> {
    return await this.service.api.updateMe(input);
  }

  /**
   * Setup user password
   * @param {string} password
   * @returns {Promise<{ keypair: X25519KeyPair; user: User }>}
   */
  public async setupPassword(
    password: string,
  ): Promise<{ keypair: X25519KeyPair; user: User }> {
    const me = await this.get();
    if (me.encPrivateKey) {
      throw new BadRequest("User encryption context is already setup");
    }
    const { encPrivateKey, keypair } = await this.userEncryption.setupPassword(
      password,
      true,
    );
    return {
      user: await this.service.api.createEncryptionKeys({
        encPrivateKey: encPrivateKey,
        publicKey: arrayToBase64(keypair.getPublicKey()),
      }),
      keypair,
    };
  }

  /**
   * Change user password\
   * Decrypt user private key with the old password\
   * Encrypt user private key with the new password
   * @param {string} oldPassword
   * @param {string} newPassword
   * @returns {Promise<User>}
   */
  public async changePassword(
    oldPassword: string,
    newPassword: string,
  ): Promise<User> {
    const me = await this.get();
    if (!me.encPrivateKey) {
      throw new BadRequest(
        "Missing user encryption context, setup the user password first.",
      );
    }
    this.userEncryption.setEncryptedPrivateKey(me.encPrivateKey);
    const { encPrivateKey } = await this.userEncryption.changePassword(
      oldPassword,
      newPassword,
      true,
    );
    return await this.service.api.updateEncryptionKeys({
      encPrivateKey: encPrivateKey,
    });
  }

  /**
   * Backup user password\
   * Generate fresh backup phrase & use it as a backup
   * @param {string} password
   * @returns {Promise<{ backupPhrase: string; user: User }>}
   */
  public async backupPassword(
    password: string,
  ): Promise<{ backupPhrase: string; user: User }> {
    const me = await this.get();
    if (!me.encPrivateKey) {
      throw new BadRequest(
        "Missing user encryption context, setup the user password first.",
      );
    }
    this.userEncryption.setEncryptedPrivateKey(me.encPrivateKey);
    const { backupPhrase, encPrivateKeyBackup } =
      await this.userEncryption.backupPassword(password);
    const user = await this.service.api.updateEncryptionKeys({
      encPrivateKeyBackup: encPrivateKeyBackup,
    });
    return { user, backupPhrase };
  }

  /**
   * Reset user password\
   * Recover user private key using the backup phrase\
   * Encrypt user private key with the new password
   * @param {string} backupPhrase
   * @param {string} newPassword
   * @returns {Promise<User>}
   */
  public async resetPassword(
    backupPhrase: string,
    newPassword: string,
  ): Promise<User> {
    const me = await this.get();
    if (!me.encPrivateKeyBackup) {
      throw new BadRequest("Missing user backup.");
    }
    this.userEncryption.setEncryptedPrivateKeyBackup(me.encPrivateKeyBackup);
    const { encPrivateKey } = await this.userEncryption.resetPassword(
      backupPhrase,
      newPassword,
    );
    return await this.service.api.updateEncryptionKeys({
      encPrivateKey: encPrivateKey,
    });
  }

  /**
   * Reset user encryption context
   * WARNING: It will reset user keys & will delete all private content created by the user
   * @returns {Promise<void>}
   */
  public async resetEncryptionKeys(): Promise<void> {
    return this.service.api.deleteEncryptionKeys();
  }

  /**
   * Check whether the user has ongoing encryption session
   * @returns {Promise<boolean>}
   */
  public async hasEncryptionSession(): Promise<boolean> {
    const hasEncryptionSession =
      await this.userEncryption.hasEncryptionSession();
    return hasEncryptionSession ? true : false;
  }

  /**
   * Clear encryption session from the client storage
   */
  public async clearEncryptionSession(): Promise<void> {
    await this.userEncryption.clear();
  }

  /**
   * Import encryption session from password
   * @param {string} password
   * @returns {Promise<{ keypair: X25519KeyPair }>}
   */
  public async importEncryptionSessionFromPassword(
    password: string,
  ): Promise<{ keypair: X25519KeyPair }> {
    const me = await this.get();
    this.userEncryption.setEncryptedPrivateKey(me.encPrivateKey);
    const { keypair } = await this.userEncryption.importFromPassword(
      password,
      true,
    );
    return { keypair };
  }

  /**
   * Import encryption session from keystore, if present
   * @returns {Promise<{ keypair: X25519KeyPair }>}
   */
  public async importEncryptionSessionFromKeystore(): Promise<{
    keypair: X25519KeyPair;
  }> {
    const me = await this.get();
    this.userEncryption.setEncryptedPrivateKey(me.encPrivateKey);
    const { keypair } = await this.userEncryption.importFromKeystore();
    return { keypair };
  }
}

export { MeModule };
