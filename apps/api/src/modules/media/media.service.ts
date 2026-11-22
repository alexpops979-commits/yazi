import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomToken } from '@yazi/db';
import type { MediaAssetSummary } from '@yazi/contracts';
import { PrismaService } from '../../common/prisma.service';
import { EntitlementsService } from '../../common/entitlements.service';
import { NotFoundException } from '../../common/errors';
import { env } from '../../env';

export type UploadedFileLike = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'application/pdf': 'pdf',
};

const ALLOWED = new Set(Object.keys(MIME_EXT));

@Injectable()
export class MediaService {
  private s3: S3Client | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {
    if (this.useS3()) {
      this.s3 = new S3Client({
        region: env.s3.region,
        endpoint: env.s3.endpoint,
        credentials: { accessKeyId: env.s3.accessKeyId, secretAccessKey: env.s3.secretAccessKey },
        forcePathStyle: true,
      });
    }
  }

  private useS3(): boolean {
    return Boolean(env.s3.bucket && env.s3.accessKeyId && env.s3.secretAccessKey && env.s3.endpoint);
  }

  async list(tenantId: string): Promise<MediaAssetSummary[]> {
    const rows = await this.prisma.db.mediaAsset.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    return rows.map((row) => ({
      id: row.id,
      url: row.url,
      filename: row.filename,
      mime: row.mime,
      size: row.size,
      width: row.width,
      height: row.height,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async upload(tenantId: string, file: UploadedFileLike | undefined): Promise<MediaAssetSummary> {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!ALLOWED.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}. Allowed: images, mp4, pdf.`);
    }

    const sizeMb = file.size / (1024 * 1024);
    await this.entitlements.assert(tenantId, 'storageMb', Math.ceil(sizeMb));

    const ext = MIME_EXT[file.mimetype]!;
    const safeBase = (file.originalname || 'file')
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, '')
      .replace(/[^a-z0-9-_]+/g, '-')
      .slice(0, 40) || 'file';
    const key = `${tenantId}/${Date.now()}-${safeBase}-${randomToken(4).toLowerCase()}.${ext}`;

    const url = this.useS3() ? await this.putS3(key, file) : await this.putLocal(key, file);

    const asset = await this.prisma.db.mediaAsset.create({
      data: {
        tenantId,
        key,
        url,
        filename: file.originalname,
        mime: file.mimetype,
        size: file.size,
      },
    });

    return {
      id: asset.id,
      url: asset.url,
      filename: asset.filename,
      mime: asset.mime,
      size: asset.size,
      width: asset.width,
      height: asset.height,
      createdAt: asset.createdAt.toISOString(),
    };
  }

  async remove(tenantId: string, id: string) {
    const asset = await this.prisma.db.mediaAsset.findFirst({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');

    if (this.useS3() && this.s3) {
      await this.s3.send(new DeleteObjectCommand({ Bucket: env.s3.bucket, Key: asset.key })).catch(() => undefined);
    } else {
      const full = path.join(process.cwd(), 'uploads', asset.key);
      await fs.unlink(full).catch(() => undefined);
    }
    await this.prisma.db.mediaAsset.delete({ where: { id: asset.id } });
    return { ok: true };
  }

  private async putLocal(key: string, file: UploadedFileLike): Promise<string> {
    const full = path.join(process.cwd(), 'uploads', key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, file.buffer);
    return `${env.publicUrl}/uploads/${key}`;
  }

  private async putS3(key: string, file: UploadedFileLike): Promise<string> {
    if (!this.s3) throw new HttpException('S3 is not configured', 500);
    await this.s3.send(
      new PutObjectCommand({
        Bucket: env.s3.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    const base = env.s3.publicUrl || `${env.s3.endpoint}/${env.s3.bucket}`;
    return `${base.replace(/\/$/, '')}/${key}`;
  }
}
