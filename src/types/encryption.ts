import { encryptionTags } from "../constants";

export interface EncryptionTags {
  [encryptionTags.IV]: string;
  [encryptionTags.ENCRYPTED_KEY]: string;
  [encryptionTags.PUBLIC_ADDRESS]: string;
}

export type EncryptionMetadata = {
  encryptedKey?: string,
  iv?: string
}