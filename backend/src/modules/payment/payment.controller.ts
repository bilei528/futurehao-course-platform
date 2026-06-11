import { Controller, Post, Req, Headers, RawBodyRequest, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { PaymentService } from './payment.service';
import { OrderService } from '../order/order.service';

@Controller('payment')
export class PaymentController {
  constructor(
    private payment: PaymentService,
    private order: OrderService,
  ) {}

  @Post('notify/wechat')
  async wechatNotify(
    @Req() req: RawBodyRequest<Request>,
    @Headers('wechatpay-timestamp') timestamp: string,
    @Headers('wechatpay-nonce') nonce: string,
    @Headers('wechatpay-signature') signature: string,
  ) {
    const rawBody = req.rawBody?.toString('utf8') ?? '';
    if (!this.payment.verifyWechatSignature(timestamp, nonce, rawBody, signature)) {
      throw new BadRequestException('签名验证失败');
    }

    const payload = JSON.parse(rawBody);
    const resource = this.payment.decryptWechatResource(
      payload.resource.ciphertext,
      payload.resource.nonce,
      payload.resource.associated_data,
    );

    if (resource.trade_state === 'SUCCESS') {
      await this.order.markPaid(
        resource.out_trade_no as string,
        resource.transaction_id as string,
      );
    }

    return { code: 'SUCCESS', message: '成功' };
  }

  @Post('notify/alipay')
  async alipayNotify(@Req() req: Request) {
    const params = req.body as Record<string, string>;
    if (!this.payment.verifyAlipayNotify(params)) {
      return 'fail';
    }

    if (params.trade_status === 'TRADE_SUCCESS' || params.trade_status === 'TRADE_FINISHED') {
      await this.order.markPaid(params.out_trade_no, params.trade_no);
    }

    return 'success';
  }
}
