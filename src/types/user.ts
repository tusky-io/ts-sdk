import { Storage } from "./storage"

export class User {
  address: string
  publicSigningKey: string
  publicKey: string
  email: string
  name?: string
  picture?: string
  termsAccepted?: boolean
  storage: Storage
  encPrivateKey?: string;
  encPrivateKeyBackup?: string;

  constructor(json: any) {
    this.address = json.address
    this.publicSigningKey = json.publicSigningKey
    this.publicKey = json.publicKey
    this.email = json.email
    this.name = json.name
    this.picture = json.picture
    this.termsAccepted = json.termsAccepted
    this.encPrivateKey = json.encPrivateKey
    this.encPrivateKeyBackup = json.encPrivateKeyBackup
    this.storage = new Storage(json.storage)
  }
}

export type UserMutable = {
  name?: string,
  picture?: string,
  termsAccepted?: boolean // by setting it to true, the user accepts following terms: https://akord.com/terms-of-service-consumer
  encPrivateKey?: string // encrypted user private key using user password
  encPrivateKeyBackup?: string // encrypted user private key using user backup phrase
}

export type UserPublicInfo = {
  address: string,
  publicSigningKey: string,
  publicKey: string
}
