import type {
  Colaborador,
  ColaboradorRestrictions,
  DayStatus,
  ShiftType,
  TeamConfig,
} from '../types';
import { applyRestrictionsToEscala, getMonthInfo, letterFromName, teamBaseOffset } from './escala52Engine';
import { isDayOff } from './scheduleEngine';

export interface NewColaboradorInput {
  name: string;
  turno: ShiftType;
  prodRate?: number;
  restrictions?: ColaboradorRestrictions;
}

export function generateColaboradorId(existing: Colaborador[], turno: ShiftType): string {
  const nums = existing
    .filter(c => c.turno === turno)
    .map(c => {
      const m = /-(\d+)$/.exec(c.id);
      return m ? parseInt(m[1], 10) : 0;
    });
  const next = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
  return `${turno}-${String(next).padStart(3, '0')}`;
}

export function addColaborador(colaboradores: Colaborador[], input: NewColaboradorInput): Colaborador[] {
  const id = generateColaboradorId(colaboradores, input.turno);
  const colab: Colaborador = {
    id,
    turno: input.turno,
    name: input.name.trim() || undefined,
    prodRate: input.prodRate,
    restrictions: input.restrictions,
    escala: [],
  };
  return [...colaboradores, colab];
}

export function removeColaborador(colaboradores: Colaborador[], id: string): Colaborador[] {
  return colaboradores.filter(c => c.id !== id);
}

export function updateColaborador(
  colaboradores: Colaborador[],
  id: string,
  patch: Partial<Pick<Colaborador, 'name' | 'prodRate' | 'restrictions'>>,
): Colaborador[] {
  return colaboradores.map(c => (c.id === id ? { ...c, ...patch } : c));
}

export function teamSlotsRemaining(
  teams: TeamConfig[],
  turno: ShiftType,
  teamName: string,
  colaboradores: Colaborador[],
): number {
  const team = teams.find(t => t.shiftType === turno && t.name === teamName);
  if (!team) return 0;
  const used = colaboradores.filter(c => c.turno === turno && c.team === teamName).length;
  return Math.max(0, team.memberCount - used);
}

export function teamHasCapacity(
  teams: TeamConfig[],
  turno: ShiftType,
  teamName: string,
  colaboradores: Colaborador[],
): boolean {
  return teamSlotsRemaining(teams, turno, teamName, colaboradores) > 0;
}

/**
 * Reconstrói a escala mensal de um colaborador aplicando o rodízio 5x2 da equipe
 * à qual pertence (e suas restrições individuais). Usada ao mover entre equipes.
 */
export function regenerateColaboradorEscala(
  colab: Colaborador,
  month: number,
  year: number,
): DayStatus[] {
  const { dias, startDayOfWeek } = getMonthInfo(year, month);
  if (!colab.team) return Array(dias).fill('WORK' as DayStatus);

  const letter = letterFromName(colab.team);
  const base = teamBaseOffset(colab.turno, letter);
  const cursor = Math.floor(Date.UTC(year, month, 1) / 604800000);

  const escala: DayStatus[] = [];
  for (let d = 0; d < dias; d++) {
    const localWeek = Math.floor(d / 7);
    const dw = (startDayOfWeek + d) % 7;
    const patternId = (((base + cursor + localWeek) % 7) + 7) % 7;
    escala.push(isDayOff(patternId, dw) ? 'OFF' : 'WORK');
  }

  if (colab.restrictions) {
    return applyRestrictionsToEscala({ ...colab, escala }, month, year);
  }
  return escala;
}

/**
 * Move um colaborador entre equipes do mesmo turno (drag-and-drop).
 * A escala passa a seguir o rodízio da nova equipe.
 */
export function moveColaboradorBetweenTeams(
  colaboradores: Colaborador[],
  id: string,
  targetTeamName: string,
  month: number,
  year: number,
): Colaborador[] {
  return colaboradores.map(c => {
    if (c.id !== id) return c;
    const withTeam: Colaborador = { ...c, team: targetTeamName };
    return { ...withTeam, escala: regenerateColaboradorEscala(withTeam, month, year) };
  });
}

export function groupColaboradoresByTeam(colaboradores: Colaborador[], team: TeamConfig): Colaborador[] {
  return colaboradores
    .filter(c => c.turno === team.shiftType && c.team === team.name)
    .sort((a, b) => a.id.localeCompare(b.id));
}
