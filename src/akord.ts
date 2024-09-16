import { Api } from "./api/api";
import { AkordApi } from "./api/akord-api";
import { ApiConfig, ClientConfig, EncrypterConfig, LoggerConfig } from "./config";
import { ApiKeyConfig, AuthTokenProviderConfig, OAuthConfig, WalletConfig } from "./types/auth";
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
import { AkordWallet } from "./crypto";

export class Akord {
  public api: Api;
  public address: string;
  private _signer: Signer;
  private _encrypter: Encrypter;
  private _env: Env;

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

  static withOAuth(config: OAuthConfig): Akord {
    const instance = new Akord({ ...config, authType: "OAuth" });
    return instance;
  }

  static withWallet(config: WalletConfig): Akord {
    const instance = new Akord({ ...config, authType: "Wallet" });
    return instance;
  }

  static withApiKey(config: ApiKeyConfig): Akord {
    const instance = new Akord({ ...config, authType: "ApiKey" });
    return instance;
  }

  static withAuthTokenProvider(config: AuthTokenProviderConfig): Akord {
    const instance = new Akord({ ...config, authType: "AuthTokenProvider" });
    return instance;
  }

  async signIn(): Promise<this> {
    const { address } = await Auth.signIn();
    this.setAddress(address);
    return this;
  }

  signOut(): this {
    Auth.signOut();
    this.setAddress(undefined);
    return this;
  }

  async initOAuthFlow(): Promise<this> {
    await Auth.initOAuthFlow();
    return this;
  }

  async handleOAuthCallback(): Promise<this> {
    const { address } = await Auth.handleOAuthCallback();
    this.setAddress(address);
    return this;
  }

  withLogger(config: LoggerConfig): this {
    Logger.debug = config?.debug;
    Logger.logToFile = config?.logToFile;
    return this;
  }

  withSigner(signer: Signer): this {
    this._signer = signer;
    return this;
  }

  async withEncrypter(config: EncrypterConfig): Promise<this> {
    if (config.encrypter) {
      this._encrypter = config.encrypter;
    } else if (config.password) {
      const user = await this.me.get();
      const userWallet = await AkordWallet.importFromEncBackupPhrase(config.password, user.encPrivateKey as string);
      this._encrypter = new Encrypter({ keypair: userWallet.encryptionKeyPair });
    }
    return this;
  }

  withApi(config: ApiConfig): this {
    this.api = config.api ? config.api : new AkordApi(config);
    return this;
  }

  private getConfig() {
    return {
      api: this.api,
      signer: this._signer,
      encrypter: this._encrypter,
    }
  }

  private setAddress(address: string) {
    this.address = address;
  }

  /**
   * @param  {ClientConfig} config
   */
  constructor(config: ClientConfig = {}) {
    this._signer = config.signer;
    this._encrypter = config.encrypter;
    this._env = config.env || 'testnet';
    this.api = config.api ? config.api : new AkordApi(config);
    Auth.configure(config);
    Plugins.register(config?.plugins, this._env);
    Logger.debug = config?.debug;
    Logger.logToFile = config?.logToFile;
    CacheBusters.cache = config?.cache;
  }
}
