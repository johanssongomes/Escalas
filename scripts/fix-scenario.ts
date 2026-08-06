import { prisma } from '../server/db.js';

async function main() {
  const scenarios = await prisma.scenario.findMany();
  for (const s of scenarios) {
    let updatedName = s.name;
    if (updatedName.includes('5x1')) {
      updatedName = updatedName.replace('5x1', '5x2');
    }
    const params: any = s.params || {};
    if (params.escala === '5x1' || !params.escala) {
      params.escala = '5x2';
    }
    await prisma.scenario.update({
      where: { id: s.id },
      data: {
        name: updatedName,
        params,
      },
    });
    console.log(`Updated scenario ID ${s.id}: name -> "${updatedName}", params.escala -> "5x2"`);
  }
}

main().catch(console.error);
