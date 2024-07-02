export enum Platform {
  Browser, BrowserNoWorker, Server
}

export const isServer = (): boolean => {
  return typeof window === 'undefined' ? true : false;
};

export const getPlatform = (): Platform => {
  if (typeof window === 'undefined') {
    return Platform.Server;
  }
  if (!navigator.serviceWorker?.controller) {
    return Platform.BrowserNoWorker;
  }
  return Platform.Browser;
};
