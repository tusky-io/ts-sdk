import { Api } from "./api/api";
import { AkordApi } from "./api/akord-api";
import { ApiConfig, ClientConfig, EncrypterConfig, LoggerConfig } from "./config";
import { ApiKeyConfig, AuthTokenProviderConfig, OAuthConfig, WalletConfig } from "./types/auth";
import { ConsoleLogger, logger, setLogger } from "./logger";
import { FolderModule } from "./core/folder";
import { VaultModule } from "./core/vault";
import { CacheBusters } from "./types/cacheable";
import { FileModule } from "@env/core/file";
import { ZipModule } from "./core/zip";
import { StorageModule } from "./core/storage";
import { Signer } from "./signer";
import { Env } from "./types/env";
import { Auth, AuthOptions } from "./auth";
import { MeModule } from "./core/me";
import { ApiKeyModule } from "./core/api-key";
import { Encrypter } from "./crypto/encrypter";
import { PaymentModule } from "./core/payment";
import { TrashModule } from "./core/trash";
import { Conflict } from "./errors/conflict";
import { UserEncryption } from "./crypto/user-encryption";
import PubSub from "./api/pubsub";

export class Akord {
  public api: Api;
  public pubsub: PubSub;
  public address: string;
  private _signer: Signer;
  private _encrypter: Encrypter;
  private _userEncryption: UserEncryption;
  private _env: Env;
  private _storage: Storage;
  private _auth: Auth;

  get me(): MeModule {
    return new MeModule(this.getConfig());
  }
  get folder(): FolderModule {
    return new FolderModule(this.getConfig());
  }
  get vault(): VaultModule {
    return new VaultModule(this.getConfig());
  }
  get file(): FileModule {
    return new FileModule(this.getConfig());
  }
  get zip(): ZipModule {
    return new ZipModule(this.getConfig());
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
    const { address } = await this._auth.signIn();
    this.setCurrentSession(address);
    return this;
  }

  async signOut(): Promise<this> {
    await this._userEncryption.clear();
    this._auth.signOut();
    this.setAddress(undefined);
    return this;
  }

  async initOAuthFlow(): Promise<this> {
    await this._auth.initOAuthFlow();
    return this;
  }

  async handleOAuthCallback(): Promise<this> {
    const { address } = await this._auth.handleOAuthCallback();
    this.setCurrentSession(address);
    return this;
  }

  withLogger(config: LoggerConfig): this {
    const logger = config.logger ? config.logger : new ConsoleLogger(config);
    setLogger(logger);
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
      if (!user.encPrivateKey) {
        logger.info("Generate new user encryption context");
        const { encPrivateKey, keyPair } = await this._userEncryption.setupPassword(config.password, config.keystore);
        await this.me.update({ encPrivateKey: encPrivateKey });
        this._encrypter = new Encrypter({ keypair: keyPair });
      } else {
        logger.info("Retrieve and decrypt existing user encryption content with password");
        this._userEncryption.setEncryptedPrivateKey(user.encPrivateKey);
        const { keyPair } = await this._userEncryption.importFromPassword(config.password, config.keystore);
        this._encrypter = new Encrypter({ keypair: keyPair });
      }
    } else if (config.keystore) {
      const user = await this.me.get();
      if (!user.encPrivateKey) {
        throw new Conflict("The user needs to configure their encryption password/backup phrase.");
      }
      try {
        logger.info("Retrieve and decrypt existing user encryption content from keystore");
        this._userEncryption.setEncryptedPrivateKey(user.encPrivateKey);
        const { keyPair } = await this._userEncryption.importFromKeystore();
        this._encrypter = new Encrypter({ keypair: keyPair });
      } catch (error) {
        logger.error(error);
        throw new Conflict("The user needs to provide the password again.");
      }
    }
    return this;
  }

  withApi(config: ApiConfig): this {
    this.api = config.api ? config.api : new AkordApi({ ...config, auth: this._auth });
    this._env = config.env;
    this._auth.setEnv(this._env);
    return this;
  }

  private getConfig() {
    return {
      api: this.api,
      pubsub: this.pubsub,
      auth: this._auth,
      signer: this._signer,
      encrypter: this._encrypter,
      env: this._env,
      storage: this._storage,
      address: this._auth.getAddress()
    }
  }

  private setAddress(address: string) {
    this.address = address;
  }

  private setCurrentSession(address?: string) {
    this.setAddress(address || this._auth.getAddress());
    this._userEncryption = new UserEncryption(this.getConfig());
  }

  /**
   * @param  {ClientConfig} config
   */
  constructor(config: ClientConfig & AuthOptions = {}) {
    this._signer = config.signer;
    this._encrypter = config.encrypter;
    this._env = config.env || 'testnet';
    this._auth = new Auth(config);
    this.api = config.api ? config.api : new AkordApi(this.getConfig());
    this.pubsub = new PubSub({ env: this._env });
    this.setCurrentSession();
    CacheBusters.cache = config?.cache;
  }
}
