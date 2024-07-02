import { AkordError } from "./error";

export class BadRequest extends AkordError {
  statusCode: number = 400;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}