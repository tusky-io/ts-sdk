import { TuskyError } from "./error";

export class NotAllowed extends TuskyError {
  statusCode: number = 405;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}
