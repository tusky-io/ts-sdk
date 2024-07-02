import { ListOptions } from "../types/query-options";
import lodash from "lodash";
import { EncryptedPayload } from "@akord/crypto/lib/types";
import { base64ToArray } from "@akord/crypto";
import { EncryptionMetadata } from "../types/encryption";
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

export const mergeState = (currentState: any, stateUpdates: any): any => {
  let newState = lodash.cloneDeepWith(currentState);
  lodash.mergeWith(
    newState,
    stateUpdates,
    function concatArrays(objValue, srcValue) {
      if (lodash.isArray(objValue)) {
        return objValue.concat(srcValue);
      }
    });
  return newState;
}

export const getEncryptedPayload = (data: ArrayBuffer | string, metadata: EncryptionMetadata)
  : EncryptedPayload => {
  const { encryptedKey, iv } = metadata;
  if (encryptedKey && iv) {
    return {
      encryptedKey,
      encryptedData: {
        iv: base64ToArray(iv),
        ciphertext: data as ArrayBuffer
      }
    }
  }
  return null;
}
