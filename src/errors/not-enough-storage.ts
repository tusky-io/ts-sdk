import { TuskyError } from "./error";

export class NotEnoughStorage extends TuskyError {
  statusCode: number = 402;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}