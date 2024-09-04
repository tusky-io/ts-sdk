import { AkordError } from "./error";

export class Conflict extends AkordError {
  statusCode: number = 409;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}