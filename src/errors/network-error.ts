import { AkordError } from "./error";

export class NetworkError extends AkordError {
  statusCode: number = 503;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}