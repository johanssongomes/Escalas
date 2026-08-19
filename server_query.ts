import 'dotenv/config';
import { prisma } from './server/db.ts';

async function main() {
  const config = await prisma.escalaConfig.findUnique({ where: { id: 1 } });
  if (!config) {
    console.log('No config found.');
    return;
  }
  console.log('Colaboradores:', JSON.stringify(config.colaboradores, null, 2));
  console.log('Prod Rate m3:', config.prod_rate_m3);
  console.log('Prod Rate pcs:', config.prod_rate_pcs);
  console.log('Prod Unit:', config.prod_unit);
  console.log('Demanda m3:', JSON.stringify(config.demanda_m3, null, 2));
  console.log('Demanda pcs:', JSON.stringify(config.demanda_pcs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
