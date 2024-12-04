import { TuskyError } from "./error";

export class ServiceUnavailable extends TuskyError {
  statusCode: number = 503;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}
