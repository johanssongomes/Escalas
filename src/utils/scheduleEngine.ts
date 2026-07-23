import type { Colaborador, ShiftType, DayStatus, ScheduleParams } from '../types';

// Define the 7 patterns of 5x2 (5 work days, 2 consecutive off days)
// 0 = Monday, 1 = Tuesday, 2 = Wednesday, 3 = Thursday, 4 = Friday, 5 = Saturday, 6 = Sunday
export interface Pattern {
  id: number;
  offDays: [number, number]; // The two consecutive off days
  name: string;
}

export const PATTERNS: Pattern[] = [
  { id: 0, offDays: [0, 1], name: 'Folga Seg-Ter' }, // Off Mon-Tue
  { id: 1, offDays: [1, 2], name: 'Folga Ter-Qua' }, // Off Tue-Wed
  { id: 2, offDays: [2, 3], name: 'Folga Qua-Qui' }, // Off Wed-Thu
  { id: 3, offDays: [3, 4], name: 'Folga Qui-Sex' }, // Off Thu-Fri
  { id: 4, offDays: [4, 5], name: 'Folga Sex-Sab' }, // Off Fri-Sat
  { id: 5, offDays: [5, 6], name: 'Folga Sab-Dom' }, // Off Sat-Sun
  { id: 6, offDays: [6, 0], name: 'Folga Dom-Seg' }, // Off Sun-Mon
];

// Helper to check if a day of week (0-6) is off for a pattern
export function isDayOff(patternId: number, dayOfWeek: number): boolean {
  const pattern = PATTERNS[patternId];
  return pattern.offDays.includes(dayOfWeek);
}



export function generateSchedule(params: ScheduleParams): Colaborador[] {
  const { conferentesT1, conferentesT2, conferentesT3 } = params;
  let dias = params.dias;

  const hasMonthYear = params.month !== undefined && params.year !== undefined;
  if (hasMonthYear) {
    dias = new Date(params.year!, params.month! + 1, 0).getDate();
  }

  const startDayOfWeek = hasMonthYear
    ? (new Date(params.year!, params.month!, 1).getDay() + 6) % 7
    : 0;

  const shifts: { type: ShiftType; count: number }[] = [
    { type: 'T1', count: conferentesT1 },
    { type: 'T2', count: conferentesT2 },
    { type: 'T3', count: conferentesT3 },
  ];

  const colaboradores: Colaborador[] = [];

  // Track daily coverage to balance the team. 
  // We represent daily coverage as an array of length `dias`.
  // To keep it balanced per shift, we balance each shift individually.
  for (const shift of shifts) {
    const shiftColabsCount = shift.count;
    if (shiftColabsCount <= 0) continue;

    // Daily work presence for this shift
    const dailyCoverage = Array(dias).fill(0);

    for (let i = 0; i < shiftColabsCount; i++) {
      const colabId = `${shift.type}-${String(i + 1).padStart(3, '0')}`;
      
      let bestSeq: number[];

      // All shifts (T1, T2, T3) now use the same deterministic 3-team weekend scheduling logic
      const mod = i % 3;
      if (mod === 0) {
        // Time A: Folga Sex-Sáb (touches Saturday). Alternate Sundays off to comply with CLT.
        const colabIdx = Math.floor(i / 3);
        const limit = params.setor === 'comercio' ? 2 : 3;
        if (limit === 2) {
          // Comercio: max 2 consecutive Sundays worked.
          // Alternating between [4, 5, 4, 5] and [5, 4, 5, 4]
          const options = [
            [4, 5, 4, 5],
            [5, 4, 5, 4]
          ];
          bestSeq = options[colabIdx % options.length];
        } else {
          // Supermercado: max 3 consecutive Sundays worked.
          // Alternating between [4, 5, 4, 4] and [4, 4, 5, 4]
          const options = [
            [4, 5, 4, 4],
            [4, 4, 5, 4]
          ];
          bestSeq = options[colabIdx % options.length];
        }
      } else if (mod === 1) {
        // Time B: Always Saturday/Sunday off (5)
        bestSeq = [5, 5, 5, 5];
      } else {
        // Time C: Always Sunday/Monday off (6)
        bestSeq = [6, 6, 6, 6];
      }

      // Commit the best sequence
      const escala: DayStatus[] = [];
      for (let d = 0; d < dias; d++) {
        const w = Math.floor(d / 7) % bestSeq.length;
        const dw = (startDayOfWeek + d) % 7;
        const patternId = bestSeq[w];
        const isOff = isDayOff(patternId, dw);
        
        if (!isOff) {
          dailyCoverage[d]++;
          escala.push('WORK');
        } else {
          escala.push('OFF');
        }
      }

      colaboradores.push({
        id: colabId,
        turno: shift.type,
        escala,
      });
    }
  }

  return colaboradores;
}
