// PathCraft AI – Database Seed
// Seeds the guest user required for anonymous sessions
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load env vars when running directly via ts-node
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

function getPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

async function main() {
  const prisma = getPrisma();
  try {
    const guest = await prisma.user.upsert({
      where: { email: 'guest@pathcraft.ai' },
      update: {},
      create: { email: 'guest@pathcraft.ai', name: 'Guest' },
    });
    console.log('✅ Seed complete — guest user id:', guest.id);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
