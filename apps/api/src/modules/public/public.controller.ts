import { Body, Controller, Get, Header, Post, Query } from '@nestjs/common';
import { Public } from '../../common/guards';
import { NotFoundException } from '../../common/errors';
import { PublicService } from './public.service';

@Controller('public')
@Public()
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('resolve')
  async resolve(@Query('host') host: string, @Query('path') path?: string) {
    if (!host) throw new NotFoundException('Missing host');
    const payload = await this.publicService.resolve(host, path);
    if (!payload) throw new NotFoundException('Site not found');
    return payload;
  }

  @Get('sitemap')
  @Header('Content-Type', 'application/xml')
  async sitemap(@Query('host') host: string) {
    const xml = await this.publicService.sitemap(host ?? '');
    if (!xml) throw new NotFoundException('Site not found');
    return xml;
  }

  @Get('robots')
  @Header('Content-Type', 'text/plain')
  robots(@Query('host') host: string) {
    return this.publicService.robots(host ?? '');
  }

  @Post('pageview')
  pageview(@Body() body: { host?: string; path?: string }) {
    if (!body?.host) return { ok: false };
    return this.publicService.trackPageView(body.host, body.path);
  }

  @Get('preview')
  async preview(@Query('token') token?: string) {
    const payload = await this.publicService.preview(token);
    if (!payload) throw new NotFoundException('Preview not found or expired');
    return payload;
  }
}
