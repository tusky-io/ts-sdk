import { logger } from "../logger";

export class TuskyError extends Error {
  statusCode: number;
  requestId: string;

  constructor(message: string, error?: any) {
    super(message);
    this.requestId = (<any>error)?.response?.headers?.['request-id'];
    logger.error(message);
    if (error && error.response) {
      logger.error(`${error.response.status}: ${error.response.statusText}`);
      logger.debug(error.response.headers);
      logger.debug(error.response.data);
    } else if (error) {
      logger.error(error);
    }
  }
}