import { decryptAes, decryptWithPrivateKey, encryptAes, encryptWithPublicKey, exportKeyToArray, generateKey, importKeyFromArray } from './lib';
import { base64ToJson, jsonToBase64 } from './encoding';
import { X25519KeyPair } from './keypair';
import { AESEncryptedPayload, EncryptedPayload, X25519EncryptedPayload } from './types';
import { IncorrectEncryptionKey } from '../errors/incorrect-encryption-key';

export default class Encrypter {

  keypair: X25519KeyPair;
  publicKey: Uint8Array;

  constructor(config: { keypair?: X25519KeyPair, publicKey?: Uint8Array }) {
    this.keypair = config.keypair
    this.publicKey = config.publicKey || this.keypair?.getPublicKey();
    if (!this.publicKey) {
      throw new IncorrectEncryptionKey(new Error("Missing public key configuration. Please provide X25519 public key."));
    }
  }

  async encrypt(data: string | Uint8Array): Promise<string> {
    const encryptedPayload = await encryptWithPublicKey(this.publicKey, data);
    return jsonToBase64(encryptedPayload);
  }

  async decrypt(data: string): Promise<Uint8Array> {
    if (!this.keypair) {
      throw new IncorrectEncryptionKey(new Error("Missing keypair configuration. Please provide X25519 key pair."));
    }
    return decryptWithPrivateKey(this.keypair.getPrivateKey(), base64ToJson(data) as X25519EncryptedPayload);
  }

  async encryptHybrid(data: Uint8Array): Promise<string> {
    const aesKey = await generateKey();
    const encryptedData = await encryptAes(
      data,
      aesKey,
    ) as string;
    const keyBuffer = await exportKeyToArray(aesKey)
    const encryptedAesKey = await encryptWithPublicKey(
      this.publicKey,
      keyBuffer
    );
    const encryptedPayload = {
      encryptedData: base64ToJson(encryptedData) as AESEncryptedPayload,
      encryptedKey: encryptedAesKey,
    } as EncryptedPayload;
    return jsonToBase64(encryptedPayload)
  }

  async decryptHybrid(encryptedPayload: string): Promise<Uint8Array> {
    if (!this.keypair) {
      throw new IncorrectEncryptionKey(new Error("Missing keypair configuration. Please provide X25519 key pair."));
    }
    const payload = base64ToJson(encryptedPayload as string) as EncryptedPayload;
    const decryptedKey = await decryptWithPrivateKey(this.keypair.getPrivateKey(), payload.encryptedKey)
    const aesKey = await importKeyFromArray(decryptedKey)
    const decryptedDataArray = await decryptAes(
      jsonToBase64(payload.encryptedData),
      aesKey,
    )
    return new Uint8Array(decryptedDataArray);
  }
}

export {
  Encrypter
}