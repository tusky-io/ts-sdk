import { Api } from "./api/api";
import { AkordApi } from "./api/akord-api";
import { ClientConfig } from "./config";
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
import Encrypter from "./encrypter";
import { PaymentModule } from "./core/payment";
import { TrashModule } from "./core/trash";

export class Akord {
  public api: Api;
  private signer: Signer;
  private encrypter: Encrypter;
  private env: Env;
  private userAgent: string;

  public static init: (config?: ClientConfig) => Promise<Akord>;

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

  private getConfig() {
    return {
      api: this.api,
      signer: this.signer,
      encrypter: this.encrypter,
      userAgent: this.userAgent
    }
  }

  /**
   * @param  {ClientConfig} config
   */
  constructor(config: ClientConfig = {}) {
    this.signer = config.signer;
    this.encrypter = config.encrypter;
    this.env = config.env || 'testnet';
    this.api = config.api ? config.api : new AkordApi(config);
    this.userAgent = config.userAgent;
    Auth.configure({ authTokenProvider: config.authTokenProvider, apiKey: config.apiKey });
    Plugins.register(config?.plugins, this.env);
    Logger.debug = config?.debug;
    CacheBusters.cache = config?.cache;
  }
}
