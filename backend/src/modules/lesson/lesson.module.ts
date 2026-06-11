import { Module } from '@nestjs/common';
import { LessonService } from './lesson.service';
import { LessonController } from './lesson.controller';
import { PackageModule } from '../package/package.module';
import { OssModule } from '../oss/oss.module';
import { LocalStorageModule } from '../local-storage/local-storage.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PackageModule, OssModule, LocalStorageModule, AuthModule],
  controllers: [LessonController],
  providers: [LessonService],
})
export class LessonModule {}
