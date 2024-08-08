import { Service, ServiceConfig } from "./service/service";
import { User, UserMutable } from "../types/user";

class MeModule {
  protected service: Service;

  constructor(config?: ServiceConfig) {
    this.service = new Service(config);
  }

  /**
   * Get currently authenticated user
   */
  public async get(): Promise<User> {
    return await this.service.api.getMe();
  }

  /**
   * Update currently authenticated user
   */
  public async update(input: UserMutable): Promise<User> {
    return await this.service.api.updateMe(input);
  }
}

export {
  MeModule
}
