import { Service, ServiceConfig } from "./service/service";
import { Storage } from "../types/storage";
import { PluginKey, Plugins } from "../plugin";
import { Logger } from "../logger";

class StorageModule {
  protected service: Service;

  constructor(config?: ServiceConfig) {
    this.service = new Service(config);
  }

  /**
   * Get currenlty authenticated user storage balance
   */
  public async get(): Promise<Storage> {
    return await this.service.api.getStorage();
  }

  public async subscribe(
    next: (notification: Storage) => void | Promise<void>,
    error?: (err: any) => void
  ): Promise<void> {
    if (!Plugins.registered.has(PluginKey.PUBSUB)) {
      Logger.warn(
        "PubSub plugins is unregistered. Please install @akord/carmella-sdk-pubsub-plugin and include it in plugins list when initializing SDK"
      );
      return;
    }
    const user = await this.service.api.getMe();
    await Plugins.registered.get(PluginKey.PUBSUB).use({
      action: "subscribe",
      moduleKey: "Storage",
      filter: {
        owner: { eq: user.address },
      },
      next,
      error,
    });
  }

  public async unsubscribe(): Promise<void> {
    if (!Plugins.registered.has(PluginKey.PUBSUB)) {
      Logger.warn(
        "PubSub plugins is unregistered. Please install @akord/carmella-sdk-pubsub-plugin and include it in plugins list when initializing SDK"
      );
      return;
    }
    const user = await this.service.api.getMe();
    await Plugins.registered.get(PluginKey.PUBSUB).use({
      action: "unsubscribe",
      filter: {
        toAddress: { eq: user.address },
      },
    });
  }
}

export {
  StorageModule
}
