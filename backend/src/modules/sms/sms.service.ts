import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import * as crypto from 'crypto';

@Injectable()
export class SmsService {
  constructor(
    private config: ConfigService,
    private redis: RedisService,
  ) {}

  private codeKey(phone: string) {
    return `sms:code:${phone}`;
  }

  private rateKey(phone: string) {
    return `sms:rate:${phone}`;
  }

  generateCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  async sendLoginCode(phone: string): Promise<void> {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      throw new BadRequestException('手机号格式不正确');
    }

    const rateCount = await this.redis.incr(this.rateKey(phone));
    if (rateCount === 1) {
      await this.redis.expire(this.rateKey(phone), 60);
    }
    if (rateCount > 1) {
      throw new BadRequestException('发送过于频繁，请稍后再试');
    }

    const code = this.generateCode();
    await this.redis.set(this.codeKey(phone), code, 300);

    const isDev = this.config.get('NODE_ENV') !== 'production';
    if (isDev) {
      console.log(`[DEV SMS] ${phone} => ${code}`);
      return;
    }

    await this.sendAliyunSms(phone, code);
  }

  async verifyCode(phone: string, code: string): Promise<boolean> {
    const stored = await this.redis.get(this.codeKey(phone));
    if (!stored || stored !== code) {
      return false;
    }
    await this.redis.del(this.codeKey(phone));
    return true;
  }

  private async sendAliyunSms(phone: string, code: string): Promise<void> {
    const accessKeyId = this.config.getOrThrow('ALIYUN_ACCESS_KEY_ID');
    const accessKeySecret = this.config.getOrThrow('ALIYUN_ACCESS_KEY_SECRET');
    const signName = this.config.getOrThrow('ALIYUN_SMS_SIGN_NAME');
    const templateCode = this.config.getOrThrow('ALIYUN_SMS_TEMPLATE_CODE');

    const params = new URLSearchParams({
      AccessKeyId: accessKeyId,
      Action: 'SendSms',
      Format: 'JSON',
      PhoneNumbers: phone,
      RegionId: 'cn-hangzhou',
      SignName: signName,
      SignatureMethod: 'HMAC-SHA1',
      SignatureNonce: crypto.randomUUID(),
      SignatureVersion: '1.0',
      TemplateCode: templateCode,
      TemplateParam: JSON.stringify({ code }),
      Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      Version: '2017-05-25',
    });

    const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    const canonicalized = sorted.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    const stringToSign = `GET&${encodeURIComponent('/')}&${encodeURIComponent(canonicalized)}`;
    const signature = crypto
      .createHmac('sha1', `${accessKeySecret}&`)
      .update(stringToSign)
      .digest('base64');

    params.append('Signature', signature);

    const url = `https://dysmsapi.aliyuncs.com/?${params.toString()}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.Code !== 'OK') {
      throw new BadRequestException(`短信发送失败: ${data.Message || data.Code}`);
    }
  }
}
