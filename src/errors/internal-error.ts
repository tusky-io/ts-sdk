import { AkordError } from "./error";

export class InternalError extends AkordError {
  statusCode: number = 500;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}