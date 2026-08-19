export interface ShiftTimes {
  entrada: string;
  saida: string;
  permanencia: string;
  jornada: string;
}

export interface ScenarioDetails {
  t1: ShiftTimes;
  t2: ShiftTimes;
  t3: ShiftTimes;
  overlap1: string; // T1 -> T2
  overlap2: string; // T2 -> T3
  gap: string;      // T3 -> T1
}

export const SCENARIO_MATRIX: Record<number, Record<'A' | 'B' | 'C' | 'D' | 'E', ScenarioDetails>> = {
  40: {
    A: {
      t1: { entrada: '06:00', saida: '15:00', permanencia: '9h00', jornada: '8h00 + 1h intervalo' },
      t2: { entrada: '13:30', saida: '22:30', permanencia: '9h00', jornada: '8h00 + 1h intervalo' },
      t3: { entrada: '22:00', saida: '06:00', permanencia: '8h00', jornada: '7h00 + 1h intervalo' },
      overlap1: '1h30',
      overlap2: '30 min',
      gap: '0 min',
    },
    B: {
      t1: { entrada: '06:30', saida: '15:30', permanencia: '9h00', jornada: '8h00 + 1h intervalo' },
      t2: { entrada: '14:00', saida: '23:00', permanencia: '9h00', jornada: '8h00 + 1h intervalo' },
      t3: { entrada: '22:00', saida: '06:00', permanencia: '8h00', jornada: '7h00 + 1h intervalo' },
      overlap1: '1h30',
      overlap2: '1h00',
      gap: '30 min',
    },
    C: {
      t1: { entrada: '07:00', saida: '16:00', permanencia: '9h00', jornada: '8h00 + 1h intervalo' },
      t2: { entrada: '14:30', saida: '23:30', permanencia: '9h00', jornada: '8h00 + 1h intervalo' },
      t3: { entrada: '22:00', saida: '06:00', permanencia: '8h00', jornada: '7h00 + 1h intervalo' },
      overlap1: '1h30',
      overlap2: '1h30',
      gap: '1h00',
    },
    D: {
      t1: { entrada: '05:30', saida: '14:30', permanencia: '9h00', jornada: '8h00 + 1h intervalo' },
      t2: { entrada: '13:30', saida: '22:30', permanencia: '9h00', jornada: '8h00 + 1h intervalo' },
      t3: { entrada: '22:00', saida: '06:00', permanencia: '8h00', jornada: '7h00 + 1h intervalo' },
      overlap1: '1h00',
      overlap2: '30 min',
      gap: '30 min sob.',
    },
    E: {
      t1: { entrada: '07:00', saida: '16:00', permanencia: '9h00', jornada: '8h00 + 1h intervalo' },
      t2: { entrada: '15:00', saida: '00:00', permanencia: '9h00', jornada: '8h00 + 1h intervalo' },
      t3: { entrada: '23:00', saida: '07:00', permanencia: '8h00', jornada: '7h00 + 1h intervalo' },
      overlap1: '1h00',
      overlap2: '1h00',
      gap: '0 min',
    },
  },
  42: {
    A: {
      t1: { entrada: '06:00', saida: '15:24', permanencia: '9h24', jornada: '8h24 + 1h intervalo' },
      t2: { entrada: '13:30', saida: '22:54', permanencia: '9h24', jornada: '8h24 + 1h intervalo' },
      t3: { entrada: '22:00', saida: '06:24', permanencia: '8h24', jornada: '7h24 + 1h intervalo' },
      overlap1: '1h54',
      overlap2: '54 min',
      gap: '24 min sob.',
    },
    B: {
      t1: { entrada: '06:30', saida: '15:54', permanencia: '9h24', jornada: '8h24 + 1h intervalo' },
      t2: { entrada: '14:00', saida: '23:24', permanencia: '9h24', jornada: '8h24 + 1h intervalo' },
      t3: { entrada: '22:00', saida: '06:24', permanencia: '8h24', jornada: '7h24 + 1h intervalo' },
      overlap1: '1h54',
      overlap2: '1h24',
      gap: '6 min',
    },
    C: {
      t1: { entrada: '07:00', saida: '16:24', permanencia: '9h24', jornada: '8h24 + 1h intervalo' },
      t2: { entrada: '14:30', saida: '23:54', permanencia: '9h24', jornada: '8h24 + 1h intervalo' },
      t3: { entrada: '22:00', saida: '06:24', permanencia: '8h24', jornada: '7h24 + 1h intervalo' },
      overlap1: '1h54',
      overlap2: '1h54',
      gap: '36 min',
    },
    D: {
      t1: { entrada: '05:30', saida: '14:54', permanencia: '9h24', jornada: '8h24 + 1h intervalo' },
      t2: { entrada: '13:30', saida: '22:54', permanencia: '9h24', jornada: '8h24 + 1h intervalo' },
      t3: { entrada: '22:00', saida: '06:24', permanencia: '8h24', jornada: '7h24 + 1h intervalo' },
      overlap1: '1h24',
      overlap2: '54 min',
      gap: '54 min sob.',
    },
    E: {
      t1: { entrada: '07:00', saida: '16:24', permanencia: '9h24', jornada: '8h24 + 1h intervalo' },
      t2: { entrada: '15:00', saida: '00:24', permanencia: '9h24', jornada: '8h24 + 1h intervalo' },
      t3: { entrada: '23:00', saida: '07:24', permanencia: '8h24', jornada: '7h24 + 1h intervalo' },
      overlap1: '1h24',
      overlap2: '1h24',
      gap: '24 min sob.',
    },
  },
  44: {
    A: {
      t1: { entrada: '06:00', saida: '15:48', permanencia: '9h48', jornada: '8h48 + 1h intervalo' },
      t2: { entrada: '13:30', saida: '23:18', permanencia: '9h48', jornada: '8h48 + 1h intervalo' },
      t3: { entrada: '22:00', saida: '06:48', permanencia: '8h48', jornada: '7h48 + 1h intervalo' },
      overlap1: '2h18',
      overlap2: '1h18',
      gap: '48 min sob.',
    },
    B: {
      t1: { entrada: '06:30', saida: '16:18', permanencia: '9h48', jornada: '8h48 + 1h intervalo' },
      t2: { entrada: '14:00', saida: '23:48', permanencia: '9h48', jornada: '8h48 + 1h intervalo' },
      t3: { entrada: '22:00', saida: '06:48', permanencia: '8h48', jornada: '7h48 + 1h intervalo' },
      overlap1: '2h18',
      overlap2: '1h48',
      gap: '18 min sob.',
    },
    C: {
      t1: { entrada: '07:00', saida: '16:48', permanencia: '9h48', jornada: '8h48 + 1h intervalo' },
      t2: { entrada: '14:30', saida: '00:18', permanencia: '9h48', jornada: '8h48 + 1h intervalo' },
      t3: { entrada: '22:00', saida: '06:48', permanencia: '8h48', jornada: '7h48 + 1h intervalo' },
      overlap1: '2h18',
      overlap2: '2h18',
      gap: '12 min',
    },
    D: {
      t1: { entrada: '05:30', saida: '15:18', permanencia: '9h48', jornada: '8h48 + 1h intervalo' },
      t2: { entrada: '13:30', saida: '23:18', permanencia: '9h48', jornada: '8h48 + 1h intervalo' },
      t3: { entrada: '22:00', saida: '06:48', permanencia: '8h48', jornada: '7h48 + 1h intervalo' },
      overlap1: '1h48',
      overlap2: '1h18',
      gap: '1h18 sob.',
    },
    E: {
      t1: { entrada: '07:00', saida: '16:48', permanencia: '9h48', jornada: '8h48 + 1h intervalo' },
      t2: { entrada: '15:00', saida: '00:48', permanencia: '9h48', jornada: '8h48 + 1h intervalo' },
      t3: { entrada: '23:00', saida: '07:48', permanencia: '8h48', jornada: '7h48 + 1h intervalo' },
      overlap1: '1h48',
      overlap2: '1h48',
      gap: '48 min sob.',
    },
  },
};

