import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard, MinRole, TenantGuard, TenantId } from '../../common/guards';
import { MediaService, type UploadedFileLike } from './media.service';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

@Controller('media')
@UseGuards(AuthGuard, TenantGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  list(@TenantId() tenantId: string) {
    return this.media.list(tenantId);
  }

  @Post()
  @MinRole('EDITOR')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  upload(@TenantId() tenantId: string, @UploadedFile() file: UploadedFileLike) {
    return this.media.upload(tenantId, file);
  }

  @Delete(':id')
  @MinRole('EDITOR')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.media.remove(tenantId, id);
  }
}
