import { TuskyError } from "./error";

export class IncorrectEncryptionKey extends TuskyError {
  statusCode: number = 409;

  constructor(error?: Error) {
    super("Incorrect encryption key.", error);
  }
}
