import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsInt, IsString, Length, Matches, MinLength } from 'class-validator';
import { AdminService } from './admin.service';
import { StudentAdminService } from './student-admin.service';
import { OrderAdminService } from './order-admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

class AdminLoginDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;
}

class CreateStudentDto {
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @IsString()
  @Length(2, 20, { message: '孩子姓名长度为 2~20 个字符' })
  childName: string;
}

class GrantPackageDto {
  @IsInt()
  packageId: number;
}

@Controller('admin')
export class AdminController {
  constructor(
    private admin: AdminService,
    private studentAdmin: StudentAdminService,
    private orderAdmin: OrderAdminService,
  ) {}

  @Post('login')
  login(@Body() dto: AdminLoginDto) {
    return this.admin.login(dto.username, dto.password);
  }

  @Get('students')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  listStudents(@Query('keyword') keyword?: string) {
    return this.studentAdmin.listStudents(keyword);
  }

  @Post('students')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  createStudent(@Body() dto: CreateStudentDto) {
    return this.studentAdmin.createStudent(dto.phone, dto.childName);
  }

  @Post('students/:userId/grant')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  grantPackage(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: GrantPackageDto,
  ) {
    return this.studentAdmin.grantPackage(userId, dto.packageId);
  }

  @Delete('students/:userId/packages/:packageId')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  revokePackage(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('packageId', ParseIntPipe) packageId: number,
  ) {
    return this.studentAdmin.revokePackage(userId, packageId);
  }

  @Delete('students/:userId')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  deleteStudent(@Param('userId', ParseIntPipe) userId: number) {
    return this.studentAdmin.deleteStudent(userId);
  }

  @Get('orders/stats')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  getOrderStats() {
    return this.orderAdmin.getPaymentStats();
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  listOrders(@Query('keyword') keyword?: string) {
    return this.orderAdmin.listOrders(keyword);
  }
}
