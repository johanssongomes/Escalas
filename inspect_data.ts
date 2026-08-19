import 'dotenv/config';
import { prisma } from './server/db.ts';

async function main() {
  const config = await prisma.escalaConfig.findUnique({ where: { id: 1 } });
  if (!config) {
    console.log('No config found.');
    return;
  }
  console.log('config.demanda_m3 type:', typeof config.demanda_m3);
  console.log('config.demanda_m3 value:', JSON.stringify(config.demanda_m3));
}

main().catch(console.error).finally(() => prisma.$disconnect());
