import { TuskyError } from "./error";

export class NetworkError extends TuskyError {
  statusCode: number = 503;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}
