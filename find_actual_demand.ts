import 'dotenv/config';
import { prisma } from './server/db.ts';

async function main() {
  const config = await prisma.escalaConfig.findUnique({ where: { id: 1 } });
  if (!config) return;

  console.log('Params:', JSON.stringify(config.params, null, 2));
  console.log('Prod rate m3:', config.prod_rate_m3);
  console.log('Prod unit:', config.prod_unit);

  const month = config.params?.month ?? 7; // August
  const year = config.params?.year ?? 2026;
  console.log(`Active month: ${month}, Active year: ${year}`);

  // Let's write a recursive function to find the demand array for a given shift in the nested structure
  function getDemandForShift(obj: any, shift: string): number[] | null {
    if (!obj || typeof obj !== 'object') return null;
    if (Array.isArray(obj[shift])) {
      // check if it has non-zero elements
      if (obj[shift].some((x: number) => x > 0)) {
        return obj[shift];
      }
    }
    for (const key of Object.keys(obj)) {
      const res = getDemandForShift(obj[key], shift);
      if (res) return res;
    }
    return null;
  }

  const shifts = ['T1', 'T2', 'T3'];
  const colaboradores = config.colaboradores as any[];
  const prodRate = config.prod_rate_m3 || 25;
  const diasCount = 31;

  for (const shift of shifts) {
    console.log(`\n================== ${shift} ==================`);
    const shiftColabs = colaboradores.filter(c => c.turno === shift);
    
    // Find demand array
    let demandArray = getDemandForShift(config.demanda_m3, shift);
    if (!demandArray) {
      console.log(`No demand array found for ${shift}. Using fallback zeros.`);
      demandArray = Array(diasCount).fill(0);
    } else {
      console.log(`Found demand array for ${shift} (length ${demandArray.length}):`, JSON.stringify(demandArray));
    }

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
