import { AkordError } from "./error";

export class NotEnoughStorage extends AkordError {
  statusCode: number = 402;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}