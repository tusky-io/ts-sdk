import { decryptWithPrivateKey, encryptWithPublicKey } from "./lib";
import { base64ToJson, jsonToBase64 } from "./encoding";
import { X25519KeyPair } from "./keypair";
import { X25519EncryptedPayload } from "./types";
import { IncorrectEncryptionKey } from "../errors/incorrect-encryption-key";

export const MISSING_ENCRYPTION_ERROR_MESSAGE =
  "Missing encryption context. Please configure it with tusky.addEncrypter()";

export default class Encrypter {
  keypair: X25519KeyPair;
  publicKey: Uint8Array;

  constructor(config: { keypair?: X25519KeyPair; publicKey?: Uint8Array }) {
    this.keypair = config.keypair;
    this.publicKey = config.publicKey || this.keypair?.getPublicKey();
    if (!this.publicKey) {
      throw new IncorrectEncryptionKey(
        new Error(
          "Missing public key configuration. Please provide X25519 public key.",
        ),
      );
    }
  }

  async encrypt(data: string | Uint8Array): Promise<string> {
    const encryptedPayload = await encryptWithPublicKey(this.publicKey, data);
    return jsonToBase64(encryptedPayload);
  }

  async decrypt(data: string): Promise<Uint8Array> {
    if (!this.keypair) {
      throw new IncorrectEncryptionKey(
        new Error(
          "Missing keypair configuration. Please provide X25519 key pair.",
        ),
      );
    }
    return decryptWithPrivateKey(
      this.keypair.getPrivateKey(),
      base64ToJson(data) as X25519EncryptedPayload,
    );
  }
}

export { Encrypter };
