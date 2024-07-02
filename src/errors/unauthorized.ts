import { AkordError } from "./error";

export class Unauthorized extends AkordError {
  statusCode: number = 401;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}