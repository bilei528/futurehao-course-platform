import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsInt, IsString } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { OssService } from './oss.service';

class UploadCredentialDto {
  @IsInt()
  gradeId: number;

  @IsInt()
  packageId: number;

  @IsString()
  filename: string;
}

@Controller('oss')
@UseGuards(JwtAuthGuard, AdminAuthGuard)
export class OssController {
  constructor(private oss: OssService) {}

  @Post('upload-credential')
  async getUploadCredential(@Body() dto: UploadCredentialDto) {
    const key = this.oss.buildKey(dto.gradeId, dto.packageId, dto.filename);
    const credential = await this.oss.getUploadCredentials(key);
    return { success: true, data: credential };
  }

}
