import { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
export declare class NationalitiesHttpExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): void;
}
