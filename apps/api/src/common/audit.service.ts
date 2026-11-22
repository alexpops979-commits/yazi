import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

type AuditInput = {
  tenantId?: string | null;
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  meta?: Record<string, unknown>;
  ip?: string;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditInput): Promise<void> {
    try {
      await this.prisma.raw.auditLog.create({
        data: {
          tenantId: input.tenantId ?? null,
          actorId: input.actorId ?? null,
          action: input.action,
          targetType: input.targetType,
          targetId: input.targetId ?? null,
          meta: (input.meta ?? {}) as never,
          ip: input.ip,
        },
      });
    } catch {
      // Audit logging must never break the request it describes.
    }
  }
}
