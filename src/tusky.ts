import { Api } from "./api/api";
import { TuskyApi } from "./api/tusky-api";
import { ClientConfig, EncrypterConfig } from "./config";
import { logger } from "./logger";
import { FolderModule } from "./core/folder";
import { VaultModule } from "./core/vault";
import { CacheBusters } from "./types/cacheable";
import { FileModule } from "@env/core/file";
import { ZipModule } from "./core/zip";
import { StorageModule } from "./core/storage";
import { Signer } from "./signer";
import { DEFAULT_ENV, Env } from "./types/env";
import { Auth, AuthOptions } from "./auth";
import { MeModule } from "./core/me";
import { ApiKeyModule } from "./core/api-key";
import { Encrypter } from "./crypto/encrypter";
import { PaymentModule } from "./core/payment";
import { TrashModule } from "./core/trash";
import { Conflict } from "./errors/conflict";
import { UserEncryption } from "./crypto/user-encryption";
import PubSub from "./api/pubsub";
import { defaultStorage } from "./auth/jwt";
import { TuskyBuilder } from "./tusky-builder";

export class Tusky {
  public api: Api;
  public pubsub: PubSub;
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
  get auth(): Auth {
    return this._auth;
  }

  static init(): TuskyBuilder {
    return new TuskyBuilder();
  }

  async signOut(): Promise<this> {
    await this.me.clearEncryptionSession();
    this._auth.signOut();
    return this;
  }

  async setEncrypter(config: EncrypterConfig): Promise<this> {
    if (!config) {
      return;
    }
    if (config.encrypter) {
      this._encrypter = config.encrypter;
    } else if (config.password) {
      const user = await this.me.get();
      if (!user.encPrivateKey) {
        logger.info("Generate new user encryption context");
        const { keyPair } = await this.me.setupPassword(config.password);
        this._encrypter = new Encrypter({ keypair: keyPair });
      } else {
        logger.info(
          "Retrieve and decrypt existing user encryption content with password",
        );
        const { keyPair } = await this.me.importEncryptionSessionFromPassword(
          config.password,
        );
        this._encrypter = new Encrypter({ keypair: keyPair });
      }
    } else if (config.keystore) {
      const user = await this.me.get();
      if (!user.encPrivateKey) {
        throw new Conflict(
          "The user needs to configure their encryption password/backup phrase.",
        );
      }
      try {
        logger.info(
          "Retrieve and decrypt existing user encryption content from keystore",
        );
        const { keyPair } = await this.me.importEncryptionSessionFromKeystore();
        this._encrypter = new Encrypter({ keypair: keyPair });
      } catch (error) {
        logger.error(error);
        throw new Conflict("The user needs to provide the password again.");
      }
    }
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
      address: this._auth?.getAddress(),
    };
  }

  /**
   * @param  {ClientConfig} config
   */
  constructor(config: ClientConfig & AuthOptions = {}) {
    this._signer = config.signer;
    this._encrypter = config.encrypter;
    this._env = { ...this.getConfig(), ...config }.env || DEFAULT_ENV;
    this._storage = config.storage || defaultStorage();
    this._auth = config.auth
      ? config.auth
      : new Auth({ ...config, ...this.getConfig() });
    this.api = config.api ? config.api : new TuskyApi(this.getConfig());
    this.pubsub = new PubSub({ env: this._env });
    CacheBusters.cache = config?.cache;
  }
}
