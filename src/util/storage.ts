import { DefaultStorage } from "@env/util/storage";

export interface Storage {
  getItem(key: string): string | null | Promise<string>;

  removeItem(key: string): void | Promise<void>;

  setItem(key: string, value: string): void | Promise<void>;
}

export const defaultStorage = (): Storage => {
  return DefaultStorage;
};
