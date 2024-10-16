import { decryptWithPrivateKey, encryptWithPublicKey } from './lib';
import { base64ToJson, jsonToBase64 } from './encoding';
import { X25519KeyPair } from './keypair';
import { X25519EncryptedPayload } from './types';
import { IncorrectEncryptionKey } from '../errors/incorrect-encryption-key';

export default class Encrypter {

  keypair: X25519KeyPair;

  constructor(config: { keypair?: X25519KeyPair }) {
    this.keypair = config.keypair
    if (!this.keypair) {
      throw new IncorrectEncryptionKey(new Error("Missing keypair configuration. Please provide X25519 key pair."));
    }
  }

  async encrypt(data: string | Uint8Array): Promise<string> {
    const encryptedPayload = await encryptWithPublicKey(this.keypair.publicKey, data);
    return jsonToBase64(encryptedPayload);
  }

  async decrypt(data: string): Promise<Uint8Array> {
    return decryptWithPrivateKey(this.keypair.getPrivateKey(), base64ToJson(data) as X25519EncryptedPayload);
  }
}

export {
  Encrypter
}