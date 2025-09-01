import { Api } from "./api/api";
import { TuskyApi } from "./api/tusky-api";
import { ClientConfig, EncrypterConfig, TuskyConfig } from "./config";
import { ConsoleLogger, logger, setLogger } from "./logger";
import { FolderModule } from "./core/folder";
import { NFTModule } from "./core/nft";
import { VaultModule } from "./core/vault";
import { CacheBusters } from "./types/cacheable";
import { FileModule } from "@env/core/file";
import { ZipModule } from "./core/zip";
import { StorageModule } from "./core/storage";
import { DEFAULT_ENV, Env } from "./types/env";
import { Auth, AuthConfig } from "./auth";
import { MeModule } from "./core/me";
import { ApiKeyModule } from "./core/api-key";
import { Encrypter } from "./crypto/encrypter";
import { TrashModule } from "./core/trash";
import { Conflict } from "./errors/conflict";
import { defaultStorage } from "./auth/jwt";
import { TuskyBuilder } from "./tusky-builder";
import { Storage } from "./util/storage";
import { loadSodium } from "./crypto/libsodium";

export class Tusky {
  public api: Api;
  private _encrypter: Encrypter;
  private _env: Env;
  private _storage: Storage;
  private _auth: Auth;

  get me(): MeModule {
    return new MeModule(this.getConfig());
  }
  get folder(): FolderModule {
    return new FolderModule(this.getConfig());
  }
  get nft(): NFTModule {
    return new NFTModule(this.getConfig());
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
  get auth(): Auth {
    return this._auth;
  }

  static async init(config: TuskyConfig): Promise<Tusky> {
    const builder = new TuskyBuilder();
    if (config.env) {
      builder.useEnv(config.env);
    }
    if (config.encrypter) {
      builder.useEncrypter(config.encrypter);
    }
    if (config.logger) {
      builder.useLogger(config.logger);
    }
    if (config.clientName) {
      builder.useClientName(config.clientName);
    }
    if (config.wallet) {
      builder.useWallet(config.wallet);
    }
    if (config.apiKey) {
      builder.useApiKey(config.apiKey);
    }
    if (config.oauth) {
      builder.useOAuth(config.oauth);
    }
    if (config.storage) {
      builder.useStorage(config.storage);
    }
    return builder.build();
  }

  async signOut(): Promise<this> {
    await this.me.clearEncryptionSession();
    this._auth.signOut();
    return this;
  }

  async addEncrypter(config: EncrypterConfig): Promise<this> {
    if (!config) {
      return;
    }
    if (config.sodium) {
      await loadSodium(config.sodium);
    }
    if (config.keypair) {
      this._encrypter = new Encrypter({ keypair: config.keypair });
    } else if (config.password) {
      const user = await this.me.get();
      if (!user.encPrivateKey) {
        logger.info("Generate new user encryption context");
        const { keypair } = await this.me.setupPassword(config.password);
        this._encrypter = new Encrypter({ keypair: keypair });
      } else {
        logger.info(
          "Retrieve and decrypt existing user encryption content with password",
        );
        const { keypair } = await this.me.importEncryptionSessionFromPassword(
          config.password,
        );
        this._encrypter = new Encrypter({ keypair: keypair });
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
        const { keypair } = await this.me.importEncryptionSessionFromKeystore();
        this._encrypter = new Encrypter({ keypair: keypair });
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
      auth: this._auth,
      encrypter: this._encrypter,
      env: this._env,
      storage: this._storage,
    };
  }

  /**
   * @param  {ClientConfig} config
   */
  constructor(config: ClientConfig & AuthConfig = {}) {
    this._encrypter = config.encrypter;
    this._env = { ...this.getConfig(), ...config }.env || DEFAULT_ENV;
    this._storage = config.storage || defaultStorage();
    this._auth = config.auth
      ? config.auth
      : new Auth({ ...config, ...this.getConfig() });
    this.api = config.api ? config.api : new TuskyApi(this.getConfig());
    if (config.logger) {
      setLogger(config.logger);
    }
    if (config.logLevel) {
      setLogger(
        new ConsoleLogger({
          logLevel: config.logLevel,
          logToFile: config.logToFile,
        }),
      );
    }
    CacheBusters.cache = config?.cache;
  }
}
