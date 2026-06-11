import { Module } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service';
import { LocalStorageController } from './local-storage.controller';

@Module({
  controllers: [LocalStorageController],
  providers: [LocalStorageService],
  exports: [LocalStorageService],
})
export class LocalStorageModule {}
