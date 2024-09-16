import { LoggerConfig } from "./config";
import { importDynamic } from "./util/import";
import { isServer } from "./util/platform";

const LOG_FILE = 'akord.log';

export interface Logger {
  info(message: any, ...params: any[]): void;
  warn(message: any, ...params: any[]): void;
  error(message: any, ...params: any[]): void;
  debug(message: any, ...params: any[]): void;
}

export type LogLevel = 'none' | 'debug' | 'info' | 'warn' | 'error';

enum LogLevelNumber {
  DEBUG = 1,   // debugging level
  INFO = 2,    // informational level
  WARN = 3,    // warning level
  ERROR = 4,   // error level
  NONE = 5,    // no logging
}

export class ConsoleLogger implements Logger {
  private currentLogLevel: LogLevelNumber;
  private _logToFile: boolean;

  private static logLevelMap: { [key in LogLevel]: LogLevelNumber } = {
    "none": LogLevelNumber.NONE,
    "debug": LogLevelNumber.DEBUG,
    "info": LogLevelNumber.INFO,
    "warn": LogLevelNumber.WARN,
    "error": LogLevelNumber.ERROR
  };

  constructor(config: LoggerConfig) {
    this.currentLogLevel = ConsoleLogger.logLevelMap[config?.logLevel?.toLowerCase()] ?? LogLevelNumber.NONE;
    this._logToFile = config.logToFile;
  }

  private shouldLog(level: LogLevelNumber): boolean {
    return level >= this.currentLogLevel;
  }

  private shouldLogToFile(): boolean {
    return this._logToFile && isServer();
  }

  private logToFile(message: any): void {
    const fs = importDynamic("fs");
    const logMessage = `${new Date().toISOString()} [${this.currentLogLevel}] ${JSON.stringify(message, (key, value) => key === '_sessionCache' ? undefined : value, 2)}\n`;
    fs.appendFileSync(LOG_FILE, logMessage);
  }

  info(message: any, ...params: any[]): void {
    if (this.shouldLog(LogLevelNumber.INFO)) {
      console.info(`[INFO] ${message}`, ...params);
      if (this.shouldLogToFile()) {
        this.logToFile(message);
      }
    }
  }

  warn(message: any, ...params: any[]): void {
    if (this.shouldLog(LogLevelNumber.WARN)) {
      console.warn(`[WARN] ${message}`, ...params);
      if (this.shouldLogToFile()) {
        this.logToFile(message);
      }
    }
  }

  error(message: any, ...params: any[]): void {
    if (this.shouldLog(LogLevelNumber.ERROR)) {
      console.error(`[ERROR] ${message}`, ...params);
      if (this.shouldLogToFile()) {
        this.logToFile(message);
      }
    }
  }

  debug(message: any, ...params: any[]): void {
    if (this.shouldLog(LogLevelNumber.DEBUG)) {
      console.debug(`[DEBUG] ${message}`, ...params);
      if (this.shouldLogToFile()) {
        this.logToFile(message);
      }
    }
  }
}

let logger: Logger = new ConsoleLogger({ logLevel: "none" });

export function setLogger(newLogger: Logger) {
  logger = newLogger;
}

export { logger };