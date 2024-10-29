import { Storage } from "./storage";

export class User {
  address: string;
  email?: string;
  name?: string;
  picture?: string;
  termsAccepted?: boolean;
  storage: Storage;
  guest?: boolean;
  publicKey?: string;
  encPrivateKey?: string;
  encPrivateKeyBackup?: string;

  constructor(json: any) {
    this.address = json.address;
    this.email = json.email;
    this.name = json.name;
    this.picture = json.picture;
    this.termsAccepted = json.termsAccepted;
    this.publicKey = json.publicKey;
    this.encPrivateKey = json.encPrivateKey;
    this.encPrivateKeyBackup = json.encPrivateKeyBackup;
    this.storage = json.storage ? new Storage(json.storage) : json.storage;
    this.guest = json.guest;
  }
}

export type UserMutable = {
  name?: string;
  picture?: string;
  termsAccepted?: boolean; // by setting it to true, the user accepts following terms: https://tusky.io/terms-of-service-consumer
  publicKey?: string; // encryption public key
  encPrivateKey?: string; // encrypted user private key using user password
  encPrivateKeyBackup?: string; // encrypted user private key using user backup phrase
};

export type UserPublicInfo = {
  address: string;
  publicSigningKey: string;
  publicKey: string;
};
