import { TuskyError } from "./error";

export class TooManyRequests extends TuskyError {
  statusCode: number = 429;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}
