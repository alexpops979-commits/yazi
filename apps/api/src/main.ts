import 'reflect-metadata';
import path from 'node:path';
import express from 'express';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { runWithoutTenant, runWithTenant } from '@yazi/db';
import { AppModule } from './app.module';
import { env } from './env';
import { AllExceptionsFilter } from './common/errors';
import { WorkspaceService } from './common/workspace.service';
import { getDefaultWorkspace } from './common/workspace';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  if (env.singleWorkspace) {
    try {
      await app.get(WorkspaceService).ensure();
    } catch (error) {
      console.warn('Single workspace bootstrap failed:', error instanceof Error ? error.message : error);
    }
  }

  // Pages can be up to a few megabytes; keep Stripe rawBody support intact.
  app.useBodyParser('json', { limit: '3mb' });
  app.useBodyParser('urlencoded', { limit: '3mb', extended: true });

  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.enableCors({
    origin: [env.appUrl, 'http://localhost:3000'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
  });

  // Tenant context for the whole request. The tenant id is untrusted here —
  // TenantGuard verifies membership before any handler runs.
  app.use((req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (env.singleWorkspace) {
      const workspace = getDefaultWorkspace();
      if (workspace) return runWithTenant(workspace.tenantId, () => next());
    }
    const header = req.headers['x-tenant-id'];
    const tenantId = typeof header === 'string' ? header : Array.isArray(header) ? header[0] : undefined;
    if (tenantId) return runWithTenant(tenantId, () => next());
    return runWithoutTenant(() => next());
  });

  // Local media storage (used when S3 is not configured).
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), { maxAge: '30d', fallthrough: true }));

  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  await app.listen(env.port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${env.port}`);
  if (!env.stripe.secretKey) {
    console.log('Stripe is not configured — billing runs in mock mode (instant plan switch).');
  }
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
