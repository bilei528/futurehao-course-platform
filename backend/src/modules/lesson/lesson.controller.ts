import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { LessonService } from './lesson.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

class CreateLessonDto {
  @IsInt()
  packageId: number;

  @IsString()
  title: string;

  @IsString()
  ossKey: string;

  @IsOptional()
  @IsInt()
  duration?: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

class UpdateLessonDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  ossKey?: string;

  @IsOptional()
  @IsInt()
  duration?: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsInt()
  status?: number;
}

@Controller('lessons')
export class LessonController {
  constructor(private lesson: LessonService) {}

  @Get(':id/play')
  @UseGuards(JwtAuthGuard)
  play(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.lesson.getPlayUrl(id, user.sub);
  }

  @Get(':id/stream')
  async stream(
    @Param('id', ParseIntPipe) id: number,
    @Query('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!token) {
      throw new UnauthorizedException('缺少播放凭证');
    }

    const result = await this.lesson.streamVideo(id, token, req.headers.range);
    res.status(result.status);
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Length', result.contentLength);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (result.contentRange) {
      res.setHeader('Content-Range', result.contentRange);
    }

    result.stream.pipe(res);
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  create(@Body() dto: CreateLessonDto) {
    return this.lesson.create(dto);
  }

  @Put('admin/:id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLessonDto) {
    return this.lesson.update(id, dto);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.lesson.remove(id);
  }
}
