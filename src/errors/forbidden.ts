import { AkordError } from "./error";

export class Forbidden extends AkordError {
  statusCode: number = 403;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}