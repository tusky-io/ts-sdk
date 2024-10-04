import { x25519 } from '@noble/curves/ed25519';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

// Encryption key pair
export class X25519KeyPair {
  private privateKey: Uint8Array;
  public publicKey: Uint8Array;

  constructor(privateKey?: Uint8Array) {
    if (privateKey) {
      this.privateKey = privateKey;
      this.publicKey = x25519.getPublicKey(privateKey);
    } else {
      this.privateKey = x25519.utils.randomPrivateKey();
      this.publicKey = x25519.getPublicKey(this.privateKey);
    }
  }

  getPrivateKey(): Uint8Array {
    return this.privateKey;
  }

  getPublicKey(): Uint8Array {
    return this.publicKey;
  }

  getPrivateKeyHex(): string {
    return bytesToHex(this.privateKey);
  }

  getPublicKeyHex(): string {
    return bytesToHex(this.publicKey);
  }

  static fromPrivateKeyHex(hexPrivateKey: string): X25519KeyPair {
    const privateKey = hexToBytes(hexPrivateKey);
    return new X25519KeyPair(privateKey);
  }
}