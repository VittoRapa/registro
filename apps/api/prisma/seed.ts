import { PrismaClient } from '@prisma/client';
import { runAutoSeed } from '../src/prisma/seed.runner';

const prisma = new PrismaClient();

runAutoSeed(prisma)
  .catch((e) => {
    console.error('❌ Errore durante il seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
