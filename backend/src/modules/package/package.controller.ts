import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { PackageService } from './package.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

class CreatePackageDto {
  @IsInt()
  gradeId: number;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

class UpdatePackageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsInt()
  status?: number;
}

@Controller('packages')
export class PackageController {
  constructor(private packageService: PackageService) {}

  @Get('my')
  @UseGuards(JwtAuthGuard)
  myPurchases(@CurrentUser() user: JwtPayload) {
    return this.packageService.listMyPurchases(user.sub);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  detail(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload | null) {
    return this.packageService.getDetail(id, user?.sub);
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  create(@Body() dto: CreatePackageDto) {
    return this.packageService.create(dto);
  }

  @Put('admin/:id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePackageDto) {
    return this.packageService.update(id, dto);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.packageService.remove(id);
  }
}
