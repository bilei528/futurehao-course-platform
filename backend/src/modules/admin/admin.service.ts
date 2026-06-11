import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  verifyPassword(password: string, stored: string): boolean {
    const [salt, hash] = stored.split(':');
    const verify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verify;
  }

  async login(username: string, password: string) {
    const admin = await this.prisma.admin.findUnique({ where: { username } });
    if (!admin || !this.verifyPassword(password, admin.passwordHash)) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const token = this.jwt.sign({
      sub: admin.id,
      phone: username,
      role: 'admin',
    });

    return { token, admin: { id: admin.id, username: admin.username } };
  }

  async createAdmin(username: string, password: string) {
    return this.prisma.admin.create({
      data: {
        username,
        passwordHash: this.hashPassword(password),
      },
      select: { id: true, username: true, createdAt: true },
    });
  }
}
