import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlipaySdk } from 'alipay-sdk';
import * as crypto from 'crypto';
import * as fs from 'fs';

export interface QrPayResult {
  qrCode: string;
  channel: 'wechat' | 'alipay';
  mock?: boolean;
}

@Injectable()
export class PaymentService {
  private alipay: AlipaySdk | null = null;

  constructor(private config: ConfigService) {
    if (!this.isMock() && config.get('ALIPAY_APP_ID')) {
      this.alipay = new AlipaySdk({
        appId: config.getOrThrow('ALIPAY_APP_ID'),
        privateKey: config.getOrThrow('ALIPAY_PRIVATE_KEY'),
        alipayPublicKey: config.getOrThrow('ALIPAY_PUBLIC_KEY'),
        gateway: config.get('ALIPAY_GATEWAY', 'https://openapi.alipay.com/gateway.do'),
      });
    }
  }

  isMock(): boolean {
    return this.config.get('PAYMENT_MODE', 'live') === 'mock';
  }

  async createWechatNativePay(orderNo: string, amount: number, description: string): Promise<QrPayResult> {
    if (this.isMock()) {
      return { qrCode: `MOCK:${orderNo}`, channel: 'wechat', mock: true };
    }

    const mchId = this.config.getOrThrow('WECHAT_MCH_ID');
    const appId = this.config.getOrThrow('WECHAT_APP_ID');
    const apiV3Key = this.config.getOrThrow('WECHAT_API_V3_KEY');
    const serialNo = this.config.getOrThrow('WECHAT_SERIAL_NO');
    const privateKeyPath = this.config.getOrThrow('WECHAT_PRIVATE_KEY_PATH');
    const notifyUrl = this.config.getOrThrow('WECHAT_NOTIFY_URL');

    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    const url = '/v3/pay/transactions/native';
    const body = {
      appid: appId,
      mchid: mchId,
      description,
      out_trade_no: orderNo,
      notify_url: notifyUrl,
      amount: { total: Math.round(amount * 100), currency: 'CNY' },
    };

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const bodyStr = JSON.stringify(body);
    const message = `POST\n${url}\n${timestamp}\n${nonce}\n${bodyStr}\n`;
    const signature = crypto.createSign('RSA-SHA256').update(message).sign(privateKey, 'base64');
    const authorization =
      `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonce}",` +
      `signature="${signature}",timestamp="${timestamp}",serial_no="${serialNo}"`;

    const res = await fetch(`https://api.mch.weixin.qq.com${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: authorization,
      },
      body: bodyStr,
    });

    const data = await res.json();
    if (!res.ok || !data.code_url) {
      throw new BadRequestException(data.message || '微信支付下单失败');
    }

    void apiV3Key;
    return { qrCode: data.code_url, channel: 'wechat' };
  }

  async createAlipayQrPay(orderNo: string, amount: number, description: string): Promise<QrPayResult> {
    if (this.isMock()) {
      return { qrCode: `MOCK:${orderNo}`, channel: 'alipay', mock: true };
    }

    if (!this.alipay) {
      throw new BadRequestException('支付宝未配置');
    }

    const notifyUrl = this.config.getOrThrow('ALIPAY_NOTIFY_URL');
    const result = await this.alipay.exec('alipay.trade.precreate', {
      notify_url: notifyUrl,
      bizContent: {
        out_trade_no: orderNo,
        total_amount: amount.toFixed(2),
        subject: description,
      },
    });

    if (result.code !== '10000' || !result.qrCode) {
      throw new BadRequestException(result.subMsg || result.msg || '支付宝下单失败');
    }

    return { qrCode: result.qrCode, channel: 'alipay' };
  }

  verifyWechatSignature(timestamp: string, nonce: string, body: string, signature: string): boolean {
    const publicKeyPath = this.config.get('WECHAT_PLATFORM_CERT_PATH');
    if (!publicKeyPath) return false;
    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    const message = `${timestamp}\n${nonce}\n${body}\n`;
    return crypto.createVerify('RSA-SHA256').update(message).verify(publicKey, signature, 'base64');
  }

  decryptWechatResource(ciphertext: string, nonce: string, associatedData: string): Record<string, unknown> {
    const apiV3Key = this.config.getOrThrow('WECHAT_API_V3_KEY');
    const key = Buffer.from(apiV3Key, 'utf8');
    const data = Buffer.from(ciphertext, 'base64');
    const authTag = data.subarray(data.length - 16);
    const encrypted = data.subarray(0, data.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(nonce, 'utf8'));
    decipher.setAuthTag(authTag);
    if (associatedData) {
      decipher.setAAD(Buffer.from(associatedData, 'utf8'));
    }
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  }

  verifyAlipayNotify(params: Record<string, string>): boolean {
    if (!this.alipay) return false;
    return this.alipay.checkNotifySign(params);
  }
}
