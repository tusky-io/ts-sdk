import { FileModule } from "../file";
import { File } from "../../";
import Encrypter from "../../crypto/encrypter";
import { fromByteArray, toByteArray } from "base64-js";
import AesGcmCrypto from "react-native-aes-gcm-crypto";
import * as NativeFileSystem from "react-native-fs";
import { VaultEncryption } from "../../crypto/vault-encryption";
import { UserEncryption } from "../../crypto/user-encryption";
import { ClientConfig } from "../../config";

const DEFAULT_CHUNK_SIZE = 5000000; // 5 MB
const IV_SIZE = 12;
const TAG_SIZE = 16;

class ReactNativeFileModule extends FileModule {
  userEncryption: UserEncryption;
  constructor(config?: ClientConfig) {
    super();
    this.userEncryption = new UserEncryption(config);
  }

  public async readToPath(
    id: string,
    options: {
      onProgress?: (percent: number) => void;
      outputPath?: string;
    } = {},
  ) {
    const file = await this.get(id);
    let path =
      options.outputPath ||
      `${NativeFileSystem.DocumentDirectoryPath}/${file.name}`;

    if (!file.__encrypted__) {
      const inputPath = await this.downloadFile(file);
      return inputPath;
    } else {
      await this.decryptToPath(file, options.onProgress);
    }
    return path;
  }

  private async decryptToPath(
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<string> {
    const destinationPath = `${NativeFileSystem.DocumentDirectoryPath}/${file.name}`;
    // Check if already cached
    const fileExists = await NativeFileSystem.exists(destinationPath);
    if (fileExists) {
      if (onProgress) onProgress(100);
      return destinationPath;
    }
    const { keypair } = await this.userEncryption.importFromKeystore();
    const userEncrypter = new Encrypter({ keypair: keypair });
    const vaultEncryption = new VaultEncryption({
      vaultKeys: file.__keys__,
      userEncrypter: userEncrypter,
    });

    console.log("File chunk size: " + file.chunkSize);
    console.log("File chunk number: " + file.numberOfChunks);

    const aesKey = await vaultEncryption.decryptAesKey(
      file.encryptedAesKey as string,
    );
    const start = performance.now();
    const inputPath = await this.downloadFile(file);

    const outputPath = await this.processFile(
      file,
      inputPath,
      aesKey,
      onProgress,
    );
    const end = performance.now();
    console.log(`[time] Full file decryption took ${end - start} ms`);
    return outputPath;
  }

  private async downloadFile(file: File): Promise<string> {
    const url = `https://cdn.tusky.io/${file.id}`;

    const destinationPath = `${NativeFileSystem.DocumentDirectoryPath}/encrypted-${Date.now()}-${file.name}`;

    const start = performance.now();
    console.log(`Downloading file from ${url}`);
    console.log(`Saving to: ${destinationPath}`);

    try {
      const downloadResult = NativeFileSystem.downloadFile({
        fromUrl: url,
        toFile: destinationPath,
        background: true,
        discretionary: true,
      });

      const { statusCode, bytesWritten } = await downloadResult.promise;

      if (statusCode === 200) {
        const end = performance.now();
        console.log(`Download complete: ${bytesWritten} bytes written`);
        console.log(`[time] File download took ${end - start} ms`);
        return destinationPath;
      } else {
        throw new Error(`Download failed with status code ${statusCode}`);
      }
    } catch (err) {
      console.error("File download failed:", err);
      throw err;
    } finally {
      await NativeFileSystem.exists(destinationPath);
    }
  }

  private toHexNative(uint8: Uint8Array): string {
    let hex = "";
    for (let i = 0; i < uint8.length; i++) {
      hex += uint8[i].toString(16).padStart(2, "0");
    }
    return hex;
  }

  private async processFile(
    file: File,
    inputPath: string,
    aesKey: Uint8Array,
    onProgress?: (percent: number) => void,
  ): Promise<string> {
    const outputPath = `${NativeFileSystem.DocumentDirectoryPath}/${file.name}`;

    // Initialize empty file
    await NativeFileSystem.writeFile(outputPath, "", "base64");
    try {
      const stats = await NativeFileSystem.stat(inputPath);
      const fileSize = stats.size;
      let offset = 0;
      while (offset < fileSize) {
        console.log(`Reading chunk at offset: ${offset}`);
        const startReading = performance.now();

        const chunkSize = Math.min(
          file.chunkSize || DEFAULT_CHUNK_SIZE,
          fileSize - offset,
        );

        // chunk has the following format [IV_BYTES][CIPHERTEXT_BYTES][TAG_BYTES]
        const ciphertextSize = chunkSize - IV_SIZE - TAG_SIZE; // remaining bytes for ciphertext

        // retrieve iv bytes
        const ivB64 = await NativeFileSystem.read(
          inputPath,
          IV_SIZE,
          offset,
          "base64",
        );

        // retrieve ciphertext bytes
        const ciphertextB64 = await NativeFileSystem.read(
          inputPath,
          ciphertextSize,
          offset + IV_SIZE,
          "base64",
        );

        // retrieve auth tag bytes
        const tagB64 = await NativeFileSystem.read(
          inputPath,
          TAG_SIZE,
          offset + IV_SIZE + ciphertextSize,
          "base64",
        );

        const endReading = performance.now();

        console.log(`[time] File reading took ${endReading - startReading} ms`);

        const startTransforming = performance.now();

        console.log(`Decrypting chunk at offset ${offset}...`);
        const aesKeyB64 = fromByteArray(aesKey);
        const ivHex = this.toHexNative(toByteArray(ivB64));
        const tagHex = this.toHexNative(toByteArray(tagB64));

        const endTransforming = performance.now();

        console.log(
          `[time] Tranforming ciphertext took ${endTransforming - startTransforming} ms`,
        );

        const startAes = performance.now();

        const clearTextB64 = await AesGcmCrypto.decrypt(
          ciphertextB64,
          aesKeyB64,
          ivHex,
          tagHex,
          true,
        );
        const endAes = performance.now();
        console.log(`[time] AES ciphertext took ${endAes - startAes} ms`);

        const startReading2 = performance.now();

        await NativeFileSystem.appendFile(outputPath, clearTextB64, "base64");
        const endReading2 = performance.now();

        console.log(
          `[time] File appending took ${endReading2 - startReading2} ms`,
        );

        offset += chunkSize;

        if (onProgress) {
          let estimatedProgress;
          estimatedProgress = Math.min((offset / fileSize) * 100, 95);
          onProgress(estimatedProgress);
        }
      }
      console.log("Decryption complete");
      // unlink encrypted file cache
      await NativeFileSystem.unlink(inputPath);
      return outputPath;
    } catch (error) {
      console.error("Error during chunk decryption:", error);
      await NativeFileSystem.unlink(inputPath);
      throw new Error("Error during chunk decryption");
    }
  }
}

export { ReactNativeFileModule as FileModule };
