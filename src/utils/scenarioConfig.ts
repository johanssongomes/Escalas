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

export const SCENARIO_MATRIX: Record<number, Record<'A' | 'B' | 'C' | 'D', ScenarioDetails>> = {
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
  },
  42: {
    A: {
      t1: { entrada: '06:00', saida: '15:24', permanencia: '9h24', jornada: '8h24 + 1h intervalo' },
      t2: { entrada: '13:30', saida: '22:54', permanencia: '9h24', jornada: '8h24 + 1h intervalo' },
      t3: { entrada: '22:00', saida: '06:24', permanencia: '8h24', jornada: '7h24 + 1h intervalo' },
      overlap1: '1h54',
      overlap2: '54 min',
      gap: '0 min',
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
  },
  44: {
    A: {
      t1: { entrada: '06:00', saida: '15:48', permanencia: '9h48', jornada: '8h48 + 1h intervalo' },
      t2: { entrada: '13:30', saida: '23:18', permanencia: '9h48', jornada: '8h48 + 1h intervalo' },
      t3: { entrada: '22:00', saida: '06:48', permanencia: '8h48', jornada: '7h48 + 1h intervalo' },
      overlap1: '2h18',
      overlap2: '1h18',
      gap: '0 min',
    },
    B: {
      t1: { entrada: '06:30', saida: '16:18', permanencia: '9h48', jornada: '8h48 + 1h intervalo' },
      t2: { entrada: '14:00', saida: '23:48', permanencia: '9h48', jornada: '8h48 + 1h intervalo' },
      t3: { entrada: '22:00', saida: '06:48', permanencia: '8h48', jornada: '7h48 + 1h intervalo' },
      overlap1: '2h18',
      overlap2: '1h48',
      gap: '0 min',
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
  },
};

export function getScenarioDetails(hours: number, scenario: 'A' | 'B' | 'C' | 'D'): ScenarioDetails {
  const h = SCENARIO_MATRIX[hours] ? hours : 42;
  return SCENARIO_MATRIX[h][scenario];
}
