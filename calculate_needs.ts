import 'dotenv/config';
import { prisma } from './server/db.ts';

async function main() {
  const config = await prisma.escalaConfig.findUnique({ where: { id: 1 } });
  if (!config) return;

  const colaboradores = config.colaboradores as any[];
  const demanda_m3 = config.demanda_m3 as any;
  const prodRate = 25; // 25 m3 per person per day
  const diasCount = 31;

  const shifts = ['T1', 'T2', 'T3'];

  for (const shift of shifts) {
    console.log(`\n================== ${shift} ==================`);
    const shiftColabs = colaboradores.filter(c => c.turno === shift);
    
    // We want to see on each day: active capacity vs demand
    let maxDeficitM3 = 0;
    let deficitDays = 0;
    let totalDemand = 0;
    let totalCap = 0;

    for (let d = 0; d < diasCount; d++) {
      const activeColabs = shiftColabs.filter(c => c.escala[d] === 'WORK');
      const activeMembers = activeColabs.reduce((acc, c) => acc + c.prodRate, 0); // prodRate here is the memberCount!
      const cap = activeMembers * prodRate;
      const demand = (demanda_m3[shift] && demanda_m3[shift][d]) || 0;
      const diff = cap - demand;
      
      totalDemand += demand;
      totalCap += cap;

      if (diff < 0) {
        deficitDays++;
        const deficitVal = Math.abs(diff);
        if (deficitVal > maxDeficitM3) {
          maxDeficitM3 = deficitVal;
        }
      }
    }
    
    const missingMembersPeak = Math.ceil(maxDeficitM3 / prodRate);
    const totalDeficitM3 = totalDemand - totalCap;
    console.log(`Total Demand: ${totalDemand} m3`);
    console.log(`Total Capacity: ${totalCap} m3`);
    console.log(`Overall Net Balance: ${totalCap - totalDemand} m3`);
    console.log(`Days with deficit: ${deficitDays} out of ${diasCount}`);
    console.log(`Maximum daily capacity deficit: ${maxDeficitM3} m3`);
    console.log(`Max daily headcount shortage (Peak Deficit): ${maxDeficitM3 / prodRate} people (i.e. ${missingMembersPeak} person/people needed at peak)`);
    
    // Let's also print the daily situation for each shift
    console.log("Daily details (Day: ActiveMembers -> Cap vs Demand -> Balance):");
    const dailyDetails = [];
    for (let d = 0; d < diasCount; d++) {
      const activeColabs = shiftColabs.filter(c => c.escala[d] === 'WORK');
      const activeMembers = activeColabs.reduce((acc, c) => acc + c.prodRate, 0);
      const cap = activeMembers * prodRate;
      const demand = (demanda_m3[shift] && demanda_m3[shift][d]) || 0;
      const diff = cap - demand;
      dailyDetails.push(`Day ${d+1}: ${activeMembers} active (${cap} m3) vs Demand ${demand} m3 -> Bal: ${diff >= 0 ? '+' + diff : diff}`);
    }
    console.log(dailyDetails.slice(0, 5).join(' | ') + ' ...');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
