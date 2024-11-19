export enum Platform {
  Browser,
  BrowserNoWorker,
  Server,
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

export const getPlatform = (): Platform => {
  if (typeof window === "undefined") {
    return Platform.Server;
  }
  if (!navigator.serviceWorker?.controller) {
    return Platform.BrowserNoWorker;
  }
  return Platform.Browser;
};
