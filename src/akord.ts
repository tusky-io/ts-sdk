import { Api } from "./api/api";
import { AkordApi } from "./api/akord-api";
import { ClientConfig } from "./config";
import { Crypto, Encrypter, Wallet } from "@akord/crypto";
import { Logger } from "./logger";
import { FolderModule } from "./core/folder";
import { MembershipModule } from "./core/membership";
import { VaultModule } from "./core/vault";
import { StackModule } from "./core/stack";
import { ProfileModule } from "./core/profile";
import { CacheBusters } from "./types/cacheable";
import { ZipModule } from "./core/zip";
import { FileModule } from "./core/file";
import { Plugins } from "./plugin";
import { StorageModule } from "./core/storage";
import { Signer } from "./signer";

export class Akord {
  public api: Api;
  private signer: Signer;
  private encrypter: Encrypter;
  private env: 'dev' | 'v2';
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
  get stack(): StackModule {
    return new StackModule(this.getConfig());
  }
  get profile(): ProfileModule {
    return new ProfileModule(this.getConfig());
  }
  get file(): FileModule {
    return new FileModule(this.getConfig());
  }
  get zip(): ZipModule {
    return new ZipModule(this.getConfig());
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
