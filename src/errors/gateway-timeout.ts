import { TuskyError } from "./error";

export class GatewayTimeout extends TuskyError {
  statusCode: number = 504;

  constructor(message: string, error?: Error) {
    super(message, error);
  }
}