import { arrayToBase64, base64ToArray, base64ToJson, jsonToBase64 } from './encoding';
import { decrypt, deriveKey, encrypt, generateKeyPair } from './lib';
import Keystore from './storage/keystore';
import * as bip39 from 'bip39';
import { IncorrectEncryptionKey } from '../errors/incorrect-encryption-key';
import { logger } from '../logger';
import { X25519KeyPair } from './keypair';
import { DEFAULT_STORAGE } from '../auth/jwt';

const SALT_LENGTH = 16;
const SESSION_KEY_PATH = "sessionKey";
const ENCRYPTED_PASSWORD_KEY_PATH = "enecryptedPasswordKey";

export class UserEncryption {
  private encPrivateKey: string;
  private encPrivateKeyBackup: string;
  private storage: Storage;

  constructor(config: { encPrivateKey?: string, encPrivateKeyBackup?: string, storage?: Storage } = {}) {
    this.encPrivateKey = config.encPrivateKey;
    this.encPrivateKeyBackup = config.encPrivateKeyBackup;
    this.storage = config.storage || DEFAULT_STORAGE;
  }

  // setup account encryption context: generate key pair, encrypt with password, and optionally create a backup
  public async setupPassword(password: string, keystore: boolean = false): Promise<{ keyPair: X25519KeyPair, encPrivateKey: string }> {
    const userKeyPair = await generateKeyPair();

    this.encPrivateKey = await encryptWithPassword(password, userKeyPair.privateKey, this.storage, keystore);
    return { keyPair: new X25519KeyPair(userKeyPair.privateKey), encPrivateKey: this.encPrivateKey };
  }

  // change password by decrypting the key pair and re-encrypting with new password
  public async changePassword(oldPassword: string, newPassword: string, keystore: boolean = false): Promise<{ encPrivateKey: string }> {
    const privateKey = await decryptWithPassword(oldPassword, this.encPrivateKey, this.storage);

    this.encPrivateKey = await encryptWithPassword(newPassword, privateKey, this.storage, keystore);
    return { encPrivateKey: this.encPrivateKey };
  }

  // backup user key pair with a backup phrase
  public async backupPassword(password: string): Promise<{ backupPhrase: string, encPrivateKeyBackup: string }> {
    const privateKey = await decryptWithPassword(password, this.encPrivateKey, this.storage);

    const backupPhrase = bip39.generateMnemonic();

    // TODO: derive master key from backup phrase here
    this.encPrivateKeyBackup = await encryptWithPassword(backupPhrase, privateKey, this.storage);
    return { backupPhrase, encPrivateKeyBackup: this.encPrivateKeyBackup };
  }

  // reset the password by using the backup phrase
  public async resetPassword(backupPhrase: string, newPassword: string, keystore: boolean = false): Promise<{ encPrivateKey: string }> {
    const privateKey = await decryptWithPassword(backupPhrase, this.encPrivateKeyBackup, this.storage);

    this.encPrivateKey = await encryptWithPassword(newPassword, privateKey, this.storage, keystore);
    return { encPrivateKey: this.encPrivateKey };
  }

  public async importFromKeystore(): Promise<{ keyPair: X25519KeyPair }> {
    if (!this.encPrivateKey) {
      throw new IncorrectEncryptionKey(new Error("Missing encrypted private key data."));
    }
    const keystore = await Keystore.instance();
    const sessionKey = await keystore.get(SESSION_KEY_PATH);

    if (!sessionKey) {
      throw new IncorrectEncryptionKey(new Error("The user needs to provide the password again."));
    }

    const encryptedPasswordKeyPayload = this.storage.getItem(ENCRYPTED_PASSWORD_KEY_PATH);

    if (!encryptedPasswordKeyPayload) {
      throw new IncorrectEncryptionKey(new Error("The user needs to provide the password again."));
    }

    const { encryptedPasswordKey, iv } = JSON.parse(encryptedPasswordKeyPayload);

    const passwordKey = await decryptPasswordKey(sessionKey, new Uint8Array(encryptedPasswordKey), new Uint8Array(iv));

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

    const privateKey = await decryptWithPassword(password, this.encPrivateKey, this.storage, keystore);

    return { keyPair: new X25519KeyPair(privateKey) };
  }

  public async importFromBackupPhrase(backupPhrase: string): Promise<{ keyPair: X25519KeyPair }> {
    if (!backupPhrase) {
      throw new IncorrectEncryptionKey(new Error("Missing backup phrase to decrypt user keys."));
    }
    if (!this.encPrivateKeyBackup) {
      throw new IncorrectEncryptionKey(new Error("Missing encrypted private key backup data."));
    }

    const privateKey = await decryptWithPassword(backupPhrase, this.encPrivateKeyBackup, this.storage);

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
async function encryptWithPassword(password: string, plaintext: Uint8Array, storage: Storage, keystore: boolean = false): Promise<string> {
  try {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

    const passwordKey = await deriveKey(password, salt);

    if (keystore) {
      const sessionKey = await generateSessionKey();
      const exportedPasswordKey = await crypto.subtle.exportKey("raw", passwordKey);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedPasswordKey = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        sessionKey,
        exportedPasswordKey
      );
      storage.setItem(ENCRYPTED_PASSWORD_KEY_PATH, JSON.stringify({
        encryptedPasswordKey: Array.from(new Uint8Array(encryptedPasswordKey)),
        iv: Array.from(iv)
      }));
      const keystore = await Keystore.instance();
      await keystore.store(SESSION_KEY_PATH, sessionKey);
    }

    const encryptedPayload = await encrypt(plaintext, passwordKey);

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
async function decryptWithPassword(password: string, strPayload: string, storage: Storage, keystore: boolean = false): Promise<Uint8Array> {
  try {
    const parsedPayload = base64ToJson(strPayload) as any;

    const encryptedPayload = parsedPayload.encryptedPayload;
    const salt = base64ToArray(parsedPayload.salt);

    const passwordKey = await deriveKey(password, salt);

    if (keystore) {
      const sessionKey = await generateSessionKey();
      const exportedPasswordKey = await crypto.subtle.exportKey("raw", passwordKey);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedPasswordKey = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        sessionKey,
        exportedPasswordKey
      );
      storage.setItem(ENCRYPTED_PASSWORD_KEY_PATH, JSON.stringify({
        encryptedPasswordKey: Array.from(new Uint8Array(encryptedPasswordKey)),
        iv: Array.from(iv)
      }));
      const keystore = await Keystore.instance();
      await keystore.store(SESSION_KEY_PATH, sessionKey);
    }

    const plaintext = await decrypt(encryptedPayload, passwordKey);
    return new Uint8Array(plaintext);
  } catch (err) {
    logger.error(err);
    throw new IncorrectEncryptionKey(new Error("Decrypting data failed."));
  }
}

// generate non-extractable session key
async function generateSessionKey() {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function decryptPasswordKey(sessionKey: CryptoKey, encryptedPasswordKey: Uint8Array, iv: Uint8Array) {
  const decryptedKey = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    sessionKey,
    encryptedPasswordKey
  );

  return await crypto.subtle.importKey(
    "raw",
    decryptedKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}