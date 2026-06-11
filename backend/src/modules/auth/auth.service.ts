import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private sms: SmsService,
    private config: ConfigService,
  ) {}

  skipSmsVerify(): boolean {
    return (
      this.config.get('SKIP_SMS_VERIFY') === 'true' ||
      this.config.get('LOCAL_DEV') === 'true'
    );
  }

  async sendCode(phone: string) {
    if (this.skipSmsVerify()) {
      return { message: '本地测试模式，无需验证码，直接登录即可' };
    }
    await this.sms.sendLoginCode(phone);
    return { message: '验证码已发送' };
  }

  async checkPhone(phone: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    return { registered: !!user, skipSmsVerify: this.skipSmsVerify() };
  }

  async loginWithCode(phone: string, code: string | undefined, childName?: string) {
    if (!this.skipSmsVerify()) {
      if (!code || code.length !== 6) {
        throw new BadRequestException('请输入6位验证码');
      }
      const valid = await this.sms.verifyCode(phone, code);
      if (!valid) {
        throw new UnauthorizedException('验证码错误或已过期');
      }
    }

    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      const name = childName?.trim();
      if (!name) {
        throw new BadRequestException('新用户注册请填写孩子姓名');
      }
      if (name.length < 2 || name.length > 20) {
        throw new BadRequestException('孩子姓名长度为 2~20 个字符');
      }
      user = await this.prisma.user.create({
        data: { phone, childName: name },
      });
    }

    const token = this.jwt.sign({
      sub: user.id,
      phone: user.phone,
      role: 'user',
    });

    return {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        childName: user.childName,
      },
    };
  }
}
