import { ListOptions } from "../types/query-options";
import PQueue from "@esm2cjs/p-queue";
import { InternalError } from "../errors/internal-error";

const DECRYPTION_CONCURRENCY = 1;

export const processListItems = async <T>(items: Array<T>, processItem: any)
  : Promise<void> => {
    const decryptionQ = new PQueue({ concurrency: DECRYPTION_CONCURRENCY });
    try {
      await decryptionQ.addAll(items.map(item => () => processItem(item)))
    } catch (error) {
      throw new InternalError(error.toString(), error);
    }
    await decryptionQ.onIdle();
}

export const paginate = async <T>(apiCall: any, listOptions: ListOptions & { vaultId?: string }): Promise<Array<T>> => {
  let token = undefined;
  let results = [] as T[];
  do {
    const { items, nextToken } = await apiCall(listOptions);
    results = results.concat(items);
    token = nextToken;
    listOptions.nextToken = nextToken;
    if (nextToken === "null") {
      token = undefined;
    }
  } while (token);
  return results;
}
