import { TuskyError } from "./error";

export class Forbidden extends TuskyError {
  statusCode: number = 403;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}
