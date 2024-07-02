import { AkordError } from "./error";

export class TooManyRequests extends AkordError {
  statusCode: number = 429;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}