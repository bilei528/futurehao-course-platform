import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { GradeService } from './grade.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

class CreateGradeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

class UpdateGradeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsInt()
  status?: number;
}

@Controller('grades')
export class GradeController {
  constructor(private grade: GradeService) {}

  @Get()
  listPublic() {
    return this.grade.listPublic();
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  listAll() {
    return this.grade.listAll();
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  create(@Body() dto: CreateGradeDto) {
    return this.grade.create(dto);
  }

  @Put('admin/:id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGradeDto) {
    return this.grade.update(id, dto);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.grade.remove(id);
  }
}
