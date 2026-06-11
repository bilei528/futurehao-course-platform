import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { TeacherService } from './teacher.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

class CreateTeacherDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  wechat?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

class UpdateTeacherDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  wechat?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsInt()
  status?: number;
}

@Controller('teachers')
export class TeacherController {
  constructor(private teacher: TeacherService) {}

  @Get()
  listPublic() {
    return this.teacher.listPublic();
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  listAll() {
    return this.teacher.listAll();
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  create(@Body() dto: CreateTeacherDto) {
    return this.teacher.create(dto);
  }

  @Put('admin/:id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTeacherDto) {
    return this.teacher.update(id, dto);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.teacher.remove(id);
  }
}
