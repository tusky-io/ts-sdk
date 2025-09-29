let fetchFn: any;
import fetch from "cross-fetch";

export type FetchType = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export function loadFetch(customFetch?: FetchType): FetchType {
  if (customFetch) {
    fetchFn = customFetch;
    return fetchFn;
  }

  if (fetchFn) return fetchFn;

  fetchFn = fetch;
  return fetchFn;
}
