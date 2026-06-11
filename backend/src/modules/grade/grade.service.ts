import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GradeService {
  constructor(private prisma: PrismaService) {}

  async listPublic() {
    const grades = await this.prisma.grade.findMany({
      where: { status: 1 },
      orderBy: { sortOrder: 'asc' },
      include: {
        packages: {
          where: { status: 1 },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            sortOrder: true,
          },
        },
      },
    });

    return grades.map((grade) => ({
      ...grade,
      packages: grade.packages.map((pkg) => ({
        ...pkg,
        price: pkg.price.toString(),
      })),
    }));
  }

  async listAll() {
    const grades = await this.prisma.grade.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        packages: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                title: true,
                duration: true,
                sortOrder: true,
                status: true,
                ossKey: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    return grades.map((grade) => ({
      ...grade,
      packages: grade.packages.map((pkg) => ({
        ...pkg,
        price: pkg.price.toString(),
      })),
    }));
  }

  async create(data: { name: string; sortOrder?: number }) {
    return this.prisma.grade.create({
      data: { name: data.name, sortOrder: data.sortOrder ?? 0 },
    });
  }

  async update(id: number, data: { name?: string; sortOrder?: number; status?: number }) {
    await this.ensureExists(id);
    return this.prisma.grade.update({ where: { id }, data });
  }

  async remove(id: number) {
    await this.ensureExists(id);

    const packages = await this.prisma.coursePackage.findMany({
      where: { gradeId: id },
      select: { id: true },
    });

    await this.prisma.$transaction(async (tx) => {
      for (const pkg of packages) {
        await tx.userPurchase.deleteMany({ where: { packageId: pkg.id } });
        await tx.order.deleteMany({ where: { packageId: pkg.id } });
        await tx.lesson.deleteMany({ where: { packageId: pkg.id } });
        await tx.coursePackage.delete({ where: { id: pkg.id } });
      }
      await tx.grade.delete({ where: { id } });
    });

    return { message: '年级已删除' };
  }

  private async ensureExists(id: number) {
    const grade = await this.prisma.grade.findUnique({ where: { id } });
    if (!grade) throw new NotFoundException('年级不存在');
  }
}
