import 'dotenv/config';
import { prisma } from './server/db.ts';

async function main() {
  const config = await prisma.escalaConfig.findUnique({ where: { id: 1 } });
  if (!config) return;

  const colaboradores = config.colaboradores as any[];
  const demanda_m3 = config.demanda_m3 as any;
  const prodRate = config.prod_rate_m3 || 25; // 25 m3 per person
  const diasCount = 31;

  const shifts = ['T1', 'T2', 'T3'];

  console.log(`Unidade de Produção: ${config.prod_unit}`);
  console.log(`Taxa de Produtividade: ${prodRate} por pessoa`);

  for (const shift of shifts) {
    console.log(`\n================== ${shift} ==================`);
    const shiftColabs = colaboradores.filter(c => c.turno === shift);
    console.log(`Total de Colaboradores cadastrados no turno: ${shiftColabs.length}`);
    
    let maxDeficitM3 = 0;
    let deficitDays = 0;
    let totalDemand = 0;
    let totalCap = 0;
    let sumDeficits = 0;

    for (let d = 0; d < diasCount; d++) {
      const activeCount = shiftColabs.filter(c => c.escala[d] === 'WORK').length;
      const cap = activeCount * prodRate;
      const demand = (demanda_m3[shift] && demanda_m3[shift][d]) || 0;
      const diff = cap - demand;

      totalDemand += demand;
      totalCap += cap;

      if (diff < 0) {
        deficitDays++;
        const deficitVal = Math.abs(diff);
        sumDeficits += deficitVal;
        if (deficitVal > maxDeficitM3) {
          maxDeficitM3 = deficitVal;
        }
      }
    }

    console.log(`Demanda Total do Mês: ${totalDemand} m³`);
    console.log(`Capacidade Total do Mês: ${totalCap} m³`);
    console.log(`Saldo Geral: ${totalCap - totalDemand} m³`);
    console.log(`Dias com déficit de capacidade: ${deficitDays} de ${diasCount}`);
    console.log(`Déficit Diário Máximo: ${maxDeficitM3} m³`);
    console.log(`Pessoas adicionais necessárias no pico de déficit: ${maxDeficitM3 / prodRate} pessoas`);
    console.log(`Média do déficit nos dias com falta: ${(sumDeficits / deficitDays / prodRate).toFixed(2)} pessoas`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
