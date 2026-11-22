import { Module } from '@nestjs/common';
import { PagesModule } from '../pages/pages.module';
import { TemplatesModule } from '../templates/templates.module';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';

@Module({
  imports: [PagesModule, TemplatesModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
