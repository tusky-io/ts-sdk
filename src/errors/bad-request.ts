import { TuskyError } from "./error";

export class BadRequest extends TuskyError {
  statusCode: number = 400;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}
