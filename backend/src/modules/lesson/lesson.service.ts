import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ReadStream } from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { PackageService } from '../package/package.service';
import { OssService } from '../oss/oss.service';
import { LocalStorageService } from '../local-storage/local-storage.service';

const PLAY_TOKEN_EXPIRES = '2h';
const OSS_PLAY_EXPIRES = 3600;

interface StreamResult {
  status: number;
  stream: ReadStream;
  contentType: string;
  contentLength: number;
  contentRange?: string;
}

@Injectable()
export class LessonService {
  constructor(
    private prisma: PrismaService,
    private packageService: PackageService,
    private oss: OssService,
    private localStorage: LocalStorageService,
    private jwt: JwtService,
  ) {}

  async getPlayUrl(lessonId: number, userId: number) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { package: true },
    });
    if (!lesson || lesson.status !== 1) {
      throw new NotFoundException('课程不存在');
    }

    const purchased = await this.packageService.hasPurchased(userId, lesson.packageId);
    if (!purchased) {
      throw new ForbiddenException('请先购买该课程包');
    }

    if (this.oss.isLocal()) {
      const playToken = this.signPlayToken(lessonId, userId);
      return {
        title: lesson.title,
        duration: lesson.duration,
        mode: 'local' as const,
        playUrl: `/api/lessons/${lessonId}/stream?token=${encodeURIComponent(playToken)}`,
      };
    }

    return {
      title: lesson.title,
      playUrl: this.oss.getPlayUrl(lesson.ossKey, OSS_PLAY_EXPIRES),
      duration: lesson.duration,
      mode: 'oss' as const,
    };
  }

  async streamVideo(lessonId: number, token: string, rangeHeader?: string): Promise<StreamResult> {
    await this.verifyPlayToken(lessonId, token);

    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson || lesson.status !== 1) {
      throw new NotFoundException('课程不存在');
    }

    const ext = path.extname(lesson.ossKey).toLowerCase();
    const contentType = ext === '.webm' ? 'video/webm' : 'video/mp4';
    const stat = this.localStorage.getFileStat(lesson.ossKey);
    const fileSize = stat.size;

    if (rangeHeader) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
      if (!match) {
        throw new ForbiddenException('无效的范围请求');
      }

      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= fileSize) {
        throw new ForbiddenException('无效的范围请求');
      }

      const safeEnd = Math.min(end, fileSize - 1);
      const contentLength = safeEnd - start + 1;

      return {
        status: 206,
        stream: this.localStorage.getReadStream(lesson.ossKey, { start, end: safeEnd }),
        contentType,
        contentLength,
        contentRange: `bytes ${start}-${safeEnd}/${fileSize}`,
      };
    }

    return {
      status: 200,
      stream: this.localStorage.getReadStream(lesson.ossKey),
      contentType,
      contentLength: fileSize,
    };
  }

  private signPlayToken(lessonId: number, userId: number): string {
    return this.jwt.sign(
      { sub: userId, lessonId, purpose: 'video-play' },
      { expiresIn: PLAY_TOKEN_EXPIRES },
    );
  }

  private async verifyPlayToken(lessonId: number, token: string): Promise<number> {
    let payload: { sub?: number; lessonId?: number; purpose?: string };
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new ForbiddenException('播放凭证无效或已过期');
    }

    if (payload.purpose !== 'video-play' || payload.lessonId !== lessonId || !payload.sub) {
      throw new ForbiddenException('播放凭证无效');
    }

    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson || lesson.status !== 1) {
      throw new NotFoundException('课程不存在');
    }

    const purchased = await this.packageService.hasPurchased(payload.sub, lesson.packageId);
    if (!purchased) {
      throw new ForbiddenException('请先购买该课程包');
    }

    return payload.sub;
  }

  async create(data: {
    packageId: number;
    title: string;
    ossKey: string;
    duration?: number;
    sortOrder?: number;
  }) {
    return this.prisma.lesson.create({
      data: {
        packageId: data.packageId,
        title: data.title,
        ossKey: data.ossKey,
        duration: data.duration ?? 0,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async update(
    id: number,
    data: { title?: string; ossKey?: string; duration?: number; sortOrder?: number; status?: number },
  ) {
    await this.ensureExists(id);
    return this.prisma.lesson.update({ where: { id }, data });
  }

  async remove(id: number) {
    await this.ensureExists(id);
    return this.prisma.lesson.delete({ where: { id } });
  }

  private async ensureExists(id: number) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('课程不存在');
  }
}
