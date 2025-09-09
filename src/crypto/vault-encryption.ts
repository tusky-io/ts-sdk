import { EncryptedVaultKeyPair } from "types";
import { Encrypter } from "./encrypter";
import { X25519KeyPair } from "./keypair";
import {
  decryptAes,
  encryptAes,
  encryptWithPublicKey,
  SYMMETRIC_KEY_LENGTH,
} from "./lib";
import { base64ToArray, base64ToJson, jsonToBase64 } from "./encoding";
import {
  AESEncryptedPayload,
  EncryptedPayload,
  X25519EncryptedPayload,
} from "./types";
import { IncorrectEncryptionKey } from "../errors/incorrect-encryption-key";

export class VaultEncryption {
  currentPublicKey: string;

  private vaultKeys: EncryptedVaultKeyPair[];

  private userEncrypter?: Encrypter;

  constructor(
    config: {
      vaultKeys?: EncryptedVaultKeyPair[];
      userEncrypter?: Encrypter;
    } = {},
  ) {
    if (!config.vaultKeys || config.vaultKeys.length === 0) {
      throw new Error("Keys are required for vault encryption.");
    }
    this.vaultKeys = config.vaultKeys;
    this.currentPublicKey = this.vaultKeys[this.vaultKeys.length - 1].publicKey;
    this.userEncrypter = config.userEncrypter;
  }

  async generateAesKey(): Promise<AESKeyPayload> {
    const { randomBytes } = await import("@noble/hashes/utils");
    const keyBuffer = randomBytes(SYMMETRIC_KEY_LENGTH);
    const encryptedAesKey = await encryptWithPublicKey(
      base64ToArray(this.currentPublicKey),
      keyBuffer,
    );
    return { aesKey: keyBuffer, encryptedAesKey };
  }

  async decryptAesKey(encryptedAesKey: string): Promise<Uint8Array> {
    const encryptedAesKeyJson = base64ToJson(
      encryptedAesKey,
    ) as X25519EncryptedPayload;

    // decrypt vault's private key
    const privateKey = await this.decryptVaultPrivateKey(encryptedAesKeyJson);

    // decrypt AES key with vault's private key
    const vaultEncrypter = new Encrypter({
      keypair: new X25519KeyPair(privateKey),
    });
    const decryptedKey = await vaultEncrypter.decrypt(encryptedAesKey);
    return new Uint8Array(decryptedKey);
  }

  async encryptHybrid(data: Uint8Array): Promise<string> {
    const { aesKey, encryptedAesKey } = await this.generateAesKey();

    const encryptedData = (await encryptAes(data, aesKey)) as string;

    const encryptedPayload = {
      encryptedData: base64ToJson(encryptedData) as AESEncryptedPayload,
      encryptedKey: encryptedAesKey,
    } as EncryptedPayload;
    return jsonToBase64(encryptedPayload);
  }

  async decryptHybrid(encryptedPayload: string): Promise<Uint8Array> {
    const payload = base64ToJson(encryptedPayload) as EncryptedPayload;

    // decrypt AES key
    const aesKey = await this.decryptAesKey(jsonToBase64(payload.encryptedKey));

    const decryptedDataArray = await decryptAes(
      jsonToBase64(payload.encryptedData),
      aesKey,
    );
    return new Uint8Array(decryptedDataArray);
  }

  async decryptVaultPrivateKey(
    encryptedPayload: X25519EncryptedPayload,
  ): Promise<Uint8Array> {
    const vaultEncPrivateKey = this.vaultKeys.find(
      (key) => key.publicKey === encryptedPayload.publicKey,
    ).encPrivateKey;
    if (!vaultEncPrivateKey) {
      throw new IncorrectEncryptionKey(
        new Error("Missing file encryption context."),
      );
    }
    if (!this.userEncrypter) {
      throw new IncorrectEncryptionKey(
        new Error("Missing user encryption context."),
      );
    }
    const privateKey = await this.userEncrypter.decrypt(vaultEncPrivateKey);
    return privateKey;
  }
}

export type AESKeyPayload = {
  aesKey: Uint8Array;
  encryptedAesKey: X25519EncryptedPayload;
};
