import { prisma } from '../server/db.js';

async function main() {
  const config = await prisma.escalaConfig.findUnique({ where: { id: 1 } });
  if (config) {
    const params: any = config.params || {};
    params.escala = '5x2';
    await prisma.escalaConfig.update({
      where: { id: 1 },
      data: { params },
    });
    console.log('EscalaConfig updated: params.escala -> "5x2"');
  }
}

main().catch(console.error);
