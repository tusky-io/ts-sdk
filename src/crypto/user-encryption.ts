import { arrayToBase64, base64ToArray, base64ToJson, jsonToBase64 } from './encoding';
import { decrypt, deriveKey, encrypt, generateKeyPair } from './lib';
import Keystore from './storage/keystore';
import * as bip39 from 'bip39';
import { IncorrectEncryptionKey } from '../errors/incorrect-encryption-key';
import { logger } from '../logger';
import { X25519KeyPair } from './keypair';

const SALT_LENGTH = 16;

export class UserEncryption {
  private encPrivateKey: string;
  private encPrivateKeyBackup: string;

  constructor(config: { encPrivateKey?: string, encPrivateKeyBackup?: string } = {}) {
    this.encPrivateKey = config.encPrivateKey;
    this.encPrivateKeyBackup = config.encPrivateKeyBackup;
  }

  // setup account encryption context: generate key pair, encrypt with password, and optionally create a backup
  public async setupPassword(password: string, keystore: boolean = false): Promise<{ keyPair: X25519KeyPair, encPrivateKey: string }> {
    const userKeyPair = await generateKeyPair();

    this.encPrivateKey = await encryptWithPassword(password, userKeyPair.privateKey, keystore);
    return { keyPair: new X25519KeyPair(userKeyPair.privateKey), encPrivateKey: this.encPrivateKey };
  }

  // change password by decrypting the key pair and re-encrypting with new password
  public async changePassword(oldPassword: string, newPassword: string, keystore: boolean = false): Promise<{ encPrivateKey: string }> {
    const privateKey = await decryptWithPassword(oldPassword, this.encPrivateKey);

    this.encPrivateKey = await encryptWithPassword(newPassword, privateKey, keystore);
    return { encPrivateKey: this.encPrivateKey };
  }

  // backup user key pair with a backup phrase
  public async backupPassword(password: string): Promise<{ backupPhrase: string, encPrivateKeyBackup: string }> {
    const privateKey = await decryptWithPassword(password, this.encPrivateKey);

    const backupPhrase = bip39.generateMnemonic();

    // TODO: derive master key from backup phrase here
    this.encPrivateKeyBackup = await encryptWithPassword(backupPhrase, privateKey);
    return { backupPhrase, encPrivateKeyBackup: this.encPrivateKeyBackup };
  }

  // reset the password by using the backup phrase
  public async resetPassword(backupPhrase: string, newPassword: string, keystore: boolean = false): Promise<{ encPrivateKey: string }> {
    const privateKey = await decryptWithPassword(backupPhrase, this.encPrivateKeyBackup);

    this.encPrivateKey = await encryptWithPassword(newPassword, privateKey, keystore);
    return { encPrivateKey: this.encPrivateKey };
  }

  public async importFromKeystore(): Promise<{ keyPair: X25519KeyPair }> {
    if (!this.encPrivateKey) {
      throw new IncorrectEncryptionKey(new Error("Missing encrypted private key data."));
    }
    const keystore = await Keystore.instance();
    const passwordKey = await keystore.get("passwordKey");

    if (!passwordKey) {
      throw new IncorrectEncryptionKey(new Error("The user needs to provide the password again."));
    }

    const parsedEncPrivateKey = base64ToJson(this.encPrivateKey) as any;
    const privateKey = await decrypt(
      parsedEncPrivateKey.encryptedPayload,
      passwordKey
    )
    return { keyPair: new X25519KeyPair(new Uint8Array(privateKey)) };
  }

  public async importFromPassword(password: string, keystore: boolean = false): Promise<{ keyPair: X25519KeyPair }> {
    if (!password) {
      throw new IncorrectEncryptionKey(new Error("Missing password to decrypt user keys."));
    }
    if (!this.encPrivateKey) {
      throw new IncorrectEncryptionKey(new Error("Missing encrypted private key data."));
    }

    const privateKey = await decryptWithPassword(password, this.encPrivateKey, keystore);

    return { keyPair: new X25519KeyPair(privateKey) };
  }

  public async importFromBackupPhrase(backupPhrase: string): Promise<{ keyPair: X25519KeyPair }> {
    if (!backupPhrase) {
      throw new IncorrectEncryptionKey(new Error("Missing backup phrase to decrypt user keys."));
    }
    if (!this.encPrivateKeyBackup) {
      throw new IncorrectEncryptionKey(new Error("Missing encrypted private key backup data."));
    }

    const privateKey = await decryptWithPassword(backupPhrase, this.encPrivateKeyBackup);

    return { keyPair: new X25519KeyPair(privateKey) };
  }
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
async function encryptWithPassword(password: string, plaintext: Uint8Array, keystore: boolean = false): Promise<string> {
  try {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

    const derivedKey = await deriveKey(password, salt);

    if (keystore) {
      const keystore = await Keystore.instance();
      await keystore.store("passwordKey", derivedKey);
    }

    const encryptedPayload = await encrypt(plaintext, derivedKey);

    const payload = {
      encryptedPayload: encryptedPayload,
      salt: arrayToBase64(salt)
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
 * @param {string} strPayload stringified payload
 * @returns {Promise.<string>} Promise of string represents utf-8 plaintext
 */
async function decryptWithPassword(password: string, strPayload: string, keystore: boolean = false): Promise<Uint8Array> {
  try {
    const parsedPayload = base64ToJson(strPayload) as any;

    const encryptedPayload = parsedPayload.encryptedPayload;
    const salt = base64ToArray(parsedPayload.salt);

    const derivedKey = await deriveKey(password, salt);

    if (keystore) {
      const keystore = await Keystore.instance();
      await keystore.store("passwordKey", derivedKey);
    }

    const plaintext = await decrypt(encryptedPayload, derivedKey);
    return new Uint8Array(plaintext);
  } catch (err) {
    logger.error(err);
    throw new IncorrectEncryptionKey(new Error("Decrypting data failed."));
  }
}