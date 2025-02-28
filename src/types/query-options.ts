import { BadRequest } from "../errors/bad-request";

export type ListPaginatedApiOptions = {
  limit?: number; // the limit of the number of items in a query (default to 1000, max value: 1000)
  nextToken?: string;
};

export type ListApiOptions = ListPaginatedApiOptions & {
  parentId?: string;
  vaultId?: string;
  status?: "active" | "deleted";
};

export type ListOptions = ListApiOptions & {
  shouldDecrypt?: boolean;
};

export type ListFileOptions = ListApiOptions & {
  sourceId?: string;
};

export type SearchCriteria = "CONTAINS_SOME" | "CONTAINS_EVERY";

export type GetOptions = {
  shouldDecrypt?: boolean;
};

export type VaultGetOptions = GetOptions & {
  deep?: boolean;
};

export type VaultApiGetOptions = {
  withNodes?: boolean;
  deep?: boolean; // withMemberships, withMemos, withStacks, withFolders
};

export const validateListPaginatedApiOptions = (
  options: ListPaginatedApiOptions,
) => {
  if (options.limit < 1 || options.limit > 1000) {
    throw new BadRequest(
      "Invalid limit parameter, please provide a value from 1 to 1000",
    );
  }
};
