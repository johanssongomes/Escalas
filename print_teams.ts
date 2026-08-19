import 'dotenv/config';
import { prisma } from './server/db.ts';

async function main() {
  const config = await prisma.escalaConfig.findUnique({ where: { id: 1 } });
  if (!config) return;
  console.log('Teams:', JSON.stringify(config.teams, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
