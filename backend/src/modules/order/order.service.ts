import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PackageService } from '../package/package.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private packageService: PackageService,
  ) {}

  private generateOrderNo(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `ORD${date}${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
  }

  async createOrder(userId: number, packageId: number, payChannel: 'wechat' | 'alipay') {
    const pkg = await this.packageService.getDetail(packageId);
    if (pkg.purchased) {
      throw new BadRequestException('您已购买该课程包');
    }

    const pending = await this.prisma.order.findFirst({
      where: { userId, packageId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
    if (pending) {
      return pending;
    }

    return this.prisma.order.create({
      data: {
        orderNo: this.generateOrderNo(),
        userId,
        packageId,
        amount: pkg.price,
        payChannel,
        status: 'pending',
      },
    });
  }

  async getOrder(userId: number, orderNo: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNo },
      include: {
        package: { select: { id: true, name: true, price: true } },
      },
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('订单不存在');
    }
    return {
      ...order,
      amount: order.amount.toString(),
      package: { ...order.package, price: order.package.price.toString() },
    };
  }

  async markPaid(orderNo: string, tradeNo: string) {
    const order = await this.prisma.order.findUnique({ where: { orderNo } });
    if (!order) return;
    if (order.status === 'paid') return;

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'paid', tradeNo, paidAt: new Date() },
      });

      const existing = await tx.userPurchase.findUnique({
        where: { userId_packageId: { userId: order.userId, packageId: order.packageId } },
      });
      if (!existing) {
        await tx.userPurchase.create({
          data: {
            userId: order.userId,
            packageId: order.packageId,
            orderId: order.id,
          },
        });
      }
    });
  }
}
