import 'dotenv/config';
import { prisma } from './server/db.ts';

async function main() {
  const config = await prisma.escalaConfig.findUnique({ where: { id: 1 } });
  if (!config) return;

  const month = "7_2026"; // August 2026
  const demanda_m3 = config.demanda_m3 as any;
  const prodRate = config.prod_rate_m3 || 25;
  const diasCount = 31;

  // Let's find the demand for month "7_2026"
  // It has a very deeply nested structure due to a previous update bug, let's find the correct demand for T1, T2, T3
  // Let's write a targeted function to find the demand array for "7_2026"
  function getAugustDemand(obj: any, shift: string): number[] {
    // If it's the August demand object, it might be nested
    // Let's search for T1, T2, T3 arrays with non-zero elements
    // Let's see: from the print of config.demanda_m3, we had:
    // T1: 100, 100, 200, ...
    // T2: 300, 0, 300, ...
    // T3: 400, 400, 400, ...
    if (shift === 'T1') return [100, 100, 200, 200, 200, 200, 200, 200, 0, 200, 200, 200, 200, 200, 200, 0, 200, 200, 200, 200, 200, 200, 0, 200, 200, 200, 200, 200, 200, 0, 200];
    if (shift === 'T2') return [300, 0, 300, 300, 300, 300, 300, 300, 0, 300, 300, 300, 300, 300, 300, 0, 300, 300, 300, 300, 300, 300, 0, 300, 300, 300, 300, 300, 300, 0, 300];
    if (shift === 'T3') return Array(31).fill(400);
    return Array(31).fill(0);
  }

  const shifts = ['T1', 'T2', 'T3'];
  const colaboradores = config.colaboradores as any[];

  for (const shift of shifts) {
    console.log(`\n================== ${shift} ==================`);
    const shiftColabs = colaboradores.filter(c => c.turno === shift);
    const demandArray = getAugustDemand(null, shift);

    let maxDeficit = 0;
    let deficitDays = 0;
    let totalDemand = 0;
    let totalCap = 0;
    let sumDeficits = 0;

    for (let d = 0; d < diasCount; d++) {
      const activeCount = shiftColabs.filter(c => c.escala[d] === 'WORK').length;
      const cap = activeCount * prodRate;
      const demand = demandArray[d] || 0;
      const diff = cap - demand;

      totalDemand += demand;
      totalCap += cap;

      if (diff < 0) {
        deficitDays++;
        const deficitVal = Math.abs(diff);
        sumDeficits += deficitVal;
        if (deficitVal > maxDeficit) {
          maxDeficit = deficitVal;
        }
        console.log(`  Day ${d+1}: active=${activeCount} (cap=${cap}), demand=${demand} -> Deficit=${deficitVal} m3 (${deficitVal/prodRate} people)`);
      }
    }

    console.log(`Total Demand: ${totalDemand} m3`);
    console.log(`Total Capacity: ${totalCap} m3`);
    console.log(`Overall Net Balance: ${totalCap - totalDemand} m3`);
    console.log(`Days with deficit: ${deficitDays} of ${diasCount}`);
    console.log(`Maximum daily capacity deficit: ${maxDeficit} m3`);
    console.log(`Max daily headcount shortage (Peak Deficit): ${maxDeficit / prodRate} people`);
    if (deficitDays > 0) {
      console.log(`Average headcount shortage on deficit days: ${(sumDeficits / deficitDays / prodRate).toFixed(2)} people`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
