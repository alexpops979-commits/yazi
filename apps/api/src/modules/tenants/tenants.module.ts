import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsController, WorkspaceController } from './tenants.controller';

@Module({
  controllers: [TenantsController, WorkspaceController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
