import { BrowserLevel } from "@akord/browser-level";
import { DatabaseOptions, MemoryLevel } from "memory-level";
import { logger } from "../../logger";

export default class Keystore {
  public static KEYSTORE_LOCATION = ".tusky/keystore";
  private static DEFAULT_ENCODING_OPTIONS = {
    valueEncoding: {
      encode(data: any) {
        return data;
      },
      decode(data: any) {
        return data;
      },
      format: "view",
    },
  } as DatabaseOptions<string, any>;
  private static DEFAULT_INMEMORY_ENCODING_OPTIONS = {
    ...Keystore.DEFAULT_ENCODING_OPTIONS,
    storeEncoding: "view",
  } as DatabaseOptions<string, any>;
  private static _instance: Keystore;
  private db: BrowserLevel<string, any> | MemoryLevel<string, any>;

  private constructor(
    db: BrowserLevel<string, any> | MemoryLevel<string, any>,
  ) {
    this.db = db;
  }

  /**
   * Opens Level DB Keystore<string, CryptoKey>
   * Falls back to in-memory Level if backing storage implementation (e.g. indexeddb) is missing
   * @returns Keystore instance
   */
  public static async instance(): Promise<Keystore> {
    if (this._instance) {
      return this._instance;
    }
    try {
      return await this.persitentInstance();
    } catch (e) {
      return await this.inMemoryInstance();
    }
  }

  public static async persitentInstance(): Promise<Keystore> {
    const db = new BrowserLevel<string, any>(
      Keystore.KEYSTORE_LOCATION,
      Keystore.DEFAULT_ENCODING_OPTIONS,
    );
    await db.open();
    return (this._instance = new this(db));
  }

  public static async inMemoryInstance(): Promise<Keystore> {
    const db = new MemoryLevel<string, any>(
      Keystore.DEFAULT_INMEMORY_ENCODING_OPTIONS,
    );
    await db.open();
    return (this._instance = new this(db));
  }

  async store(keyName: string, key: CryptoKey): Promise<void> {
    await this.db.put(keyName, key, Keystore.DEFAULT_ENCODING_OPTIONS);
  }

  async get(keyName: string): Promise<CryptoKey> {
    try {
      return await this.db.get(keyName, Keystore.DEFAULT_ENCODING_OPTIONS);
    } catch (err) {
      if (err && err.code !== "LEVEL_NOT_FOUND") {
        logger.debug(err);
      }
    }
  }

  async delete(keyName: string): Promise<void> {
    await this.db.del(keyName);
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}
