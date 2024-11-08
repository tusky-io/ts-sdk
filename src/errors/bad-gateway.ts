import { TuskyError } from "./error";

export class BadGateway extends TuskyError {
  statusCode: number = 502;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}