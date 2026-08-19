import type {
  CapacityResult,
  Colaborador,
  ColaboradorRestrictions,
  DayRange,
  DayStatus,
  DistribuicaoFolga,
  EquidadeResult,
  EquityRow,
  EscalaGerada,
  OperationConfig,
  ShiftCapacity,
  ShiftType,
  TeamConfig,
  TeamLetter,
} from '../types';
import { enforceMaxConsecutiveWorkDays } from './scheduleEngine';

// ─── Constantes da operação (padrão solicitado) ──────────────────────────────
// T3 = 16 → 450 m³ | T1 = 14 → 450 m³ | T2 = 10 → 150 m³ | prod 25 m³/dia
export const OPERATION_SHIFT_DEFAULT: Record<ShiftType, { memberCount: number; target: number }> = {
  T3: { memberCount: 16, target: 450 },
  T1: { memberCount: 14, target: 450 },
  T2: { memberCount: 10, target: 150 },
};

export const OPERATION_TEAM_SIZES_DEFAULT: Record<ShiftType, Record<TeamLetter, number>> = {
  T3: { A: 4, B: 4, C: 4, D: 4, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0 },
  T1: { A: 4, B: 4, C: 3, D: 3, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0 },
  T2: { A: 3, B: 3, C: 2, D: 2, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0 },
};

export const DEFAULT_OPERATION: OperationConfig = {
  prodRate: 25,
  unit: 'm3',
  sundayClosed: true,
  shifts: OPERATION_SHIFT_DEFAULT,
  teamSizes: OPERATION_TEAM_SIZES_DEFAULT,
};

