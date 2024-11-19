import { TuskyError } from "./error";

export class Conflict extends TuskyError {
  statusCode: number = 409;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}
