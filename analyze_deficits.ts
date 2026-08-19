import 'dotenv/config';
import { prisma } from './server/db.ts';

async function main() {
  const config = await prisma.escalaConfig.findUnique({ where: { id: 1 } });
  if (!config) return;

  const colaboradores = config.colaboradores as any[];
  const demanda_m3 = config.demanda_m3 as any;
  const prodRate = 25;
  const diasCount = 31;

  const shifts = ['T1', 'T2', 'T3'];

  for (const shift of shifts) {
    console.log(`\n=== SHIFT ${shift} ===`);
    const shiftColabs = colaboradores.filter(c => c.turno === shift);
    console.log('Employees in shift:', shiftColabs.map(c => `${c.nome} (rate: ${c.prodRate})`).join(', '));
    
    let totalDeficitDays = 0;
    let maxDeficit = 0;
    let sumDeficit = 0;

    for (let d = 0; d < diasCount; d++) {
      const activeColabs = shiftColabs.filter(c => c.escala[d] === 'WORK');
      const activeWeight = activeColabs.reduce((acc, c) => acc + c.prodRate, 0);
      const cap = activeWeight * prodRate;
      const demand = (demanda_m3[shift] && demanda_m3[shift][d]) || 0;
      const diff = cap - demand;
      if (diff < 0) {
        totalDeficitDays++;
        sumDeficit += Math.abs(diff);
        if (Math.abs(diff) > maxDeficit) {
          maxDeficit = Math.abs(diff);
        }
      }
    }
    console.log(`Days with deficit: ${totalDeficitDays}`);
    console.log(`Max deficit: ${maxDeficit} m3 (needs ${maxDeficit / prodRate} productivity units, i.e. headcount units)`);
    console.log(`Average deficit on deficit days: ${(sumDeficit / totalDeficitDays).toFixed(2)} m3`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
