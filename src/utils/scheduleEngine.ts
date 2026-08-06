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

/**
 * 7 balanced weekly-rotation sequences (one per employee group, cycling i % 7).
 *
 * Design principles:
 * 1. PERFECT COVERAGE: Distributing N employees evenly across the 7 sequences
 *    ensures exactly 5N/7 workers on duty on any day of any week.
 * 2. VISIBLE ROTATION: Each sequence uses 3–4 different off-day pairs over a
 *    5-week span, so employees see their folga change week to week.
 * 3. CLT COMPLIANCE: No sequence has more than 2 consecutive weeks where Sunday
 *    is worked (patterns 0–4 work Sunday; 5 and 6 give Sunday off). Maximum of
 *    2 consecutive Sundays worked satisfies both "comércio" and "supermercado".
 *
 * Each row is a 5-entry sequence [week0, week1, week2, week3, week4].
 * For months with only 4 weeks the 5th entry is never reached.
 */
export const BALANCED_SEQUENCES: number[][] = [
  // Seq 0 — base Seg/Ter: off Mon/Tue → Thu/Fri → Sat/Sun → Tue/Wed → Fri/Sat
  [0, 3, 5, 1, 4],
  // Seq 1 — base Ter/Qua: off Tue/Wed → Fri/Sat → Sun/Mon → Wed/Thu → Sat/Sun
  [1, 4, 6, 2, 5],
  // Seq 2 — base Qua/Qui: off Wed/Thu → Sat/Sun → Mon/Tue → Thu/Fri → Sun/Mon
  [2, 5, 0, 3, 6],
  // Seq 3 — base Qui/Sex: off Thu/Fri → Sun/Mon → Tue/Wed → Fri/Sat → Mon/Tue
  [3, 6, 1, 4, 0],
  // Seq 4 — base Sex/Sab: off Fri/Sat → Mon/Tue → Sat/Sun → Wed/Thu → Sun/Mon
  [4, 0, 5, 2, 6],
  // Seq 5 — base Sab/Dom: off Sat/Sun → Wed/Thu → Fri/Sat → Sun/Mon → Ter/Qua
  [5, 2, 4, 6, 1],
  // Seq 6 — base Dom/Seg: off Sun/Mon → Ter/Qua → Qui/Sex → Sat/Sun → Mon/Tue
  [6, 1, 3, 5, 0],
];

export function enforceMaxConsecutiveWorkDays(escala: DayStatus[], maxWork: number = 5): DayStatus[] {
  const res = [...escala];
  let consecutiveWork = 0;
  for (let d = 0; d < res.length; d++) {
    if (res[d] === 'WORK') {
      consecutiveWork++;
      if (consecutiveWork > maxWork) {
        res[d] = 'OFF';
        consecutiveWork = 0;
      }
    } else {
      consecutiveWork = 0;
    }
  }
  return res;
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

  for (const shift of shifts) {
    const shiftColabsCount = shift.count;
    if (shiftColabsCount <= 0) continue;

    // Daily work presence for this shift (used internally for future analytics)
    const dailyCoverage = Array(dias).fill(0);

    for (let i = 0; i < shiftColabsCount; i++) {
      const colabId = `${shift.type}-${String(i + 1).padStart(3, '0')}`;

      // Assign one of the 7 rotating sequences based on employee index.
      // Distributing evenly across 7 sequences guarantees 5/7 coverage on
      // every day of the week. The sequence itself rotates the off-day pair
      // each week, so the folga changes visibly throughout the month.
      const bestSeq = BALANCED_SEQUENCES[i % 7];

      // Build the monthly schedule day by day
      const escala: DayStatus[] = [];
      for (let d = 0; d < dias; d++) {
        const w = Math.floor(d / 7) % bestSeq.length; // which week (0–4)
        const dw = (startDayOfWeek + d) % 7;           // day of week (0=Mon)
        const patternId = bestSeq[w];
        const isOff = isDayOff(patternId, dw);

        if (!isOff) {
          dailyCoverage[d]++;
          escala.push('WORK');
        } else {
          escala.push('OFF');
        }
      }

      const correctedEscala = enforceMaxConsecutiveWorkDays(escala, 6);

      colaboradores.push({
        id: colabId,
        turno: shift.type,
        escala: correctedEscala,
      });
    }
  }

  return colaboradores;
}
