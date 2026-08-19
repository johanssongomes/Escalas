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
  offPattern: 4 | 5 | 6 | [number, number]; // 4=Sex/Sáb, 5=Sáb/Dom, 6=Dom/Seg or custom days
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

export interface DadosMes {
  demandaM3: { T1: number[]; T2: number[]; T3: number[] };
  demandaPcs: { T1: number[]; T2: number[]; T3: number[] };
  pmtM3: number[];
  pmtPcs: number[];
  teams?: TeamConfig[];
}

export type DadosMensais = Record<string, DadosMes>;

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
  cenario: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  customT1Entrada?: string;
  customT2Entrada?: string;
  customT3Entrada?: string;
  setor: 'comercio' | 'supermercado';
  month?: number; // 0-11 (Jan-Dec)
  year?: number;
  meses_data?: Record<string, Colaborador[]>; // all months' colaboradores for global sync
  operation?: OperationConfig; // Escala 5x2 WFM operation configuration
  maxConsecutiveWorkDays?: number;
  rotationSequence?: 'A' | 'B' | 'C';
}

// ─── Escala 5x2 / Workforce Management ─────────────────────────────────────────

export type TeamLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J';

/** A contiguous range of absolute day indices (0-based) within a month. */
export interface DayRange {
  from: number;
  to: number;
}

/** Individual constraints / restrictions a collaborator may carry. */
export interface ColaboradorRestrictions {
  noSaturdays?: boolean;
  noSundays?: boolean;
  ferias?: DayRange[];
  afastamentos?: DayRange[];
}

export interface Colaborador {
  id: string;
  turno: ShiftType;
  escala: DayStatus[]; // Length will match the number of days (e.g. 28)
  team?: string; // Free string — dynamic team name
  name?: string;
  prodRate?: number; // individual productivity override (default &lt; prodRate global)
  restrictions?: ColaboradorRestrictions;
}

export interface ShiftOperation {
  memberCount: number; // total collaborators allocated to the shift
  target: number;      // daily production target (meta) in the selected unit
}

/** Canonical Escala 5x2 operation configuration. */
export interface OperationConfig {
  prodRate: number;                                    // default productivity per collaborator/day (25 m³)
  unit: 'm3' | 'pcs';
  sundayClosed: boolean;                               // true → Domingo sem operação (demanda zerada)
  shifts: Record<ShiftType, ShiftOperation>;
  teamSizes: Record<ShiftType, Record<TeamLetter, number>>;
}

export interface DistribuicaoFolga {
  teamId: string;              // e.g. "T3-A"
  teamName: string;            // e.g. "Equipe A"
  shift: ShiftType;
  letter: TeamLetter;
  memberCount: number;
  diasFolga: number;           // total OFF across all members
  mediaFolgaPorColab: number;
  sabados: number;             // total Saturday OFF across all members
  domingos: number;            // total Sunday OFF across all members
  finsDeSemanaCompletos: number; // total full (Sat+Sun) weekend folgas across all members
  mediaSabados: number;
  mediaDomingos: number;
  mediaFinals: number;
}

export interface EquityRow {
  letter: TeamLetter;
  label: string;               // "Equipe A"
  members: number;
  finsDeSemanaCompletos: number;
  sabadosOff: number;
  domingosOff: number;
  mediaFinalsPorColab: number;
  percentualEquilibrio: number; // 0-100 balance index (higher = more balanced)
  alert: boolean;
}

export interface EquityResult {
  rows: EquityRow[];
  balanceGlobal: number;       // 0-100
  hasAlert: boolean;
  alerts: string[];
}

export type EquidadeResult = EquityResult;

export interface ShiftCapacity {
  shift: ShiftType;
  memberCount: number;
  diasTrabalhados: number;
  diasFolga: number;
  capacidadeTeorica: number;   // memberCount * prodRate * diasMes (sem folgas)
  capacidadeDisponivel: number; // after folgas (sum of each worker realised capacity)
  necessidade: number;         // meta * operational days (or demand sum when provided)
  saldo: number;
  excesso: number;
  deficit: number;
  cobertura: number;           // % capacidade / necessidade
}

export interface CapacityResult {
  shifts: ShiftCapacity[];
  totalCapacidade: number;
  totalDisponivel: number;
  totalNecessidade: number;
  totalSaldo: number;
  totalExcesso: number;
  totalDeficit: number;
  coberturaGeral: number;
  capacidadeApósFolgas: number;
}

export interface DashboardOperation {
  demandaDia: number[];        // daily combined demand
  capacidadeDia: number[];     // daily combined realised capacity
  saldoDia: number[];          // daily saldo
  necessidade: number;
  coberturaGeral: number;
}

export interface EscalaGerada {
  colaboradores: Colaborador[];
  teams: TeamConfig[];
}
