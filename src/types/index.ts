export type ShiftType = 'T1' | 'T2' | 'T3';

export type DayStatus = 'WORK' | 'OFF';

export interface ShiftDefinition {
  id: ShiftType;
  name: string;
  entrada: string;
  saida: string;
  permanencia: string;
  jornada: string;
  cor: string;
  observacao?: string;
}

export interface TeamConfig {
  id: string;
  name: string;         // e.g. "Time A", "Time Elite"
  colorKey: 'emerald' | 'amber' | 'indigo' | 'rose' | 'sky' | 'violet';
  shiftType: ShiftType;
  offPattern: 4 | 5 | 6; // 4=Sex/Sáb, 5=Sáb/Dom, 6=Dom/Seg
  memberCount: number;
}

export interface Colaborador {
  id: string;
  turno: ShiftType;
  escala: DayStatus[]; // Length will match the number of days (e.g. 28)
  team?: string; // Free string — dynamic team name
}

export interface CoverageDay {
  dia: string; // e.g. "01"
  t1: number;
  t2: number;
  t3: number;
  total: number;
  folgas: number;
  coberturaPct: number;
}

export interface WeeklyCoverage {
  semana: string; // e.g. "Semana 1"
  seg: number;
  ter: number;
  qua: number;
  qui: number;
  sex: number;
  sab: number;
  dom: number;
}

export interface DashboardIndicators {
  totalConferentes: number;
  coberturaMedia: number;
  menorCobertura: number;
  maiorCobertura: number;
  folgasNoMes: number;
  domingosTrabalhados: number;
  domingosDeFolga: number;
  diasCriticos: number;
  eficienciaEscala: number;
}

export interface ScheduleParams {
  conferentesT1: number;
  conferentesT2: number;
  conferentesT3: number;
  weeks: number; // e.g. 4
  dias: number;  // e.g. 28
  escala: '5x2';
  consecutiveOffDays: number; // 2
  maxConsecutiveSundays: number; // 3
  horasSemanais: 40 | 42 | 44;
  cenario: 'A' | 'B' | 'C' | 'D';
  setor: 'comercio' | 'supermercado';
  month?: number; // 0-11 (Jan-Dec)
  year?: number;
}
