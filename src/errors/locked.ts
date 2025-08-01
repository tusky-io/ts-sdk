import { TuskyError } from "./error";

export class Locked extends TuskyError {
  statusCode: number = 423;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}
