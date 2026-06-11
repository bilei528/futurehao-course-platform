import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsIn, IsInt } from 'class-validator';
import { OrderService } from './order.service';
import { PaymentService } from '../payment/payment.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

class CreateOrderDto {
  @IsInt()
  packageId: number;

  @IsIn(['wechat', 'alipay'])
  payChannel: 'wechat' | 'alipay';
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(
    private order: OrderService,
    private payment: PaymentService,
    private config: ConfigService,
  ) {}

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrderDto) {
    const order = await this.order.createOrder(user.sub, dto.packageId, dto.payChannel);
    const amount = Number(order.amount);
    const description = `课程包购买-${order.orderNo}`;

    const qr =
      dto.payChannel === 'wechat'
        ? await this.payment.createWechatNativePay(order.orderNo, amount, description)
        : await this.payment.createAlipayQrPay(order.orderNo, amount, description);

    return {
      orderNo: order.orderNo,
      amount: order.amount.toString(),
      payChannel: dto.payChannel,
      qrCode: qr.qrCode,
      mock: qr.mock ?? false,
    };
  }

  @Post(':orderNo/mock-pay')
  async mockPay(@CurrentUser() user: JwtPayload, @Param('orderNo') orderNo: string) {
    if (this.config.get('PAYMENT_MODE') !== 'mock') {
      throw new ForbiddenException('仅本地开发模式可用');
    }
    await this.order.markPaid(orderNo, `MOCK_${Date.now()}`);
    return this.order.getOrder(user.sub, orderNo);
  }

  @Get(':orderNo')
  getOrder(@CurrentUser() user: JwtPayload, @Param('orderNo') orderNo: string) {
    return this.order.getOrder(user.sub, orderNo);
  }
}
