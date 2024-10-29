import { logger } from "../logger";

export class AkordError extends Error {
  statusCode: number;
  requestId: string;

  constructor(message: string, error?: any) {
    super(message);
    this.requestId = (<any>error)?.response?.headers?.['request-id'];
    if (error && error.response) {
      logger.debug(error.response.status);
      logger.debug(error.response.statusText);
      logger.debug(error.response.headers);
      logger.debug(error.response.data);
    } else {
      logger.error(error);
    }
  }
}