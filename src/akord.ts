import { Api } from "./api/api";
import { AkordApi } from "./api/akord-api";
import { ApiKeyConfig, AuthTokenProviderConfig, ClientConfig, LoggerConfig, OAuthConfig, WalletConfig } from "./config";
import { Logger } from "./logger";
import { FolderModule } from "./core/folder";
import { MembershipModule } from "./core/membership";
import { VaultModule } from "./core/vault";
import { CacheBusters } from "./types/cacheable";
import { FileModule } from "./core/file";
import { Plugins } from "./plugin";
import { StorageModule } from "./core/storage";
import { Signer } from "./signer";
import { Env } from "./env";
import { Auth } from "./auth";
import { MeModule } from "./core/me";
import { ApiKeyModule } from "./core/api-key";
import { Encrypter } from "./encrypter";
import { PaymentModule } from "./core/payment";
import { TrashModule } from "./core/trash";

export class Akord {
  public api: Api;
  private _signer: Signer;
  private _encrypter: Encrypter;
  private _env: Env;
  private _userAgent: string;

  get me(): MeModule {
    return new MeModule(this.getConfig());
  }
  get folder(): FolderModule {
    return new FolderModule(this.getConfig());
  }
  get membership(): MembershipModule {
    return new MembershipModule(this.getConfig());
  }
  get vault(): VaultModule {
    return new VaultModule(this.getConfig());
  }
  get file(): FileModule {
    return new FileModule(this.getConfig());
  }
  get trash(): TrashModule {
    return new TrashModule(this.getConfig());
  }
  get apiKey(): ApiKeyModule {
    return new ApiKeyModule(this.getConfig());
  }
  get storage(): StorageModule {
    return new StorageModule(this.getConfig());
  }
  get payment(): PaymentModule {
    return new PaymentModule(this.getConfig());
  }

  static useOAuth(config: OAuthConfig): Akord {
    const instance = new Akord({ ...config, authType: "OAuth" });
    return instance;
  }

  static useWallet(config: WalletConfig): Akord {
    const instance = new Akord({ ...config, authType: "Wallet" });
    return instance;
  }

  static useApiKey(config: ApiKeyConfig): Akord {
    const instance = new Akord({ ...config, authType: "ApiKey" });
    return instance;
  }

  static useAuthTokenProvider(config: AuthTokenProviderConfig): Akord {
    const instance = new Akord({ ...config, authType: "AuthTokenProvider" });
    return instance;
  }

  async signIn(): Promise<this> {
    await Auth.signIn();
    return this;
  }

  useLogger(config: LoggerConfig): this {
    Logger.debug = config?.debug;
    Logger.logToFile = config?.logToFile;
    return this;
  }

  useSigner(signer: Signer): this {
    this._signer = signer;
    return this;
  }

  useEncrypter(encrypter: Encrypter): this {
    this._encrypter = encrypter;
    return this;
  }

  env(env: Env): this {
    this._env = env;
    return this;
  }

  userAgent(userAgent: string): this {
    this._userAgent = userAgent;
    return this;
  }

  private getConfig() {
    return {
      api: this.api,
      signer: this._signer,
      encrypter: this._encrypter,
      userAgent: this._userAgent
    }
  }

  /**
   * @param  {ClientConfig} config
   */
  constructor(config: ClientConfig = {}) {
    this._signer = config.signer;
    this._encrypter = config.encrypter;
    this._env = config.env || 'testnet';
    this.api = config.api ? config.api : new AkordApi(config);
    this._userAgent = config.userAgent;
    Auth.configure(config);
    Plugins.register(config?.plugins, this._env);
    Logger.debug = config?.debug;
    Logger.logToFile = config?.logToFile;
    CacheBusters.cache = config?.cache;
  }
}
