import { Service, ServiceConfig } from "./service/service";
import { Folder } from "../types";

class TrashModule {
  protected service: Service;

  constructor(config?: ServiceConfig) {
    this.service = new Service(config);
  }

  public async get(): Promise<Folder> {
    return await this.service.api.getTrash();
  }

  public async empty(): Promise<void> {
    return await this.service.api.emptyTrash();
  }
}

export { TrashModule };
