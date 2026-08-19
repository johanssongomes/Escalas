import 'dotenv/config';
import { prisma } from './server/db.ts';

async function main() {
  const config = await prisma.escalaConfig.findUnique({ where: { id: 1 } });
  if (!config) return;
  const colaboradores = config.colaboradores as any[];
  console.log('Type of config.colaboradores:', typeof config.colaboradores);
  console.log('Is Array?', Array.isArray(config.colaboradores));
  console.log('First element:', config.colaboradores?.[0]);
  console.log('Keys of first element:', Object.keys(config.colaboradores?.[0] || {}));
}

main().catch(console.error).finally(() => prisma.$disconnect());
