import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GuestService } from './guest.service';

@Module({
  imports: [ProjectsModule],
  controllers: [AuthController],
  providers: [AuthService, GuestService],
  exports: [AuthService],
})
export class AuthModule {}
