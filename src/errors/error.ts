import { logger } from "../logger";

export class AkordError extends Error {
  statusCode: number;
  requestId: string;

  constructor(message: string, error?: Error) {
    super(message);
    this.requestId = (<any>error)?.response?.headers?.['request-id'];
    logger.error(error);
  }
}