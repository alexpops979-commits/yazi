import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import { Prisma, TenantScopeError } from '@dalmg/db';
import { ZodError } from 'zod';
import type { Response } from 'express';

export class PaymentRequiredException extends HttpException {
  constructor(
    readonly feature: string,
    readonly limit: number,
    readonly planCode: string,
    readonly upgradeTo: string,
  ) {
    super(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        code: 'PLAN_LIMIT',
        message: `Plan limit reached: ${feature} (${limit}). Upgrade to ${upgradeTo}.`,
        details: { feature, limit, planCode, upgradeTo },
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

export class ConflictException extends HttpException {
  constructor(message: string, code = 'CONFLICT') {
    super({ statusCode: HttpStatus.CONFLICT, code, message }, HttpStatus.CONFLICT);
  }
}

export class NotFoundException extends HttpException {
  constructor(message = 'Not found') {
    super({ statusCode: HttpStatus.NOT_FOUND, code: 'NOT_FOUND', message }, HttpStatus.NOT_FOUND);
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json(typeof body === 'string' ? { statusCode: status, message: body } : body);
      return;
    }

    if (exception instanceof ZodError) {
      response.status(400).json({
        statusCode: 400,
        code: 'VALIDATION',
        message: 'Validation failed',
        details: exception.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      });
      return;
    }

    if (exception instanceof TenantScopeError) {
      this.logger.error(exception.message);
      response.status(403).json({ statusCode: 403, code: 'TENANT_SCOPE', message: 'Workspace context is missing' });
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        const target = (exception.meta?.target as string[] | undefined)?.join(', ') ?? 'value';
        response.status(409).json({ statusCode: 409, code: 'DUPLICATE', message: `Already in use: ${target}` });
        return;
      }
      if (exception.code === 'P2025') {
        response.status(404).json({ statusCode: 404, code: 'NOT_FOUND', message: 'Not found' });
        return;
      }
    }

    // body-parser / http-errors (malformed JSON, payload too large, …)
    const status = (exception as { status?: unknown; statusCode?: unknown })?.status ?? (exception as { statusCode?: unknown })?.statusCode;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      const type = (exception as { type?: unknown })?.type;
      response.status(status).json({
        statusCode: status,
        code: type === 'entity.too.large' ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST',
        message: exception instanceof Error ? exception.message : 'Bad request',
      });
      return;
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      this.logger.error(`Database unreachable: ${exception.message}`);
      response.status(503).json({
        statusCode: 503,
        code: 'DB_UNAVAILABLE',
        message: 'Database is unreachable. Check DATABASE_URL and that Postgres is running.',
      });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack ?? exception.message : String(exception));
    response.status(500).json({ statusCode: 500, code: 'INTERNAL', message: 'Internal server error' });
  }
}
