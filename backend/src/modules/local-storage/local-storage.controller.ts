import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  RawBodyRequest,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { LocalStorageService } from './local-storage.service';

@Controller('local-storage')
export class LocalStorageController {
  constructor(private storage: LocalStorageService) {}

  @Post('upload-file')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 1024 * 1024 * 1024 },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('key') key: string,
  ) {
    if (!key?.trim()) {
      throw new BadRequestException('缺少文件 key');
    }
    if (!file) {
      throw new BadRequestException('请选择视频文件');
    }
    await this.storage.saveFile(key, file.buffer);
    return { success: true, key };
  }

  @Put('upload')
  @UseGuards(JwtAuthGuard, AdminAuthGuard)
  async uploadPut(@Req() req: RawBodyRequest<Request>) {
    const key = req.headers['x-storage-key'] as string;
    if (!key) {
      throw new BadRequestException('缺少 X-Storage-Key 请求头');
    }
    const body = req.rawBody;
    if (!body?.length) {
      throw new BadRequestException('上传内容为空');
    }
    await this.storage.saveFile(key, body);
    return { success: true, key };
  }
}
