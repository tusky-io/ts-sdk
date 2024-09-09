import Keystore from '../storage/keystore'
import * as bip39 from 'bip39'
import { HDKey } from 'ethereum-cryptography/hdkey'
import {
  jsonToBase64, base64ToJson, arrayToString, stringToArray, arrayToBase64, base64ToArray
} from '../encoding'
import {
  encrypt,
  encryptWithPublicKey,
  decrypt,
  decryptWithPrivateKey,
  deriveKey,
  deriveAddress,
  signString,
} from '../../crypto-lib'
import { ready, crypto_sign_seed_keypair, KeyPair } from 'libsodium-wrappers'
import nacl from 'tweetnacl'
import { Wallet } from '.'
// import { HDKeyT } from 'ethereum-cryptography/pure/hdkey'
import { Buffer } from 'buffer';

const HD_SIGNING_PATH = 'm/0\'/0\'/0'
const HD_ENCRYPTION_PATH = 'm/1\'/0\'/0'
const SALT_LENGTH = 16

class AkordWallet implements Wallet {
  backupPhrase: string
  encBackupPhrase: string
  encryptionKeyPair: KeyPair
  keyPair: {
    privateKey: Uint8Array,
    publicKey: Uint8Array
  }
  signingKeyPair: {
    privateKey: Uint8Array,
    publicKey: Uint8Array
  }

  constructor(backupPhrase: string, encBackupPhrase?: string) {
    this.backupPhrase = backupPhrase
    this.encBackupPhrase = encBackupPhrase
    this.keyPair = {
      privateKey: null,
      publicKey: null
    }
    this.signingKeyPair = {
      privateKey: null,
      publicKey: null
    }
  }

  async encrypt(input: Uint8Array): Promise<string> {
    const payload = await encryptWithPublicKey(this.publicKeyRaw(), input);
    return jsonToBase64(payload);
  }

  async decrypt(input: string): Promise<Uint8Array> {
    return decryptWithPrivateKey(this.privateKeyRaw(), JSON.parse(input));
  }

  async encryptToPublicKey(input: Uint8Array, publicKey: Uint8Array): Promise<string> {
    const payload = await encryptWithPublicKey(publicKey, input);
    return jsonToBase64(payload);
  }

  async sign(string: string) {
    const signingKey = this.signingPrivateKeyRaw();
    return signString(string, signingKey);
  }

  async getAddress() {
    const signingPublicKey = this.signingPublicKeyRaw();
    return deriveAddress(signingPublicKey);
  }

  /**
   * Create the wallet
   * - generate 12 word backup phrase
   * - if provided, encrypt backup phrase with password derived symmetric key
   * - derive wallet keys from backup phrase
   * @param {string} [password]
   * @returns {Promise.<AkordWallet>} Promise of AkordWallet object
   */
  static async create(password?: string): Promise<AkordWallet> {
    const backupPhrase = bip39.generateMnemonic();
    let encBackupPhrase: string;
    if (password) {
      encBackupPhrase = await encryptWithPassword(password, backupPhrase);
    }
    const akordWallet = new AkordWallet(backupPhrase, encBackupPhrase);
    await akordWallet.deriveKeys();
    return akordWallet;
  }

  /**
   * Import the wallet from the encrypted backup phrase
   * - decrypt the encrypted backup phrase with password derived symmetric key
   * - derive wallet keys from backup phrase
   * @param {string} password
   * @param {string} encBackupPhrase
   * @returns {Promise.<AkordWallet>} Promise of AkordWallet object
   */
  static async importFromEncBackupPhrase(password: string, encBackupPhrase: string): Promise<AkordWallet> {
    if (!password)
      throw new Error('Akord Wallet error: The password cannot be null.')
    if (!encBackupPhrase)
      throw new Error(
        'Akord Wallet error: The encrypted backup phrase cannot be null.'
      )

    const backupPhrase = await decryptWithPassword(password, encBackupPhrase)
    if (!this.isValidMnemonic(backupPhrase))
      throw new Error('Akord Wallet error: Invalid backup phrase.')
    const akordWallet = new AkordWallet(backupPhrase, encBackupPhrase)
    await akordWallet.deriveKeys()
    return akordWallet
  }


  /**
 * Import the wallet from the backup phrase
 * - derive wallet keys from backup phrase
 * @param {string} backupPhrase
 * @returns {Promise.<AkordWallet>} Promise of AkordWallet object
 */
  static async importFromBackupPhrase(backupPhrase: string): Promise<AkordWallet> {
    if (!backupPhrase)
      throw new Error(
        'Akord Wallet error: The encrypted backup phrase cannot be null.'
      )

    if (!this.isValidMnemonic(backupPhrase))
      throw new Error('Akord Wallet error: Invalid backup phrase.')
    const akordWallet = new AkordWallet(backupPhrase)
    await akordWallet.deriveKeys()
    return akordWallet
  }

