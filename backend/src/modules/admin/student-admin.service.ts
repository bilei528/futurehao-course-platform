import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StudentAdminService {
  constructor(private prisma: PrismaService) {}

  async listStudents(keyword?: string) {
    const kw = keyword?.trim();
    const where = kw
      ? {
          OR: [
            { phone: { contains: kw } },
            { childName: { contains: kw } },
            {
              purchases: {
                some: {
                  package: {
                    OR: [{ name: { contains: kw } }, { grade: { name: { contains: kw } } }],
                  },
                },
              },
            },
          ],
        }
      : undefined;

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        purchases: {
          include: {
            order: { select: { payChannel: true } },
            package: {
              include: { grade: { select: { id: true, name: true } } },
            },
          },
          orderBy: { purchasedAt: 'desc' },
        },
      },
    });

    return users.map((user) => ({
      id: user.id,
      phone: user.phone,
      childName: user.childName,
      createdAt: user.createdAt,
      purchases: user.purchases.map((p) => ({
        id: p.id,
        packageId: p.packageId,
        packageName: p.package.name,
        gradeName: p.package.grade.name,
        purchasedAt: p.purchasedAt,
        source: p.order?.payChannel === 'admin' ? '管理员开通' : '在线购买',
      })),
    }));
  }

  async createStudent(phone: string, childName: string) {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      throw new BadRequestException('手机号格式不正确');
    }
    const name = childName.trim();
    if (!name || name.length < 2 || name.length > 20) {
      throw new BadRequestException('孩子姓名长度为 2~20 个字符');
    }

    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) {
      throw new BadRequestException('该手机号已注册');
    }

    return this.prisma.user.create({
      data: { phone, childName: name },
      select: { id: true, phone: true, childName: true, createdAt: true },
    });
  }

  async grantPackage(userId: number, packageId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('学员不存在');

    const pkg = await this.prisma.coursePackage.findUnique({ where: { id: packageId } });
    if (!pkg) throw new NotFoundException('课程包不存在');

    const existing = await this.prisma.userPurchase.findUnique({
      where: { userId_packageId: { userId, packageId } },
    });
    if (existing) {
      throw new BadRequestException('该学员已拥有此课程包');
    }

    const orderNo = `ADM${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${uuidv4().replace(/-/g, '').slice(0, 10).toUpperCase()}`;

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNo,
          userId,
          packageId,
          amount: new Decimal(0),
          payChannel: 'admin',
          status: 'paid',
          tradeNo: 'manual_grant',
          paidAt: new Date(),
        },
      });

      const purchase = await tx.userPurchase.create({
        data: { userId, packageId, orderId: order.id },
        include: {
          package: { include: { grade: { select: { name: true } } } },
        },
      });

      return {
        message: '课程已开通',
        purchase: {
          packageId: purchase.packageId,
          packageName: purchase.package.name,
          gradeName: purchase.package.grade.name,
          purchasedAt: purchase.purchasedAt,
        },
      };
    });
  }

  async revokePackage(userId: number, packageId: number) {
    const purchase = await this.prisma.userPurchase.findUnique({
      where: { userId_packageId: { userId, packageId } },
      include: { order: true },
    });
    if (!purchase) {
      throw new NotFoundException('该学员未购买此课程包');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userPurchase.delete({ where: { id: purchase.id } });
      if (purchase.order.payChannel === 'admin') {
        await tx.order.delete({ where: { id: purchase.orderId } });
      }
    });

    return { message: '已取消课程权限' };
  }

  async deleteStudent(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('学员不存在');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userPurchase.deleteMany({ where: { userId } });
      await tx.order.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    return { message: '学员已删除' };
  }
}
