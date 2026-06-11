import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OSS from 'ali-oss';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OssService {
  private client: OSS | null = null;

  constructor(private config: ConfigService) {
    if (!this.isLocal()) {
      this.client = new OSS({
        region: this.config.getOrThrow('OSS_REGION'),
        accessKeyId: this.config.getOrThrow('ALIYUN_ACCESS_KEY_ID'),
        accessKeySecret: this.config.getOrThrow('ALIYUN_ACCESS_KEY_SECRET'),
        bucket: this.config.getOrThrow('OSS_BUCKET'),
        secure: true,
      });
    }
  }

  isLocal(): boolean {
    return this.config.get('STORAGE_MODE', 'oss') === 'local';
  }

  buildKey(gradeId: number, packageId: number, filename: string): string {
    const ext = filename.split('.').pop() || 'mp4';
    return `courses/grade-${gradeId}/package-${packageId}/${uuidv4()}.${ext}`;
  }

  async getUploadCredentials(key: string) {
    if (this.isLocal()) {
      return {
        key,
        uploadUrl: '/api/local-storage/upload-file',
        mode: 'local' as const,
        expires: 3600,
      };
    }

    const expires = 3600;
    const url = this.client!.signatureUrl(key, {
      method: 'PUT',
      expires,
      'Content-Type': 'video/mp4',
    });

    return {
      key,
      uploadUrl: url,
      mode: 'oss' as const,
      expires,
    };
  }

  getPlayUrl(key: string, expires = 7200): string {
    if (this.isLocal()) {
      return '';
    }
    return this.client!.signatureUrl(key, {
      method: 'GET',
      expires,
    });
  }
}
