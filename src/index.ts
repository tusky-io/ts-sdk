import { Akord } from "./akord";
import { ClientConfig } from "./config";
import { Auth } from "./auth";

/**
 * @param  {ClientConfig={}} config
 * @returns Promise with Akord Client instance
 */
Akord.init = async function (config: ClientConfig = {}): Promise<Akord> {
  Auth.configure(config);
  return new Akord(config);
};

export * from "./types";
export * from "./plugin";
export * from "./encrypter";
export * from "./crypto/wallet";
export { Akord, Auth };
