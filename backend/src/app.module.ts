import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { SmsModule } from './modules/sms/sms.module';
import { OssModule } from './modules/oss/oss.module';
import { GradeModule } from './modules/grade/grade.module';
import { PackageModule } from './modules/package/package.module';
import { LessonModule } from './modules/lesson/lesson.module';
import { OrderModule } from './modules/order/order.module';
import { PaymentModule } from './modules/payment/payment.module';
import { AdminModule } from './modules/admin/admin.module';
import { TeacherModule } from './modules/teacher/teacher.module';
import { LocalStorageModule } from './modules/local-storage/local-storage.module';
import { AppConfigModule } from './modules/config/config.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    LocalStorageModule,
    AppConfigModule,
    SmsModule,
    OssModule,
    AuthModule,
    GradeModule,
    PackageModule,
    LessonModule,
    OrderModule,
    PaymentModule,
    AdminModule,
    TeacherModule,
  ],
})
export class AppModule {}