  /**
   * Import the wallet from the keystore
   * - retrieve the password derived symmetric key from the keystore
   * - retrieve the encrypted backup phrase from the local storage
   * -
   * @param {string} encBackupPhrase
   * @returns {Promise.<AkordWallet>} Promise of AkordWallet object
   */
  static async importFromKeystore(encBackupPhrase: string): Promise<AkordWallet> {
    if (!encBackupPhrase) {
      throw new Error(
        'Akord Wallet error: The encrypted backup phrase cannot be null.'
      )
    }
    const keystore = await Keystore.instance();
    const passwordKey = await keystore.get('passwordKey')
    if (!passwordKey)
      throw new Error('Akord Wallet error: The password key cannot be null.')

    const parsedEncBackupPhrase = base64ToJson(encBackupPhrase) as any
    const plaintext = await decrypt(
      parsedEncBackupPhrase.encryptedPayload,
      passwordKey
    )
    const backupPhrase = arrayToString(plaintext)
    if (!this.isValidMnemonic(backupPhrase))
      throw new Error('Akord Wallet error: Invalid backup phrase.')

    const akordWallet = new AkordWallet(backupPhrase, encBackupPhrase)
    await akordWallet.deriveKeys()
    return akordWallet
  }

  /**
   * Import the wallet from the backup phrase
   * - encrypt backup phrase with new password derived symmetric key
   * - derive wallet keys from backup phrase
   * @param {string} newPassword
   * @param {string} backupPhrase
   * @returns {Promise.<AkordWallet>} Promise of AkordWallet object
   */
  static async recover(newPassword: string, backupPhrase: string): Promise<AkordWallet> {
    if (!this.isValidMnemonic(backupPhrase))
      throw new Error('Akord Wallet error: Invalid backup phrase.')
    const encBackupPhrase = await encryptWithPassword(newPassword, backupPhrase)
    const akordWallet = new AkordWallet(backupPhrase, encBackupPhrase)
    await akordWallet.deriveKeys()
    return akordWallet
  }

  static async changePassword(oldPassword: string, newPassword: string, encBackupPhrase: string): Promise<AkordWallet> {
    // decrypt backup phrase with the old password
    const backupPhrase = await decryptWithPassword(oldPassword, encBackupPhrase)
    if (!this.isValidMnemonic(backupPhrase))
      throw new Error('Akord Wallet error: Invalid backup phrase.')
    // encrypt backup phrase with the new password
    const newEncBackupPhrase = await encryptWithPassword(
      newPassword,
      backupPhrase
    )
    const akordWallet = new AkordWallet(backupPhrase, newEncBackupPhrase)
    await akordWallet.deriveKeys()
    return akordWallet
  }

  static async clear() {
    const keystore = await Keystore.instance()
    await keystore.delete('passwordKey')
  }

  static isValidMnemonic(backupPhrase: string) {
    return bip39.validateMnemonic(backupPhrase)
  }

  /**
   * Root node derivation from backup phrase
   * - derives the master seed from the backup phrase
   * - derives the root node from the master seed
   * @returns {Promise.<hdkey>} Promise of hdkey object with HD wallet root node
   */
  async getRoot(): Promise<HDKey> {
    const seed = await bip39.mnemonicToSeed(this.backupPhrase)
    return HDKey.fromMasterSeed(seed)
  }

  /**
   * Node derivation from backup phrase and given path
   * @param {string} path
   * @returns {Promise.<hdkey>} Promise of hdkey object with HD wallet node
   */
  async getNodeFromPath(path: string): Promise<HDKey> {
    const root = await this.getRoot()
    return root.derive(path)
  }

  /**
   * Public key derivation for the given path
   * @param {string} path
   * @returns {Promise.<string>} Promise of base64 string represents public key
   */
  async getPublicKeyFromPath(path: string): Promise<string> {
    const keyPair = await this.getKeyPairFromPath(path)
    return keyPair.publicKey
  }

  /**
   * Private key derivation for the given path
   * @param {string} path
   * @returns {Promise.<string>} Promise of base64 string represents private key
   */
  async getPrivateKeyFromPath(path: string): Promise<string> {
    const keyPair = await this.getKeyPairFromPath(path)
    return keyPair.privateKey
  }

