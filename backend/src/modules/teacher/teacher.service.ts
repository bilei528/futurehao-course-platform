import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TeacherService {
  constructor(private prisma: PrismaService) {}

  listPublic() {
    return this.prisma.teacher.findMany({
      where: { status: 1 },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        title: true,
        bio: true,
        phone: true,
        wechat: true,
      },
    });
  }

  listAll() {
    return this.prisma.teacher.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async create(data: {
    name: string;
    title?: string;
    bio?: string;
    phone?: string;
    wechat?: string;
    sortOrder?: number;
  }) {
    return this.prisma.teacher.create({
      data: {
        name: data.name.trim(),
        title: data.title?.trim() || null,
        bio: data.bio?.trim() || null,
        phone: data.phone?.trim() || null,
        wechat: data.wechat?.trim() || null,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      title?: string;
      bio?: string;
      phone?: string;
      wechat?: string;
      sortOrder?: number;
      status?: number;
    },
  ) {
    await this.ensureExists(id);
    const updateData: Record<string, unknown> = { ...data };
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.title !== undefined) updateData.title = data.title.trim() || null;
    if (data.bio !== undefined) updateData.bio = data.bio.trim() || null;
    if (data.phone !== undefined) updateData.phone = data.phone.trim() || null;
    if (data.wechat !== undefined) updateData.wechat = data.wechat.trim() || null;
    return this.prisma.teacher.update({ where: { id }, data: updateData });
  }

  async remove(id: number) {
    await this.ensureExists(id);
    await this.prisma.teacher.delete({ where: { id } });
    return { message: '教师已删除' };
  }

  private async ensureExists(id: number) {
    const teacher = await this.prisma.teacher.findUnique({ where: { id } });
    if (!teacher) throw new NotFoundException('教师不存在');
  }
}
