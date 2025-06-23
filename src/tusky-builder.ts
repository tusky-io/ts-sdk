import { OAuthConfig, WalletConfig } from "./types/auth";
import { Tusky } from "./tusky";
import { Encrypter } from "./crypto/encrypter";
import { DEFAULT_ENV, Env } from "./types";
import { Auth, AuthConfig } from "./auth";
import { ClientConfig, EncrypterConfig, LoggerConfig } from "./config";
import { ConsoleLogger, Logger, setLogger } from "./logger";
import TuskyApi from "./api/tusky-api";
import PubSub from "./api/pubsub";
import { defaultStorage } from "./auth/jwt";
import { Storage } from "./util/storage";

export class TuskyBuilder {
  private _encrypterConfig: EncrypterConfig;
  private _encrypter: Encrypter;
  private _env: Env;
  private _storage: Storage;
  private _auth: Auth;
  private _authConfig: AuthConfig;
  private _logger: Logger;
  private _clientName: string;

  useOAuth(config: OAuthConfig): TuskyBuilder {
    this._authConfig = { oauth: config };
    return this;
  }

  useWallet(config: WalletConfig): TuskyBuilder {
    this._authConfig = { wallet: config };
    return this;
  }

  useApiKey(apiKey: string): TuskyBuilder {
    this._authConfig = { apiKey: apiKey };
    return this;
  }

  useLogger(config: LoggerConfig): this {
    this._logger = config.logger ? config.logger : new ConsoleLogger(config);
    return this;
  }

  useStorage(storage: Storage): this {
    this._storage = storage;
    return this;
  }

  useEncrypter(config: EncrypterConfig): this {
    this._encrypterConfig = config;
    return this;
  }

  useClientName(clientName: string): this {
    this._clientName = clientName;
    return this;
  }

  useEnv(env: Env): this {
    this._env = env;
    return this;
  }

  private getConfig(): ClientConfig {
    return {
      auth: this._auth,
      encrypter: this._encrypter,
      env: this._env,
      logger: this._logger,
      storage: this._storage,
      clientName: this._clientName,
    };
  }

  async build(): Promise<Tusky> {
    this._env = this._env || DEFAULT_ENV;
    this._storage = this._storage || defaultStorage();
    const auth = new Auth({
      ...this.getConfig(),
      ...this._authConfig,
    });
    const tusky = new Tusky({
      ...this.getConfig(),
      auth: auth,
      env: this._env,
      api: new TuskyApi({ ...this.getConfig(), auth: auth }),
    });
    tusky.pubsub = new PubSub({ env: this._env });
    await tusky.addEncrypter(this._encrypterConfig);
    setLogger(this._logger);
    return tusky;
  }
}
