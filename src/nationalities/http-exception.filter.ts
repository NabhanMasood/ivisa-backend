import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class NationalitiesHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse() as any;
      const message = typeof res === 'string' ? res : res?.message || 'Request failed';
      const errors = typeof res === 'object' ? res?.errors || res?.message : undefined;
      response.status(status).json({ status: false, message, errors });
      return;
    }

    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ status: false, message: 'Internal server error' });
  }
}


