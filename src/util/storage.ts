export interface Storage {
  getItem(key: string): string | Promise<string>;

  removeItem(key: string): void | Promise<void>;

  setItem(key: string, value: string): void | Promise<void>;
}