export const TEAM_LETTERS: readonly TeamLetter[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

// Deslocamento por turno para evitar que os três turnos alinhem folgas no mesmo dia.
const SHIFT_BASE: Record<ShiftType, number> = { T1: 3, T2: 5, T3: 0 };
// Deslocamento por letra: as equipes de um mesmo turno ficam espaçadas sobre as 7 faixas.
const LETTER_BASE: Record<TeamLetter, number> = { A: 0, B: 2, C: 4, D: 6, E: 1, F: 3, G: 5, H: 0, I: 2, J: 4 };

export function teamBaseOffset(shift: ShiftType, letter: TeamLetter): number {
  return (SHIFT_BASE[shift] + LETTER_BASE[letter]) % 7;
}

/**
 * Cursor semanal global e determinístico (número da semana desde a era UNIX).
 * Garante continuidade do rodízio entre meses/anos → justiça ao longo do ano.
 */
export function getWeekCursor(year: number, month: number): number {
  return Math.floor(Date.UTC(year, month, 1) / 604800000);
}

export interface MonthInfo {
  dias: number;
  startDayOfWeek: number; // 0=Seg ... 6=Dom
  weekdays: number[];
  sabados: number;
  domingos: number;
  saturdayDays: number[];
  sundayDays: number[];
}

export function getMondaysInMonth(year: number, month: number): Date[] {
  if (year === undefined || month === undefined || isNaN(year) || isNaN(month) || month === -1) {
    return [];
  }
  const mondays: Date[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  if (isNaN(daysInMonth)) return [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    if (date.getDay() === 1) { // 1 is Monday
      mondays.push(date);
    }
  }
  return mondays;
}

export function getDayLabel(year: number, month: number, d: number): { dayStr: string; monthStr: string } {
  if (year === undefined || month === undefined || isNaN(year) || isNaN(month) || month === -1) {
    return { dayStr: String(d + 1).padStart(2, '0'), monthStr: '' };
  }
  const currentDate = new Date(year, month, d + 1);
  return {
    dayStr: String(currentDate.getDate()).padStart(2, '0'),
    monthStr: String(currentDate.getMonth() + 1).padStart(2, '0'),
  };
}

export function getMonthInfo(year: number, month: number): MonthInfo {
  if (year === undefined || month === undefined || isNaN(year) || isNaN(month) || month === -1) {
    const dias = 28;
    const startDayOfWeek = 0; // Monday
    const weekdays: number[] = [];
    const saturdayDays: number[] = [];
    const sundayDays: number[] = [];
    let sabados = 0;
    let domingos = 0;
    for (let d = 0; d < dias; d++) {
      const dw = (startDayOfWeek + d) % 7;
      weekdays.push(dw);
      if (dw === 5) { sabados++; saturdayDays.push(d); }
      if (dw === 6) { domingos++; sundayDays.push(d); }
    }
    return { dias, startDayOfWeek, weekdays, sabados, domingos, saturdayDays, sundayDays };
  }

  const dias = new Date(year, month + 1, 0).getDate();
  const startDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // 0=Seg ... 6=Dom
  const weekdays: number[] = [];
  const saturdayDays: number[] = [];
  const sundayDays: number[] = [];
  let sabados = 0;
  let domingos = 0;
  for (let d = 0; d < dias; d++) {
    const dw = (startDayOfWeek + d) % 7;
    weekdays.push(dw);
    if (dw === 5) { sabados++; saturdayDays.push(d); }
    if (dw === 6) { domingos++; sundayDays.push(d); }
  }
  return { dias, startDayOfWeek, weekdays, sabados, domingos, saturdayDays, sundayDays };
}

/** Deriva a letra (A–J) a partir do nome da equipe ("Equipe A" → "A"). */
export function letterFromName(name: string): TeamLetter {
  const m = /\b(A|B|C|D|E|F|G|H|I|J)\b/i.exec(name ?? '');
  return m ? (m[1].toUpperCase() as TeamLetter) : 'A';
}

export const TEAM_COLOR_BY_LETTER: Record<TeamLetter, TeamConfig['colorKey']> = {
  A: 'emerald',
  B: 'amber',
  C: 'indigo',
  D: 'rose',
  E: 'sky',
  F: 'violet',
  G: 'emerald',
  H: 'amber',
  I: 'indigo',
  J: 'rose',
};

/** Constrói a configuração canônica de equipes A/B/C/D a partir da operação. */
export function buildCanonicalTeams(operation: OperationConfig): TeamConfig[] {
  const teams: TeamConfig[] = [];
  for (const shift of ['T1', 'T2', 'T3'] as const) {
    for (const letter of TEAM_LETTERS) {
      const size = operation.teamSizes[shift]?.[letter] ?? 0;
      if (size > 0) {
        teams.push({
          id: `${shift}-${letter}`,
          name: `Equipe ${letter}`,
          colorKey: TEAM_COLOR_BY_LETTER[letter],
          shiftType: shift,
          offPattern: 5,
          memberCount: size,
        });
      }
    }
  }
  return teams;
}

export function isRestrictedOnDay(dayIdx: number, dw: number, rest?: ColaboradorRestrictions): boolean {
  if (!rest) return false;
  if (rest.noSaturdays && dw === 5) return true;
  if (rest.noSundays && dw === 6) return true;
  const ranges: DayRange[] = [...(rest.ferias ?? []), ...(rest.afastamentos ?? [])];
  return ranges.some(r => dayIdx >= r.from && dayIdx <= r.to);
}

export function applyRestrictionsToEscala(colab: Colaborador, month: number, year: number): DayStatus[] {
  const escala: DayStatus[] = [...colab.escala];
  if (!colab.restrictions) return escala;
  const { startDayOfWeek } = getMonthInfo(year, month);
  for (let d = 0; d < escala.length; d++) {
    const dw = (startDayOfWeek + d) % 7;
    if (isRestrictedOnDay(d, dw, colab.restrictions)) {
      escala[d] = 'OFF';
    }
  }
  return escala;
}

/**
 * Gera a escala 5x2 inteligente para um mês/ano:
 * - 5 dias de trabalho + 2 folgas consecutivas (escala rodiziada por semana);
 * - uma folga completa de fim de semana (Sáb+Dom) a cada ciclo de 7 semanas por equipe;
 * - roda mantida inclusive no domingo (Domingo fechado = demanda zerada, não a folga);
 * - rodízio contínuo via cursor global → justiça ao longo do ano;
 * - restrições individuais preservadas (não pode sáb./dom., férias, afastamentos).
 */
export const CYCLE_OFF_DAYS_A: readonly [number, number][] = [
  [6, 0], // Step 0: D/S (Dom/Seg)
  [3, 4], // Step 1: Q/S (Qui/Sex)
  [5, 6], // Step 2: S/D (Sáb/Dom)
  [1, 2], // Step 3: T/Q (Ter/Qua)
];

export const CYCLE_OFF_DAYS_B: readonly [number, number][] = [
  [6, 0], // Step 0: D/S (Dom/Seg)
  [5, 6], // Step 1: S/D (Sáb/Dom)
  [3, 4], // Step 2: Q/S (Qui/Sex)
  [1, 2], // Step 3: T/Q (Ter/Qua)
];

/**
 * Rotação C — Regra Osvaldo (Redução de Custo com Fretado/Alimentação)
 *
 * Convenção do calendário: o turno noturno é contabilizado pelo dia em que ele
 * está ativo na maior parte / aparece na grade (não pelo dia de entrada).
 *
 * Padrão FIXO por turno, toda semana:
 *   SÁBADO  → T1: WORK  | T2: OFF  | T3: WORK  (entrada sexta, turno conta como Sáb)
 *   DOMINGO → T1: OFF   | T2: WORK | T3: OFF   (T3 não trabalha Sáb→Dom)
 *
 * T3 (noite): entrada sexta = turno contado no Sábado; folga Domingo (Sáb→Dom off).
 * Dias Seg–Sex do T3 seguem a rotação A normal.
 */
export const OSVALDO_WEEKEND_RULE: Record<'T1' | 'T2' | 'T3', { sat: 'WORK' | 'OFF'; sun: 'WORK' | 'OFF' }> = {
  T1: { sat: 'WORK', sun: 'OFF'  }, // Trabalha Sáb manhã, folga Dom
  T2: { sat: 'OFF',  sun: 'WORK' }, // Folga Sáb tarde, trabalha Dom
  T3: { sat: 'WORK', sun: 'OFF'  }, // Entrada sexta = WORK no Sáb; não trabalha Sáb→Dom (Dom OFF)
};

/**
 * Pós-correção de fim de semana para Rotação C.
 * Sobrescreve sábado (dw=5) e domingo (dw=6) para todos os turnos.
 * Dias úteis (Seg–Sex) seguem a rotação A normal.
 */
export function applyOsvaldoWeekendRule(
  escala: DayStatus[],
  shift: ShiftType,
  weekdays: number[], // dw (0=Seg…6=Dom) para cada dia d do mês
): DayStatus[] {
  const rule = OSVALDO_WEEKEND_RULE[shift];
  return escala.map((status, d) => {
    const dw = weekdays[d];
    if (dw === 5) return rule.sat; // sábado
    if (dw === 6) return rule.sun; // domingo
    return status;                 // demais dias: rotação normal
  });
}

export function isCycleDayOff(step: number, dw: number, rotation: 'A' | 'B' | 'C' = 'A'): boolean {
  const normStep = ((step % 4) + 4) % 4;
  // Rotation C uses 'A' as weekday base — weekend overrides are applied by applyOsvaldoWeekendRule
  const cycle = rotation === 'B' ? CYCLE_OFF_DAYS_B : CYCLE_OFF_DAYS_A;
  const offDays = cycle[normStep];
  return offDays.includes(dw);
}

export function getOperationalWeekIndex(year: number, month: number, day: number): number {
  const dateUTC = Date.UTC(year, month, day);
  const baseUTC = Date.UTC(2025, 11, 29); // Monday 29/12/2025
  const diffDays = Math.floor((dateUTC - baseUTC) / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7);
}

/**
 * Gera a escala 5x2 inteligente para um mês/ano baseada no ciclo rotativo contínuo
 * de blocos operacionais de 7 dias iniciando em Quinta-feira (01/01/2026).
 * 
 * Regras:
 * 1. Equipes A, B, C e D em cada turno.
 * 2. Ciclo de 4 semanas de folgas: D/S (0) -> T/Q (1) -> Q/S (2) -> S/D (3).
 * 3. Sincronismo perfeito entre equipes na mesma semana.
 * 4. Equidade de 13 finais de semana S/D por ano.
 */
export function generateIntelligentScale(
  operation: OperationConfig,
  teams: TeamConfig[],
  colaboradores: Colaborador[],
  month: number,
  year: number,
  _demanda?: Partial<Record<ShiftType, number[]>>,
  maxConsecutiveWorkDays: number = 6,
  rotationSequence: 'A' | 'B' | 'C' = 'A',
): EscalaGerada {
  const targetTeams = teams && teams.length > 0 ? teams : buildCanonicalTeams(operation);
  const { dias, startDayOfWeek } = getMonthInfo(year, month);
  console.log("[DEBUG Engine] generateIntelligentScale:", maxConsecutiveWorkDays, rotationSequence);

  const result: Colaborador[] = [];

  for (const shift of ['T1', 'T2', 'T3'] as ShiftType[]) {
    const shiftColabs = colaboradores.filter(c => c.turno === shift);
    const shiftTeams = targetTeams
      .filter(t => t.shiftType === shift && t.memberCount > 0)
      .sort((a, b) => letterFromName(a.name).localeCompare(letterFromName(b.name)));

    if (shiftColabs.length === 0 || shiftTeams.length === 0) continue;

    const assigned: Record<string, Colaborador[]> = {};
    shiftTeams.forEach(t => { assigned[t.name] = []; });

    const existingNames = new Set(shiftTeams.map(t => t.name));
    const pool: Colaborador[] = [];

    shiftColabs.forEach(c => {
      if (c.team && existingNames.has(c.team)) {
        assigned[c.team].push(c);
      } else {
        pool.push(c);
      }
    });

    // 1. Libera excedentes de equipes superlotadas de volta para o pool primeiro
    for (const t of shiftTeams) {
      if (assigned[t.name].length > t.memberCount) {
        const excess = assigned[t.name].splice(t.memberCount);
        pool.push(...excess);
      }
    }

    // 2. Preenche as equipes desfalcadas usando o pool de colaboradores
    for (const t of shiftTeams) {
      const room = Math.max(0, t.memberCount - assigned[t.name].length);
      assigned[t.name].push(...pool.splice(0, room));
    }

    for (const t of shiftTeams) {
      const letter = letterFromName(t.name);
      const letterIdx = Math.max(0, TEAM_LETTERS.indexOf(letter));

      for (const m of assigned[t.name]) {
          let escala: DayStatus[];

          if (rotationSequence === 'C') {
            // Rotação C: gera base com Rotação A nos dias úteis.
            const monthWeekdays = getMonthInfo(year, month).weekdays;
            const baseEscala: DayStatus[] = [];
            for (let d = 0; d < dias; d++) {
              const currentDate = new Date(year, month, d + 1);
              const absoluteWeek = getOperationalWeekIndex(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
              const step = (letterIdx + absoluteWeek) % 4;
              const dw = (startDayOfWeek + d) % 7;
              baseEscala.push(isCycleDayOff(step, dw, 'A') ? 'OFF' : 'WORK');
            }

            if (shift === 'T2') {
              // T2 — Sábado: sempre OFF para redução de fretado/alimentação.
              // Domingo: rodízio rigorosamente alternado quinzenal (1x1) para garantir
              // conformidade trabalhista (DSR feminino e limite do comércio/supermercado).
              //
              // ATENÇÃO — prevenção de 4 folgas consecutivas:
              // Se o Domingo desta semana for OFF e a folga da semana útil cair no Step 1 (Qui+Sex),
              // teríamos Qui+Sex+Sáb(fixo)+Dom(rodízio) = 4 folgas consecutivas.
              // Para evitar isso sem forçar o Domingo para WORK (o que violaria a alternância do DSR),
              // nós mudamos a folga da semana útil do Step 1 (Qui/Sex) para o Step 3 (Ter/Qua).
              escala = [];
              for (let d = 0; d < dias; d++) {
                const currentDate = new Date(year, month, d + 1);
                const absoluteWeek = getOperationalWeekIndex(
                  currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()
                );
                const dw = monthWeekdays[d];

                if (dw === 5) {
                  // Sábado: sempre OFF para o T2
                  escala.push('OFF');
                } else if (dw === 6) {
                  // Domingo: rodízio alternado quinzenal
                  // letterIdx par (A=0, C=2…) ↔ absoluteWeek par → WORK (e vice-versa)
                  const isSundayWork = (letterIdx + absoluteWeek) % 2 === 0;
                  escala.push(isSundayWork ? 'WORK' : 'OFF');
                } else {
                  // Dias úteis (Seg a Sex): segue Rotação A
                  const isSundayOffThisWeek = (letterIdx + absoluteWeek) % 2 !== 0;
                  const step = (letterIdx + absoluteWeek) % 4;

                  // Se Domingo é folga e a folga cai em Qui/Sex (Step 1), redireciona folga para Ter/Qua (Step 3)
                  const resolvedStep = (isSundayOffThisWeek && step === 1) ? 3 : step;
                  const isOff = isCycleDayOff(resolvedStep, dw, 'A');
                  escala.push(isOff ? 'OFF' : 'WORK');
                }
              }
            } else {
              // T1 e T3: aplica regra fixa Osvaldo (Sáb/Dom fixos por turno)
              escala = applyOsvaldoWeekendRule(baseEscala, shift, monthWeekdays);
            }
          } else {
            escala = [];
            for (let d = 0; d < dias; d++) {
              const currentDate = new Date(year, month, d + 1);
              const absoluteWeek = getOperationalWeekIndex(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
              const step = (letterIdx + absoluteWeek) % 4;
              const dw = (startDayOfWeek + d) % 7;
              escala.push(isCycleDayOff(step, dw, rotationSequence) ? 'OFF' : 'WORK');
            }
          }
        const withEscala: Colaborador = { ...m, team: t.name, escala };
        const correctedEscala = enforceMaxConsecutiveWorkDays(withEscala.escala, maxConsecutiveWorkDays);
        result.push({
          ...withEscala,
          escala: applyRestrictionsToEscala({ ...withEscala, escala: correctedEscala }, month, year),
        });
      }
    }

    // Sobras sem equipe ficam WORK.
    pool.forEach(m => {
      result.push({ ...m, team: undefined, escala: Array(dias).fill('WORK' as DayStatus) });
    });
  }

  return { colaboradores: result, teams: targetTeams };
}

// ─── Distribuição das Folgas por equipe ───────────────────────────────────────

export interface DistributionOptions {
  includeSundaysWhenClosed?: boolean;
}

export function computeDistribution(
  colaboradores: Colaborador[],
  teams: TeamConfig[],
  month: number,
  year: number,
): DistribuicaoFolga[] {
  const { weekdays, dias } = getMonthInfo(year, month);
  const rows: DistribuicaoFolga[] = [];

  for (const team of teams) {
    const members = colaboradores.filter(c => c.turno === team.shiftType && c.team === team.name);
    if (members.length === 0) continue;

    let diasFolga = 0;
    let sabados = 0;
    let domingos = 0;
    let finsDeSemanaCompletos = 0;

    for (const m of members) {
      const escala = m.escala;
      for (let d = 0; d < dias; d++) {
        if (escala[d] === 'OFF') {
          diasFolga++;
          const dw = weekdays[d];
          if (dw === 5) sabados++;
          if (dw === 6) domingos++;
        }
      }
      for (let d = 0; d < dias; d++) {
        const dw = weekdays[d];
        if (dw !== 5) continue;
        const sunIdx = d + 1;
        if (sunIdx < dias && weekdays[sunIdx] === 6 && escala[d] === 'OFF' && escala[sunIdx] === 'OFF') {
          finsDeSemanaCompletos++;
        }
      }
    }

    const n = members.length;
    rows.push({
      teamId: team.id,
      teamName: team.name,
      shift: team.shiftType,
      letter: letterFromName(team.name),
      memberCount: n,
      diasFolga,
      mediaFolgaPorColab: Math.round((diasFolga / n) * 10) / 10,
      sabados,
      domingos,
      finsDeSemanaCompletos,
      mediaSabados: Math.round((sabados / n) * 10) / 10,
      mediaDomingos: Math.round((domingos / n) * 10) / 10,
      mediaFinals: Math.round((finsDeSemanaCompletos / n) * 10) / 10,
    });
  }

  return rows;
}

// ─── Equidade das equipes (percentual de equilíbrio) ─────────────────────────

export function computeEquity(
  colaboradores: Colaborador[],
  teams: TeamConfig[],
  month: number,
  year: number,
): EquidadeResult {
  const distRows = computeDistribution(colaboradores, teams, month, year);

  const byLetter = new Map<TeamLetter, { members: number; fins: number; sabados: number; domingos: number }>();
  TEAM_LETTERS.forEach(l => byLetter.set(l, { members: 0, fins: 0, sabados: 0, domingos: 0 }));

  distRows.forEach(r => {
    const acc = byLetter.get(r.letter)!;
    acc.members += r.memberCount;
    acc.fins += r.finsDeSemanaCompletos;
    acc.sabados += r.sabados;
    acc.domingos += r.domingos;
  });

  let totalFinals = 0;
  let totalMembers = 0;
  let maxFinalsPer = 0;
  let minFinalsPer = Infinity;
  const perRow: { letter: TeamLetter; members: number; finsPer: number }[] = [];

  for (const letter of TEAM_LETTERS) {
    const acc = byLetter.get(letter)!;
    totalFinals += acc.fins;
    totalMembers += acc.members;
    const finsPer = acc.members > 0 ? acc.fins / acc.members : 0;
    perRow.push({ letter, members: acc.members, finsPer });
    if (acc.members > 0) {
      maxFinalsPer = Math.max(maxFinalsPer, finsPer);
      minFinalsPer = Math.min(minFinalsPer, finsPer);
    }
  }

  const expected = totalMembers > 0 ? totalFinals / totalMembers : 0;
  const balanceGlobal = maxFinalsPer > 0 ? Math.max(0, 100 * (1 - (maxFinalsPer - minFinalsPer) / maxFinalsPer)) : 100;

  const rows: EquityRow[] = perRow.map(({ letter, members, finsPer }) => {
    const acc = byLetter.get(letter)!;
    const deviation = expected > 0 ? Math.abs(finsPer - expected) : 0;
    const pct = expected > 0 ? Math.max(0, Math.min(100, 100 * (1 - deviation / expected))) : 100;
    return {
      letter,
      label: `Equipe ${letter}`,
      members,
      finsDeSemanaCompletos: acc.fins,
      sabadosOff: acc.sabados,
      domingosOff: acc.domingos,
      mediaFinalsPorColab: Math.round(acc.members > 0 ? (acc.fins / acc.members) * 100 : 0) / 100,
      percentualEquilibrio: Math.round(pct),
      alert: members > 0 && deviation >= 0.75,
    };
  });

  const hasAlert = rows.some(r => r.alert) || balanceGlobal < 80;
  const alerts: string[] = [];
  if (hasAlert) {
    const high = rows.filter(r => r.finsDeSemanaCompletos > 0).sort((a, b) => b.mediaFinalsPorColab - a.mediaFinalsPorColab);
    const low = rows.filter(r => r.members > 0).sort((a, b) => a.mediaFinalsPorColab - b.mediaFinalsPorColab);
    if (high.length > 0 && expected > 0) {
      const top = high[0];
      if (top.mediaFinalsPorColab > expected * 1.5) {
        alerts.push(`${top.label} recebe proporcionalmente mais finais de semana completos que a média das equipes.`);
      }
    }
    if (low.length > 0 && expected > 0) {
      const bottom = low[low.length - 1];
      if (bottom.members > 0 && bottom.mediaFinalsPorColab < expected * 0.5) {
        alerts.push(`${bottom.label} recebe menos finais de semana completos que a média das equipes.`);
      }
    }
    if (alerts.length === 0) {
      alerts.push('Existe desequilíbrio na distribuição das folgas de fim de semana entre as equipes.');
    }
  }

  return { rows, balanceGlobal: Math.round(balanceGlobal), hasAlert, alerts };
}

// ─── Capacidade / Demanda ─────────────────────────────────────────────────────

export interface CapacityInput {
  colaboradores: Colaborador[];
  operation: OperationConfig;
  month: number;
  year: number;
  demanda?: Partial<Record<ShiftType, number[]>>;
}

export function computeCapacity(input: CapacityInput): CapacityResult {
  const { colaboradores, operation, month, year, demanda } = input;
  const { dias } = getMonthInfo(year, month);
  const operationalDays = operation.sundayClosed ? dias - getMonthInfo(year, month).domingos : dias;
  const shifts: ShiftCapacity[] = [];
  const prodOf = (c: Colaborador) => {
    if (c.prodRate !== undefined && c.prodRate !== null) {
      if (operation.unit === 'pcs' && c.prodRate <= 50) {
        return c.prodRate * 10;
      }
      if (operation.unit === 'm3' && c.prodRate > 50) {
        return c.prodRate / 10;
      }
      return c.prodRate;
    }
    return operation.prodRate;
  };

  for (const shift of ['T1', 'T2', 'T3'] as ShiftType[]) {
    const members = colaboradores.filter(c => c.turno === shift && c.team);
    const memberCount = operation.shifts[shift]?.memberCount ?? members.length;

    let diasTrabalhados = 0;
    let diasFolga = 0;
    let capacidadeDisponivel = 0;
    members.forEach(c => {
      let work = 0;
      c.escala.forEach(s => { if (s === 'WORK') work++; });
      diasTrabalhados += work;
      diasFolga += c.escala.length - work;
      capacidadeDisponivel += work * prodOf(c);
    });

    const avgRate = members.length > 0 ? members.reduce((a, c) => a + prodOf(c), 0) / members.length : operation.prodRate;
    const capacidadeTeorica = memberCount * avgRate * dias;

    const shiftDemand = demanda?.[shift] ?? [];
    const hasDemand = shiftDemand.length > 0 && shiftDemand.some(v => v > 0);
    let necessidade: number;
    if (hasDemand) {
      necessidade = shiftDemand.reduce((a, b) => a + b, 0);
      if (operation.sundayClosed) {
        const sunSum = getMonthInfo(year, month).sundayDays.reduce((acc, d) => acc + (shiftDemand[d] ?? 0), 0);
        necessidade -= sunSum;
      }
    } else {
      necessidade = operation.shifts[shift]?.target ?? 0;
      necessidade *= operationalDays;
    }

    const saldo = capacidadeDisponivel - necessidade;
    shifts.push({
      shift,
      memberCount,
      diasTrabalhados,
      diasFolga,
      capacidadeTeorica,
      capacidadeDisponivel,
      necessidade,
      saldo,
      excesso: Math.max(0, saldo),
      deficit: Math.max(0, -saldo),
      cobertura: necessidade > 0 ? Math.round((capacidadeDisponivel / necessidade) * 100) : 100,
    });
  }

  const totalCapacidade = shifts.reduce((a, s) => a + s.capacidadeDisponivel, 0);
  const totalNecessidade = shifts.reduce((a, s) => a + s.necessidade, 0);
  return {
    shifts,
    totalCapacidade,
    totalDisponivel: shifts.reduce((a, s) => a + s.capacidadeTeorica, 0),
    totalNecessidade,
    totalSaldo: shifts.reduce((a, s) => a + s.saldo, 0),
    totalExcesso: shifts.reduce((a, s) => a + s.excesso, 0),
    totalDeficit: shifts.reduce((a, s) => a + s.deficit, 0),
    coberturaGeral: totalNecessidade > 0 ? Math.round((totalCapacidade / totalNecessidade) * 100) : 100,
    capacidadeApósFolgas: totalCapacidade,
  };
}

export interface DailyOperationInput {
  colaboradores: Colaborador[];
  operation: OperationConfig;
  month: number;
  year: number;
  demanda?: Partial<Record<ShiftType, number[]>>;
}

export interface DailyOperation {
  demandaDia: number[];
  capacidadeDia: number[];
  saldoDia: number[];
  coberturaDia: number[];
  necessidade: number;
  coberturaGeral: number;
  diasOperacionais: number;
}

/** Linhas diárias para a grade "Demand. Geral" → capacidade/saldo/cobertura automáticos. */
export function computeDashboardOperation(input: DailyOperationInput): DailyOperation {
  const { colaboradores, operation, month, year, demanda } = input;
  const { dias } = getMonthInfo(year, month);
  const prodOf = (c: Colaborador) => {
    if (c.prodRate !== undefined && c.prodRate !== null) {
      if (operation.unit === 'pcs' && c.prodRate <= 50) {
        return c.prodRate * 10;
      }
      if (operation.unit === 'm3' && c.prodRate > 50) {
        return c.prodRate / 10;
      }
      return c.prodRate;
    }
    return operation.prodRate;
  };

  const demandaDia: number[] = Array(dias).fill(0);
  const capacidadeDia: number[] = Array(dias).fill(0);

  for (const shift of ['T1', 'T2', 'T3'] as ShiftType[]) {
    const shiftDemand = demanda?.[shift] ?? [];
    for (let d = 0; d < dias; d++) {
      demandaDia[d] += operation.sundayClosed && getMonthInfo(year, month).weekdays[d] === 6 ? 0 : (shiftDemand[d] ?? 0);
    }
  }

  for (const c of colaboradores) {
    if (!c.team) continue;
    for (let d = 0; d < c.escala.length && d < dias; d++) {
      if (c.escala[d] === 'WORK') capacidadeDia[d] += prodOf(c);
    }
  }

  const saldoDia = demandaDia.map((dem, d) => capacidadeDia[d] - dem);
  const coberturaDia = demandaDia.map((dem, d) => dem > 0 ? Math.round((capacidadeDia[d] / dem) * 100) : 100);
  const operationalDays = operation.sundayClosed ? dias - getMonthInfo(year, month).domingos : dias;
  const necessidade = demandaDia.reduce((a, b) => a + b, 0);
  const totalCap = capacidadeDia.reduce((a, b) => a + b, 0);

  return {
    demandaDia,
    capacidadeDia,
    saldoDia,
    coberturaDia,
    necessidade,
    coberturaGeral: necessidade > 0 ? Math.round((totalCap / necessidade) * 100) : 100,
    diasOperacionais: operationalDays,
  };
}
