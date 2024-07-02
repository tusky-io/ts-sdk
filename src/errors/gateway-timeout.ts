import { AkordError } from "./error";

export class GatewayTimeout extends AkordError {
  statusCode: number = 504;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}