export function getScenarioDetails(
  hours: number,
  scenario: 'A' | 'B' | 'C' | 'D' | 'E' | 'F',
  customT1?: string,
  customT2?: string,
  customT3?: string
): ScenarioDetails {
  const h = SCENARIO_MATRIX[hours] ? hours : 42;

  if (scenario === 'F') {
    const e1 = customT1 || '07:00';
    const e2 = customT2 || '15:00';
    const e3 = customT3 || '23:00';

    const timeToMins = (t: string): number => {
      const [hourStr, minStr] = t.split(':');
      return (Number(hourStr) || 0) * 60 + (Number(minStr) || 0);
    };

    const minsToTime = (m: number): string => {
      const hoursPart = Math.floor(m / 60) % 24;
      const minsPart = Math.floor(m % 60);
      return `${String(hoursPart).padStart(2, '0')}:${String(minsPart).padStart(2, '0')}`;
    };

    const getWorkHoursStr = (hoursVal: number): string => {
      const hrs = Math.floor(hoursVal);
      const mins = Math.round((hoursVal - hrs) * 60);
      return `${hrs}h${String(mins).padStart(2, '0')}`;
    };

    const formatOverlapOrGap = (minutes: number): string => {
      if (minutes <= 0) return '0 min';
      const hrs = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (hrs === 0) return `${mins} min`;
      if (mins === 0) return `${hrs}h00`;
      return `${hrs}h${String(mins).padStart(2, '0')}`;
    };

    // T1/T2: (hours / 5 + 1) * 60 minutes
    // T3: ((hours / 5 - 1) + 1) * 60 minutes
    const dur1 = Math.round((h / 5 + 1) * 60);
    const dur2 = Math.round((h / 5 + 1) * 60);
    const dur3 = Math.round((h / 5) * 60);

    const s1 = minsToTime(timeToMins(e1) + dur1);
    const s2 = minsToTime(timeToMins(e2) + dur2);
    const s3 = minsToTime(timeToMins(e3) + dur3);

    const T1_start = timeToMins(e1);
    const T1_end = T1_start + dur1;

    let T2_start = timeToMins(e2);
    if (T2_start < T1_start) {
      T2_start += 24 * 60;
    }
    const T2_end = T2_start + dur2;

    let T3_start = timeToMins(e3);
    while (T3_start < T2_start) {
      T3_start += 24 * 60;
    }
    const T3_end = T3_start + dur3;

    const T1_next_start = T1_start + 24 * 60;

    const overlap1_mins = Math.max(0, Math.min(T1_end, T2_end) - Math.max(T1_start, T2_start));
    const overlap2_mins = Math.max(0, Math.min(T2_end, T3_end) - Math.max(T2_start, T3_start));

    let gapStr = '';
    if (T3_end > T1_next_start) {
      const gap_val = T3_end - T1_next_start;
      gapStr = formatOverlapOrGap(gap_val) + ' sob.';
    } else {
      const gap_val = T1_next_start - T3_end;
      gapStr = formatOverlapOrGap(gap_val);
    }

    const t1WorkStr = getWorkHoursStr(h / 5);
    const t3WorkStr = getWorkHoursStr(h / 5 - 1);
    const t1PermStr = getWorkHoursStr(h / 5 + 1);
    const t3PermStr = getWorkHoursStr(h / 5);

    return {
      t1: { entrada: e1, saida: s1, permanencia: t1PermStr, jornada: `${t1WorkStr} + 1h intervalo` },
      t2: { entrada: e2, saida: s2, permanencia: t1PermStr, jornada: `${t1WorkStr} + 1h intervalo` },
      t3: { entrada: e3, saida: s3, permanencia: t3PermStr, jornada: `${t3WorkStr} + 1h intervalo` },
      overlap1: formatOverlapOrGap(overlap1_mins),
      overlap2: formatOverlapOrGap(overlap2_mins),
      gap: gapStr,
    };
  }

  return SCENARIO_MATRIX[h][scenario as 'A' | 'B' | 'C' | 'D' | 'E'];
}

