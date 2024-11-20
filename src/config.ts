import { Api } from "./api/api";
import { Signer } from "./signer";
import { Env } from "./types/env";
import { Encrypter } from "./crypto/encrypter";
import { Logger, LogLevel } from "./logger";
import { AuthTokenProvider, AuthType } from "./types/auth";
import { Auth } from "./auth";

export interface ClientConfig {
  env?: Env;
  signer?: Signer;
  encrypter?: Encrypter;
  logLevel?: LogLevel;
  logToFile?: boolean;
  cache?: boolean;
  api?: Api;
  storage?: Storage;
  authTokenProvider?: AuthTokenProvider;
  apiKey?: string;
  clientName?: string; // name of the client consuming the API
  autoExecute?: boolean; // if set to true, transactions will be admin signed & executed,
  authType?: AuthType;
}

export interface LoggerConfig {
  logLevel?: LogLevel; // ex: debug
  logToFile?: boolean;
  logger?: Logger;
}

export interface EncrypterConfig {
  encrypter?: Encrypter;
  password?: string; // password to decrypt user's encryption key
  keystore?: boolean; // indicate whether should import the key from the keystore
}

export interface ApiConfig {
  api?: Api;
  env?: Env;
  clientName?: string;
  autoExecute?: boolean;
  auth?: Auth;
}

export interface PubSubConfig {
  env?: Env;
}
