import { prisma } from '../server/db.js';

async function main() {
  const config = await prisma.escalaConfig.findUnique({ where: { id: 1 } });
  console.log('EscalaConfig in database:');
  console.log(JSON.stringify(config, null, 2));
}

main().catch(console.error);
