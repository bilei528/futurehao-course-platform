import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PackageService {
  constructor(private prisma: PrismaService) {}

  async getDetail(id: number, userId?: number) {
    const pkg = await this.prisma.coursePackage.findUnique({
      where: { id },
      include: {
        grade: { select: { id: true, name: true } },
        lessons: {
          where: { status: 1 },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, title: true, duration: true, sortOrder: true },
        },
      },
    });
    if (!pkg || pkg.status !== 1) {
      throw new NotFoundException('课程包不存在');
    }

    let purchased = false;
    if (userId) {
      const record = await this.prisma.userPurchase.findUnique({
        where: { userId_packageId: { userId, packageId: id } },
      });
      purchased = !!record;
    }

    return {
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      price: pkg.price.toString(),
      grade: pkg.grade,
      lessons: pkg.lessons,
      purchased,
    };
  }

  async listMyPurchases(userId: number) {
    const purchases = await this.prisma.userPurchase.findMany({
      where: { userId },
      include: {
        package: {
          include: {
            grade: { select: { id: true, name: true } },
            lessons: {
              where: { status: 1 },
              orderBy: { sortOrder: 'asc' },
              select: { id: true, title: true, duration: true },
            },
          },
        },
      },
      orderBy: { purchasedAt: 'desc' },
    });

    return purchases.map((p) => ({
      purchasedAt: p.purchasedAt,
      package: {
        ...p.package,
        price: p.package.price.toString(),
      },
    }));
  }

  async create(data: {
    gradeId: number;
    name: string;
    description?: string;
    price: number;
    sortOrder?: number;
  }) {
    return this.prisma.coursePackage.create({
      data: {
        gradeId: data.gradeId,
        name: data.name,
        description: data.description?.trim() || null,
        price: new Decimal(data.price),
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      description?: string;
      price?: number;
      sortOrder?: number;
      status?: number;
    },
  ) {
    await this.ensureExists(id);
    const updateData: Record<string, unknown> = { ...data };
    if (data.price !== undefined) {
      updateData.price = new Decimal(data.price);
    }
    return this.prisma.coursePackage.update({ where: { id }, data: updateData });
  }

  async remove(id: number) {
    await this.ensureExists(id);

    await this.prisma.$transaction(async (tx) => {
      await tx.userPurchase.deleteMany({ where: { packageId: id } });
      await tx.order.deleteMany({ where: { packageId: id } });
      await tx.lesson.deleteMany({ where: { packageId: id } });
      await tx.coursePackage.delete({ where: { id } });
    });

    return { message: '课程包已删除' };
  }

  async hasPurchased(userId: number, packageId: number): Promise<boolean> {
    const record = await this.prisma.userPurchase.findUnique({
      where: { userId_packageId: { userId, packageId } },
    });
    return !!record;
  }

  private async ensureExists(id: number) {
    const pkg = await this.prisma.coursePackage.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException('课程包不存在');
  }
}
