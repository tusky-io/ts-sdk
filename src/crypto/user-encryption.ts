import {
  arrayToBase64,
  base64ToArray,
  base64ToJson,
  jsonToBase64,
} from "./encoding";
import {
  decodeAesPayload,
  decryptAes,
  deriveAesKey,
  encryptAes,
  exportKeyToArray,
  generateKey,
  generateKeyPair,
  importKeyFromArray,
  KEY_DERIVATION_ITERATION_COUNT,
} from "./lib";
import Keystore from "./storage/keystore";
import { IncorrectEncryptionKey } from "../errors/incorrect-encryption-key";
import { logger } from "../logger";
import { X25519KeyPair } from "./keypair";
import { defaultStorage, JWTClient } from "../auth/jwt";
import { Env } from "../types";
import * as bip39 from "bip39";
import { EncryptedUserBackupPayload } from "./types";
import { Conflict } from "../errors/conflict";

const MNEMONIC_ENTROPY = 256;
const SALT_LENGTH = 16;
const SESSION_KEY_PATH = "session_key";
const ENCRYPTED_PASSWORD_KEY_PATH = "encrypted_password_key";

export class UserEncryption {
  private encPrivateKey: string;
  private encPrivateKeyBackup: string;
  private storage: Storage;

  private userId: string;
  private sessionKeyPath: string;
  private encryptedPasswordKeyPath: string;

  constructor(
    config: {
      encPrivateKey?: string;
      encPrivateKeyBackup?: string;
      storage?: Storage;
      env?: Env;
    } = {},
  ) {
    this.encPrivateKey = config.encPrivateKey;
    this.encPrivateKeyBackup = config.encPrivateKeyBackup;
    this.storage = config.storage || defaultStorage();
    this.userId = new JWTClient(config).getUserId();
    this.sessionKeyPath = `${this.userId}_${SESSION_KEY_PATH}`;
    this.encryptedPasswordKeyPath = `${this.userId}_${ENCRYPTED_PASSWORD_KEY_PATH}`;
  }

  public setEncryptedPrivateKey(encPrivateKey: string) {
    this.encPrivateKey = encPrivateKey;
  }

  public setEncryptedPrivateKeyBackup(encPrivateKeyBackup: string) {
    this.encPrivateKeyBackup = encPrivateKeyBackup;
  }

  // setup account encryption context: generate key pair, encrypt with password, and optionally create a backup
  public async setupPassword(
    password: string,
    keystore: boolean = false,
  ): Promise<{ keypair: X25519KeyPair; encPrivateKey: string }> {
    const userKeyPair = await generateKeyPair();

    this.encPrivateKey = await this.encryptWithPassword(
      password,
      userKeyPair.privateKey,
      keystore,
    );
    return {
      keypair: new X25519KeyPair(userKeyPair.privateKey),
      encPrivateKey: this.encPrivateKey,
    };
  }

  // change password by decrypting the key pair and re-encrypting with new password
  public async changePassword(
    oldPassword: string,
    newPassword: string,
    keystore: boolean = false,
  ): Promise<{ encPrivateKey: string }> {
    const privateKey = await this.decryptWithPassword(
      oldPassword,
      this.encPrivateKey,
    );

    this.encPrivateKey = await this.encryptWithPassword(
      newPassword,
      privateKey,
      keystore,
    );
    return { encPrivateKey: this.encPrivateKey };
  }

  // backup user key pair with a backup phrase
  public async backupPassword(
    password: string,
  ): Promise<{ backupPhrase: string; encPrivateKeyBackup: string }> {
    const privateKey = await this.decryptWithPassword(
      password,
      this.encPrivateKey,
    );

    // generate BIP-39 mnemonic
    const backupPhrase = bip39.generateMnemonic(MNEMONIC_ENTROPY);

    this.encPrivateKeyBackup = await this.encryptWithBackupPhrase(
      backupPhrase,
      privateKey,
    );
    return { backupPhrase, encPrivateKeyBackup: this.encPrivateKeyBackup };
  }

  // reset the password by using the backup phrase
  public async resetPassword(
    backupPhrase: string,
    newPassword: string,
    keystore: boolean = false,
  ): Promise<{ encPrivateKey: string }> {
    const privateKey = await this.decryptWithBackupPhrase(
      backupPhrase,
      this.encPrivateKeyBackup,
    );

    this.encPrivateKey = await this.encryptWithPassword(
      newPassword,
      privateKey,
      keystore,
    );
    return { encPrivateKey: this.encPrivateKey };
  }

  public async importFromKeystore(): Promise<{ keypair: X25519KeyPair }> {
    if (!this.encPrivateKey) {
      throw new IncorrectEncryptionKey(
        new Error("Missing encrypted private key data."),
      );
    }

    const encryptionSession = await this.hasEncryptionSession();

    if (!encryptionSession) {
      throw new IncorrectEncryptionKey(
        new Error("The user needs to provide the password again."),
      );
    }

    const { ciphertext, iv } = decodeAesPayload(
      encryptionSession.encryptedPasswordKey,
    );

    const decryptedKey = await decryptAes(
      { ciphertext, iv },
      encryptionSession.sessionKey,
    );
    const passwordKey = await importKeyFromArray(new Uint8Array(decryptedKey));

    const parsedEncPrivateKey = base64ToJson(this.encPrivateKey) as any; // TODO: type here
    const privateKey = await decryptAes(
      parsedEncPrivateKey.encryptedPayload,
      passwordKey,
    );
    return { keypair: new X25519KeyPair(new Uint8Array(privateKey)) };
  }

