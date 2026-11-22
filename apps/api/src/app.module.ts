import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { PagesModule } from './modules/pages/pages.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { MediaModule } from './modules/media/media.module';
import { DomainsModule } from './modules/domains/domains.module';
import { BillingModule } from './modules/billing/billing.module';
import { PublicModule } from './modules/public/public.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    TenantsModule,
    TemplatesModule,
    PagesModule,
    ProjectsModule,
    MediaModule,
    DomainsModule,
    BillingModule,
    PublicModule,
    AdminModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
