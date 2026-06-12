import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { StudentAdminService } from './student-admin.service';
import { OrderAdminService } from './order-admin.service';
import { AdminController } from './admin.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminService, StudentAdminService, OrderAdminService],
})
export class AdminModule {}
