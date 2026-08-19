import 'dotenv/config';
import { prisma } from './server/db.ts';

async function main() {
  const config = await prisma.escalaConfig.findUnique({ where: { id: 1 } });
  if (!config) return;
  console.log('Keys of config:', Object.keys(config));
  console.log('colaboradores length:', Array.isArray(config.colaboradores) ? config.colaboradores.length : 'not array');
  if (Array.isArray(config.colaboradores)) {
    console.log('First Colaborador:', JSON.stringify(config.colaboradores[0], null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
