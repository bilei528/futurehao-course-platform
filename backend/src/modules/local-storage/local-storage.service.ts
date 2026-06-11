import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocalStorageService {
  private baseDir: string;

  constructor(private config: ConfigService) {
    this.baseDir = path.resolve(this.config.get('LOCAL_STORAGE_DIR', './uploads'));
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  resolvePath(key: string): string {
    const safeKey = key.replace(/\.\./g, '').replace(/^\/+/, '');
    return path.join(this.baseDir, safeKey);
  }

  async saveFile(key: string, buffer: Buffer): Promise<void> {
    const filePath = this.resolvePath(key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(filePath, buffer);
  }

  getFileStat(key: string) {
    const filePath = this.resolvePath(key);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('视频文件不存在');
    }
    return fs.statSync(filePath);
  }

  getReadStream(key: string, range?: { start: number; end: number }) {
    const filePath = this.resolvePath(key);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('视频文件不存在');
    }
    return range
      ? fs.createReadStream(filePath, { start: range.start, end: range.end })
      : fs.createReadStream(filePath);
  }

  fileExists(key: string): boolean {
    return fs.existsSync(this.resolvePath(key));
  }

}
