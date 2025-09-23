export enum Platform {
  Browser,
  BrowserNoWorker,
  Server,
  ReactNative,
  Unknown,
}

export const isServer = (): boolean => {
  return isNode() || isDeno();
};

export const isNode = (): boolean => {
  return typeof process !== "undefined" && process.release?.name === "node";
};

export const isDeno = (): boolean => {
  return window && "Deno" in window;
};

export function isReactNative() {
  return (
    typeof navigator !== "undefined" &&
    navigator.userAgent === "ReactNative" &&
    navigator.product === "ReactNative"
  );
}

export function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function isBrowserNoWorker() {
  return isBrowser() && !navigator.serviceWorker?.controller;
}

export const getPlatform = (): Platform => {
  if (isServer()) return Platform.Server;
  if (isBrowserNoWorker()) return Platform.BrowserNoWorker;
  if (isBrowser()) return Platform.Browser;
  if (isReactNative()) return Platform.ReactNative;
  return Platform.Unknown;
};
