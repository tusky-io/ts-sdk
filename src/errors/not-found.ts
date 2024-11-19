import { TuskyError } from "./error";

export class NotFound extends TuskyError {
  statusCode: number = 404;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}
