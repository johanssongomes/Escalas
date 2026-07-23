import type { Colaborador, CoverageDay, WeeklyCoverage } from '../types';

export function calculateDailyCoverage(colaboradores: Colaborador[], diasCount: number): CoverageDay[] {
  const coverageDays: CoverageDay[] = [];
  const totalEmployees = colaboradores.length;

  for (let d = 0; d < diasCount; d++) {
    let t1 = 0;
    let t2 = 0;
    let t3 = 0;

    colaboradores.forEach(colab => {
      const isWorking = colab.escala[d] === 'WORK';
      if (isWorking) {
        if (colab.turno === 'T1') t1++;
        else if (colab.turno === 'T2') t2++;
        else if (colab.turno === 'T3') t3++;
      }
    });

    const total = t1 + t2 + t3;
    const folgas = totalEmployees - total;
    const coberturaPct = totalEmployees > 0 ? Math.round((total / totalEmployees) * 100) : 0;

    coverageDays.push({
      dia: String(d + 1).padStart(2, '0'),
      t1,
      t2,
      t3,
      total,
      folgas,
      coberturaPct,
    });
  }

  return coverageDays;
}

export function calculateWeeklyCoverage(coverageDays: CoverageDay[]): WeeklyCoverage[] {
  const weeks: WeeklyCoverage[] = [];
  const numWeeks = Math.ceil(coverageDays.length / 7);

  for (let w = 0; w < numWeeks; w++) {
    const startIdx = w * 7;
    const getVal = (offset: number) => {
      const day = coverageDays[startIdx + offset];
      return day ? day.total : 0;
    };

    weeks.push({
      semana: `Semana ${w + 1}`,
      seg: getVal(0),
      ter: getVal(1),
      qua: getVal(2),
      qui: getVal(3),
      sex: getVal(4),
      sab: getVal(5),
      dom: getVal(6),
    });
  }

  return weeks;
}
