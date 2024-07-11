import { Api } from "./api/api";
import { AkordApi } from "./api/akord-api";
import { ClientConfig } from "./config";
import { Crypto, Encrypter } from "@akord/crypto";
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

export class Akord {
  public api: Api;
  private signer: Signer;
  private encrypter: Encrypter;
  private env: Env;
  private userAgent: string;

  public static init: (config?: ClientConfig) => Promise<Akord>;

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

  private getConfig() {
    return {
      api: this.api,
      signer: this.signer,
      encrypter: this.encrypter,
      userAgent: this.userAgent
    }
  }
  get storage(): StorageModule {
    return new StorageModule(this.getConfig());
  }

  /**
   * @param  {ClientConfig} config
   */
  constructor(config: ClientConfig = {}) {
    this.signer = config.signer;
    this.encrypter = new Encrypter(config.encrypter, null, null);
    this.env = config.env || 'v2';
    this.api = config.api ? config.api : new AkordApi(config);
    this.userAgent = config.userAgent;
    Crypto.configure({ wallet: config.encrypter });
    Plugins.register(config?.plugins, this.env);
    Logger.debug = config?.debug;
    CacheBusters.cache = config?.cache;
  }
}