  public async importFromPassword(
    password: string,
    keystore: boolean = false,
  ): Promise<{ keypair: X25519KeyPair }> {
    if (!password) {
      throw new IncorrectEncryptionKey(
        new Error("Missing password to decrypt user keys."),
      );
    }
    if (!this.encPrivateKey) {
      throw new IncorrectEncryptionKey(
        new Error("Missing encrypted private key data."),
      );
    }

    const privateKey = await this.decryptWithPassword(
      password,
      this.encPrivateKey,
      keystore,
    );

    return { keypair: new X25519KeyPair(privateKey) };
  }

  public async importFromBackupPhrase(
    backupPhrase: string,
  ): Promise<{ keypair: X25519KeyPair }> {
    if (!backupPhrase) {
      throw new IncorrectEncryptionKey(
        new Error("Missing backup phrase to decrypt user keys."),
      );
    }
    if (!this.encPrivateKeyBackup) {
      throw new IncorrectEncryptionKey(
        new Error("Missing encrypted private key backup data."),
      );
    }

    const privateKey = await this.decryptWithBackupPhrase(
      backupPhrase,
      this.encPrivateKeyBackup,
    );

    return { keypair: new X25519KeyPair(privateKey) };
  }

  /**
   * Encryption with key derived from password
   * - generate random salt
   * - derive the encryption key from password and salt
   * - encrypt plaintext with the derived key
   * @param {string} password
   * @param {string} plaintext plaintext array
   * @returns {Promise.<string>} Promise of string represents stringified payload
   */
  private async encryptWithPassword(
    password: string,
    plaintext: Uint8Array,
    keystore: boolean = false,
  ): Promise<string> {
    try {
      const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

      const passwordKey = await deriveAesKey(
        password,
        salt,
        KEY_DERIVATION_ITERATION_COUNT,
      );

      const encryptedPayload = await encryptAes(plaintext, passwordKey);

      const payload = {
        encryptedPayload: encryptedPayload,
        salt: arrayToBase64(salt),
        iterationCount: KEY_DERIVATION_ITERATION_COUNT,
      };

      if (keystore) {
        await this.saveSessionInKeystore(passwordKey);
      }
      return jsonToBase64(payload);
    } catch (err) {
      logger.error(err);
      throw new IncorrectEncryptionKey(new Error("Encrypting data failed."));
    }
  }

  /**
   * Decryption with key derived from password
   * - parse the payload
   * - derive the decryption key from password and salt
   * - decrypt the ciphertext with the derived key
   * @param {string} password
   * @param {string} encryptedPayload stringified payload
   * @returns {Promise.<string>} Promise of string represents utf-8 plaintext
   */
  private async decryptWithPassword(
    password: string,
    encryptedPayload: string,
    keystore: boolean = false,
  ): Promise<Uint8Array> {
    try {
      const parsedPayload = base64ToJson(
        encryptedPayload,
      ) as EncryptedUserBackupPayload;

      if (!parsedPayload.salt || !parsedPayload.encryptedPayload) {
        throw new Conflict("Malformed encrypted payload.");
      }

      const salt = base64ToArray(parsedPayload.salt);

      const passwordKey = await deriveAesKey(
        password,
        salt,
        parsedPayload.iterationCount || 150000, // support legacy
      );

      const plaintext = await decryptAes(
        parsedPayload.encryptedPayload,
        passwordKey,
      );
      if (keystore) {
        await this.saveSessionInKeystore(passwordKey);
      }
      return new Uint8Array(plaintext);
    } catch (err) {
      logger.error(err);
      throw new IncorrectEncryptionKey(new Error("Decrypting data failed."));
    }
  }

  /**
   * Encryption with key derived from backup phrase
   * - derive the encryption key from backup phrase
   * - encrypt plaintext with the derived key
   * @param {string} backupPhrase
   * @param {string} plaintext plaintext array
   * @returns {Promise.<string>} Promise of string represents stringified payload
   */
  private async encryptWithBackupPhrase(
    backupPhrase: string,
    plaintext: Uint8Array,
  ): Promise<string> {
    return this.encryptWithPassword(backupPhrase, plaintext, false);
  }

  /**
   * Decryption with key derived from backup phrase
   * - derive the decryption key from backup phrase
   * - decrypt the ciphertext with the derived key
   * @param {string} backupPhrase
   * @param {string} encryptedPayload stringified payload
   * @returns {Promise.<Uint8Array>} Promise of string represents utf-8 plaintext
   */
  private async decryptWithBackupPhrase(
    backupPhrase: string,
    encryptedPayload: string,
  ): Promise<Uint8Array> {
    return this.decryptWithPassword(backupPhrase, encryptedPayload, false);
  }

  async hasEncryptionSession(): Promise<
    false | { sessionKey: CryptoKey; encryptedPasswordKey: string }
  > {
    const keystore = await Keystore.instance();
    const sessionKey = await keystore.get(this.sessionKeyPath);
    if (!sessionKey) {
      return false;
    }
    const encryptedPasswordKey = this.storage.getItem(
      this.encryptedPasswordKeyPath,
    );
    if (!encryptedPasswordKey) {
      return false;
    }
    return {
      sessionKey: sessionKey,
      encryptedPasswordKey: encryptedPasswordKey,
    };
  }

  async clear() {
    const keystore = await Keystore.instance();
    await keystore.delete(this.sessionKeyPath);
    await keystore.delete(this.encryptedPasswordKeyPath);
  }

  private async saveSessionInKeystore(passwordKey: CryptoKey) {
    const sessionKey = await generateKey();
    const exportedPasswordKey = await exportKeyToArray(passwordKey);
    const encryptedPasswordKey = (await encryptAes(
      exportedPasswordKey,
      sessionKey,
    )) as string;
    this.storage.setItem(this.encryptedPasswordKeyPath, encryptedPasswordKey);
    const keystore = await Keystore.instance();
    await keystore.store(this.sessionKeyPath, sessionKey);
  }
}
