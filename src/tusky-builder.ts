import {
  ApiKeyConfig,
  AuthTokenProviderConfig,
  AuthType,
  OAuthConfig,
  WalletConfig,
} from "./types/auth";
import { Tusky } from "./tusky";
import { UserEncryption } from "./crypto/user-encryption";
import { Encrypter } from "./crypto/encrypter";
import { Signer } from "./signer";
import { Env } from "./types";
import { Auth, AuthOptions } from "./auth";
import { ClientConfig, EncrypterConfig, LoggerConfig } from "./config";
import { ConsoleLogger, Logger, setLogger } from "./logger";
import TuskyApi from "./api/tusky-api";
import PubSub from "./api/pubsub";
import { defaultStorage } from "./auth/jwt";

export class TuskyBuilder {
  private _signer: Signer;
  private _encrypterConfig: EncrypterConfig;
  private _encrypter: Encrypter;
  private _userEncryption: UserEncryption;
  private _env: Env;
  private _storage: Storage;
  private _auth: Auth;
  private _authType: AuthType;
  private _authOptions: AuthOptions;
  private _logger: Logger;

  useOAuth(config: OAuthConfig): TuskyBuilder {
    this._authType = "OAuth";
    this._authOptions = config;
    return this;
  }

  useWallet(config: WalletConfig): TuskyBuilder {
    this._authType = "Wallet";
    this._authOptions = config;
    return this;
  }

  useApiKey(config: ApiKeyConfig): TuskyBuilder {
    this._authType = "ApiKey";
    this._authOptions = config;
    return this;
  }

  useAuthTokenProvider(config: AuthTokenProviderConfig): TuskyBuilder {
    this._authType = "AuthTokenProvider";
    this._authOptions = config;
    return this;
  }

  useLogger(config: LoggerConfig): this {
    this._logger = config.logger ? config.logger : new ConsoleLogger(config);
    return this;
  }

  useStorage(storage: Storage): this {
    this._storage = storage;
    if (this._auth) {
      this._auth.setStorage(storage);
    }
    return this;
  }

  useSigner(signer: Signer): this {
    this._signer = signer;
    return this;
  }

  useEncrypter(config: EncrypterConfig): this {
    this._encrypterConfig = config;
    return this;
  }

  useEnv(env: Env): this {
    this._env = env;
    this._auth?.setEnv(this._env);
    return this;
  }

  private getConfig(): ClientConfig {
    return {
      auth: this._auth,
      signer: this._signer,
      encrypter: this._encrypter,
      env: this._env,
      logger: this._logger,
      storage: this._storage,
    };
  }

  async build(): Promise<Tusky> {
    this._storage = this._storage || defaultStorage();
    this._userEncryption = new UserEncryption(this.getConfig());
    const auth = new Auth({
      ...this.getConfig(),
      ...this._authOptions,
      authType: this._authType,
    });
    const tusky = new Tusky({
      ...this.getConfig(),
      auth: auth,
      env: this._env,
      api: new TuskyApi({ ...this.getConfig(), auth: auth }),
    });
    tusky.pubsub = new PubSub({ env: this._env });
    await tusky.setEncrypter(this._encrypterConfig);
    setLogger(this._logger);
    return tusky;
  }
}
