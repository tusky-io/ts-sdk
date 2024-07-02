import { AkordError } from "./error";

export class NotFound extends AkordError {
  statusCode: number = 404;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}