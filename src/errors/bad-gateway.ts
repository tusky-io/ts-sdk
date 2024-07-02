import { AkordError } from "./error";

export class BadGateway extends AkordError {
  statusCode: number = 502;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}