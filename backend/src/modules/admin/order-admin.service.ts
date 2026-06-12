import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const ONLINE_CHANNELS = ['wechat', 'alipay'] as const;

function formatOrder(order: {
  id: number;
  orderNo: string;
  amount: { toString(): string };
  payChannel: string;
  status: string;
  tradeNo: string | null;
  paidAt: Date | null;
  createdAt: Date;
  user: { id: number; phone: string; childName: string | null };
  package: { id: number; name: string; grade: { name: string } };
}) {
  return {
    id: order.id,
    orderNo: order.orderNo,
    amount: order.amount.toString(),
    payChannel: order.payChannel,
    payChannelLabel: channelLabel(order.payChannel),
    status: order.status,
    statusLabel: statusLabel(order.status),
    tradeNo: order.tradeNo,
    paidAt: order.paidAt,
    createdAt: order.createdAt,
    user: {
      id: order.user.id,
      phone: order.user.phone,
      childName: order.user.childName,
    },
    package: {
      id: order.package.id,
      name: order.package.name,
      gradeName: order.package.grade.name,
    },
  };
}

function channelLabel(channel: string) {
  if (channel === 'wechat') return '微信支付';
  if (channel === 'alipay') return '支付宝';
  if (channel === 'admin') return '管理员开通';
  return channel;
}

function statusLabel(status: string) {
  if (status === 'paid') return '已支付';
  return status;
}

@Injectable()
export class OrderAdminService {
  constructor(private prisma: PrismaService) {}

  async listOrders(keyword?: string) {
    const kw = keyword?.trim();
    const where: Record<string, unknown> = { status: 'paid' };

    if (kw) {
      where.AND = [
        {
          OR: [
            { orderNo: { contains: kw } },
            { user: { phone: { contains: kw } } },
            { user: { childName: { contains: kw } } },
            { package: { name: { contains: kw } } },
            { package: { grade: { name: { contains: kw } } } },
          ],
        },
      ];
    }

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, phone: true, childName: true } },
        package: {
          include: { grade: { select: { name: true } } },
        },
      },
    });

    return orders.map(formatOrder);
  }

  async getPaymentStats() {
    const paidOnline = await this.prisma.order.findMany({
      where: {
        status: 'paid',
        payChannel: { in: [...ONLINE_CHANNELS] },
      },
      select: { amount: true, payChannel: true, paidAt: true },
    });

    let totalRevenue = 0;
    let wechatRevenue = 0;
    let alipayRevenue = 0;
    let todayRevenue = 0;
    let todayCount = 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    for (const order of paidOnline) {
      const amount = Number(order.amount);
      totalRevenue += amount;
      if (order.payChannel === 'wechat') wechatRevenue += amount;
      if (order.payChannel === 'alipay') alipayRevenue += amount;
      if (order.paidAt && order.paidAt >= todayStart) {
        todayRevenue += amount;
        todayCount += 1;
      }
    }

    const [paidOnlineCount, adminGrantCount] = await Promise.all([
      this.prisma.order.count({
        where: { status: 'paid', payChannel: { in: [...ONLINE_CHANNELS] } },
      }),
      this.prisma.order.count({
        where: { status: 'paid', payChannel: 'admin' },
      }),
    ]);

    return {
      totalRevenue: totalRevenue.toFixed(2),
      paidOnlineCount,
      wechatRevenue: wechatRevenue.toFixed(2),
      alipayRevenue: alipayRevenue.toFixed(2),
      todayRevenue: todayRevenue.toFixed(2),
      todayCount,
      adminGrantCount,
    };
  }
}
