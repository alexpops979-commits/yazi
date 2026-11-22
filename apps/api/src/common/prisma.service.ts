import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { prisma, prismaRaw, type Db } from '@yazi/db';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  /** Tenant-scoped client. Every tenant-owned query goes through this. */
  readonly db: Db = prisma;

  /** Explicitly unscoped client for auth, admin and public host resolution. */
  readonly raw = prismaRaw;

  async onModuleDestroy(): Promise<void> {
    await prismaRaw.$disconnect();
  }
}
