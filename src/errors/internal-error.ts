import { TuskyError } from "./error";

export class InternalError extends TuskyError {
  statusCode: number = 500;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}
