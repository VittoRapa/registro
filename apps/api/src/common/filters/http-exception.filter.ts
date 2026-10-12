import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProblemDetails } from '@registro/shared';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail = 'Si è verificato un errore interno del server.';
    let errors: Record<string, string[]> | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        detail = res;
        title = exception.name;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        title = (resObj.error as string) || exception.name;
        detail = (resObj.message as string) || exception.message;

        if (Array.isArray(resObj.message)) {
          errors = { validation: resObj.message as string[] };
          detail = 'Errore di validazione dei dati inviati.';
        } else if (resObj.errors && typeof resObj.errors === 'object') {
          errors = resObj.errors as Record<string, string[]>;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
        request.url,
      );
    }

    const problem: ProblemDetails = {
      type: `https://registro.local/errors/${status}`,
      title,
      status,
      detail,
      instance: request.url,
      timestamp: new Date().toISOString(),
      ...(errors && { errors }),
    };

    response
      .status(status)
      .contentType('application/problem+json')
      .json(problem);
  }
}
