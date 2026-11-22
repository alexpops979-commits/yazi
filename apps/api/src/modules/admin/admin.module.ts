import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { TemplatesModule } from '../templates/templates.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [BillingModule, TemplatesModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
