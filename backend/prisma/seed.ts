import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123456';

  const existing = await prisma.admin.findUnique({ where: { username } });
  if (!existing) {
    await prisma.admin.create({
      data: { username, passwordHash: hashPassword(password) },
    });
    console.log(`管理员已创建: ${username}`);
  }

  const gradeCount = await prisma.grade.count();
  if (gradeCount === 0) {
    await prisma.grade.createMany({
      data: [
        { name: '一年级', sortOrder: 1 },
        { name: '二年级', sortOrder: 2 },
        { name: '三年级', sortOrder: 3 },
      ],
    });
    console.log('示例年级已创建');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
