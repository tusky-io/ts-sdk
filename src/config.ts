import { Api } from "./api/api"
import { Plugin } from "./plugin"
import { Signer } from "./signer"
import { Env } from "./env"
import { Encrypter } from "./encrypter"
import { AuthType } from "./types/auth"

export interface ClientConfig {
  env?: Env
  signer?: Signer,
  encrypter?: Encrypter,
  debug?: boolean
  logToFile?: boolean
  cache?: boolean
  api?: Api
  storage?: Storage
  plugins?: [Plugin]
  authTokenProvider?: () => Promise<string>
  apiKey?: string,
  userAgent?: string,
  autoExecute?: boolean // if set to true, transactions will be admin signed & executed,
  authType?: AuthType
}

export interface LoggerConfig {
  debug: boolean
  logToFile: boolean
}