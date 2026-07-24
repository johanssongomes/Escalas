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

export function calculateWeeklyCoverage(coverageDays: CoverageDay[], startDayOfWeek: number): WeeklyCoverage[] {
  const weeks: WeeklyCoverage[] = [];
  const totalDays = coverageDays.length;
  const totalCalendarWeeks = Math.ceil((startDayOfWeek + totalDays) / 7);

  for (let w = 0; w < totalCalendarWeeks; w++) {
    const getValForWeekday = (weekdayIdx: number) => {
      const dayIdx = w * 7 + weekdayIdx - startDayOfWeek;
      if (dayIdx >= 0 && dayIdx < totalDays) {
        return coverageDays[dayIdx].total;
      }
      return -1; // -1 indicates non-existent day in the calendar month
    };

    weeks.push({
      semana: `Semana ${w + 1}`,
      seg: getValForWeekday(0),
      ter: getValForWeekday(1),
      qua: getValForWeekday(2),
      qui: getValForWeekday(3),
      sex: getValForWeekday(4),
      sab: getValForWeekday(5),
      dom: getValForWeekday(6),
    });
  }

  return weeks;
}