  /**
   * Key pair derivation for the given path
   * @param {string} path
   * @returns {Promise.<{ publicKey: string, privateKey: string }>} Promise of JSON represents key pair
   */
  async getKeyPairFromPath(path: string): Promise<{ publicKey: string, privateKey: string }> {
    const node = await this.getNodeFromPath(path)
    await ready
    if (path === HD_ENCRYPTION_PATH) {
      const encryptionKeyPair = nacl.box.keyPair.fromSecretKey(node.privateKey)
      return {
        publicKey: arrayToBase64(encryptionKeyPair.publicKey),
        privateKey: arrayToBase64(encryptionKeyPair.secretKey)
      }
    }
    const signingKeyPair = crypto_sign_seed_keypair(node.privateKey)
    return {
      publicKey: arrayToBase64(signingKeyPair.publicKey),
      privateKey: arrayToBase64(signingKeyPair.privateKey)
    }
  }

  /**
   * Derive encryption and signing key pair for the wallet
   */
  async deriveKeys(): Promise<void> {
    const node = await this.getNodeFromPath(HD_ENCRYPTION_PATH)
    const signingNode = await this.getNodeFromPath(HD_SIGNING_PATH)
    await ready
    const encryptionKeyPair = nacl.box.keyPair.fromSecretKey(node.privateKey)
    this.encryptionKeyPair = {
      privateKey: encryptionKeyPair.secretKey,
      publicKey: encryptionKeyPair.publicKey,
      keyType: "x25519"
    }
    const signingKeyPair = crypto_sign_seed_keypair(signingNode.privateKey)
    this.keyPair.privateKey = encryptionKeyPair.secretKey
    this.keyPair.publicKey = encryptionKeyPair.publicKey
    this.signingKeyPair.privateKey = signingKeyPair.privateKey
    this.signingKeyPair.publicKey = signingKeyPair.publicKey
  }

  /**
   * Encryption private key
   * @returns {Uint8Array}
   */
  privateKeyRaw(): Uint8Array {
    return this.keyPair.privateKey
  }

  /**
   * Encryption public key
   * @returns {Uint8Array}
   */
  publicKeyRaw(): Uint8Array {
    return this.keyPair.publicKey
  }

  /**
   * Encryption private key as a string
   * @returns {string}
   */
  privateKey(): string {
    return arrayToBase64(this.keyPair.privateKey)
  }

  /**
   * Encryption public key as a string
   * @returns {string}
   */
  publicKey(): string {
    return arrayToBase64(this.keyPair.publicKey)
  }

  /**
   * Signing private key
   * @returns {Uint8Array}
   */
  signingPrivateKeyRaw(): Uint8Array {
    return this.signingKeyPair.privateKey
  }

  /**
   * Signing public key
   * @returns {Uint8Array}
   */
  signingPublicKeyRaw(): Uint8Array {
    return this.signingKeyPair.publicKey
  }

  /**
   * Signing private key as a string
   * @returns {string}
   */
  signingPrivateKey(): string {
    return arrayToBase64(this.signingKeyPair.privateKey)
  }

  /**
   * Signing public key as a string
   * @returns {string}
   */
  signingPublicKey(): string {
    return arrayToBase64(this.signingKeyPair.publicKey)
  }
}

/**
 * Encryption with key derived from password
 * - generate random salt
 * - derive the encryption key from password and salt
 * - encrypt plaintext with the derived key
 * @param {string} password
 * @param {string} plaintext utf-8 string plaintext
 * @returns {Promise.<string>} Promise of string represents stringified payload
 */
async function encryptWithPassword(password: string, plaintext: string): Promise<string> {
  try {
    const salt = crypto.getRandomValues(
      new Uint8Array(SALT_LENGTH)
    )
    const derivedKey = await deriveKey(password, salt)

    // const keystore = await Keystore.instance();
    // await keystore.store('passwordKey', derivedKey)

    const encryptedPayload = await encrypt(
      stringToArray(plaintext),
      derivedKey
    )

    console.log(encryptedPayload)

    const payload = {
      encryptedPayload: encryptedPayload,
      salt: arrayToBase64(salt)
    }
    return jsonToBase64(payload)
  } catch (err) {
    throw new Error('Akord Wallet error: encrypt with password: ' + err)
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
async function decryptWithPassword(password: string, strPayload: string): Promise<string> {
  try {
    console.log(password)
    const parsedPayload = base64ToJson(strPayload) as any

    console.log(parsedPayload)
    const encryptedPayload = parsedPayload.encryptedPayload
    const salt = base64ToArray(parsedPayload.salt)

    const derivedKey = await deriveKey(password, salt)

    // const keystore = await Keystore.instance();
    // await keystore.store('passwordKey', derivedKey)

    const plaintext = await decrypt(encryptedPayload, derivedKey)
    return arrayToString(plaintext)
  } catch (err) {
    throw new Error('Akord Wallet error: decrypt with password: ' + err)
  }
}

export {
  AkordWallet
}