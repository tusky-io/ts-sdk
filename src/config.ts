import { Wallet } from "@akord/crypto"
import { Api } from "./api/api"
import { Plugin } from "./plugin"
import { Signer } from "./signer"
import { Env } from "./env"

export interface ClientConfig {
  env?: Env
  signer?: Signer,
  encrypter?: Wallet,
  debug?: boolean
  logToFile?: boolean
  cache?: boolean
  api?: Api
  storage?: Storage
  plugins?: [Plugin]
  authToken?: string
  apiKey?: string,
  userAgent?: string
}