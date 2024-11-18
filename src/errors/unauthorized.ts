import { TuskyError } from "./error";

export class Unauthorized extends TuskyError {
  statusCode: number = 401;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}