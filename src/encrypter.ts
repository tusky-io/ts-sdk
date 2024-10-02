import { decryptWithPrivateKey, encryptWithPublicKey } from './crypto/lib';
import { KeyPair } from 'libsodium-wrappers';
import { base64ToJson, jsonToBase64 } from './crypto';

export default class Encrypter {

  keypair: KeyPair;

  constructor(config: { keypair?: KeyPair }) {
    this.keypair = config.keypair
    if (!this.keypair) {
      throw new Error("Missing keypair configuration. Please provide Enoki key pair or inject the wallet.");
    }
  }

  async encrypt(data: string | Uint8Array): Promise<string> {
    const encryptedPayload = await encryptWithPublicKey(this.keypair.publicKey, data);
    return jsonToBase64(encryptedPayload);
  }

  async decrypt(data: string): Promise<Uint8Array> {
    return decryptWithPrivateKey(this.keypair.privateKey, base64ToJson(data) as Ed25519EncryptedPayload);
  }
}

export type Ed25519EncryptedPayload = {
  ciphertext: string,
  nonce: string,
  ephemPublicKey: string,
  publicKey: string,
}

export {
  Encrypter
}