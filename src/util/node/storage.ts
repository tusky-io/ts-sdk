import { Storage } from "../storage";

class MemoryStorage implements Storage {
  private storage: { [key: string]: string } = {};

  setItem(key: string, value: string): void {
    this.storage[key] = value;
  }

  getItem(key: string): string | null {
    return this.storage.hasOwnProperty(key) ? this.storage[key] : null;
  }

  removeItem(key: string): void {
    delete this.storage[key];
  }

  clear(): void {
    this.storage = {};
  }

  get length(): number {
    return Object.keys(this.storage).length;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.storage);
    return keys[index] || null;
  }
}

const memoryStorage = new MemoryStorage();

export { memoryStorage as DefaultStorage };
