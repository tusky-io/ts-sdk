import { Service } from "./service/service";
import { User, UserMutable } from "../types/user";
import { UserEncryption } from "../crypto/user-encryption";
import { BadRequest } from "../errors/bad-request";
import { ClientConfig } from "../config";

class MeModule {
  protected service: Service;
  private userEncryption: UserEncryption;

  constructor(config?: ClientConfig) {
    this.service = new Service(config);
    this.userEncryption = new UserEncryption(config);
  }

  /**
   * Get currently authenticated user
   */
  public async get(): Promise<User> {
    return await this.service.api.getMe();
  }

  /**
   * Update currently authenticated user
   * NOTE: by setting termsAccepted to true, the user accepts the following terms: https://akord.com/terms-of-service-consumer
   */
  public async update(input: UserMutable): Promise<User> {
    return await this.service.api.updateMe(input);
  }

  /**
   * Setup user password
   */
  public async setupPassword(password: string): Promise<User> {
    const me = await this.get();
    if (me.encPrivateKey) {
      throw new BadRequest("User encryption context is already setup");
    }
    const { encPrivateKey } = await this.userEncryption.setupPassword(password, true);
    return await this.service.api.updateMe({ encPrivateKey: encPrivateKey });
  }

  /**
   * Change user password
   * Decrypt user private key with the old password
   * Encrypt user private key with the new password
   */
  public async changePassword(oldPassword: string, newPassword: string): Promise<User> {
    const me = await this.get();
    if (!me.encPrivateKey) {
      throw new BadRequest("Missing user encryption context, setup the user password first.");
    }
    this.userEncryption.setEncryptedPrivateKey(me.encPrivateKey);
    const { encPrivateKey } = await this.userEncryption.changePassword(oldPassword, newPassword, true);
    return await this.service.api.updateMe({ encPrivateKey: encPrivateKey });
  }

  /**
   * Backup user password
   * Generate fresh backup phrase & use it as a backup
   */
  public async backupPassword(password: string): Promise<{ backupPhrase: string, user: User }> {
    const me = await this.get();
    if (!me.encPrivateKey) {
      throw new BadRequest("Missing user encryption context, setup the user password first.");
    }
    this.userEncryption.setEncryptedPrivateKey(me.encPrivateKey);
    const { backupPhrase, encPrivateKeyBackup } = await this.userEncryption.backupPassword(password);
    const user = await this.service.api.updateMe({ encPrivateKeyBackup: encPrivateKeyBackup });
    return { user, backupPhrase };
  }

  /**
   * Reset user password
   * Recover user private key using the backup phrase
   * Encrypt user private key with the new password
   */
  public async resetPassword(backupPhrase: string, newPassword: string): Promise<User> {
    const me = await this.get();
    if (!me.encPrivateKeyBackup) {
      throw new BadRequest("Missing user backup.");
    }
    this.userEncryption.setEncryptedPrivateKeyBackup(me.encPrivateKeyBackup);
    const { encPrivateKey } = await this.userEncryption.resetPassword(backupPhrase, newPassword);
    return await this.service.api.updateMe({ encPrivateKey: encPrivateKey });
  }
}

export {
  MeModule
}
