import { AkordError } from "./error";

export class IncorrectEncryptionKey extends AkordError {
  statusCode: number = 409;

  constructor(error?: Error) {
    super("Incorrect encryption key.", error);
  }
}