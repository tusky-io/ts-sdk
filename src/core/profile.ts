import { InMemoryStorageStrategy, PCacheable, PCacheBuster } from "@akord/ts-cacheable";
import { CacheBusters } from "../types/cacheable";
import { StorageType, User } from "../types";
import { Api } from "../api/api";
import { ServiceConfig } from ".";

class ProfileModule {
  protected api: Api;

  constructor(config?: ServiceConfig) {
    this.api = config?.api;
  }

  /**
   * Fetch currently authenticated user's profile details
   * @returns Promise with profile details
   */
  @PCacheable({
    storageStrategy: InMemoryStorageStrategy,
    cacheBusterObserver: CacheBusters.profile,
    shouldCacheDecider: () => CacheBusters.cache
  })
  public async get(): Promise<User> {
    return await this.api.getUser();
  }

  /**
   * Update user profile along with all active memberships
   * @param  {string} name new profile name
   * @param  {any} avatar new avatar buffer
   * @returns Promise with corresponding transaction ids
   */
  @PCacheBuster({
    cacheBusterNotifier: CacheBusters.profile
  })
  public async update(profileName?: string, avatar?: ArrayBuffer): Promise<void> {
    const user = await this.api.getUser();
    if (avatar) {
      const resource = await this.api.uploadFile(avatar, [], { cloud: true, public: true, storage: StorageType.S3 });
      user.avatar = resource.resourceUri;
    }
    return await this.api.updateUser(profileName, user.avatar);
  }
};

export {
  ProfileModule
}
