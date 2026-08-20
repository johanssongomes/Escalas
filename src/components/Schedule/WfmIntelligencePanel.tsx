import React, { useMemo, useState } from 'react';
import type {
  Colaborador, CapacityResult, DistribuicaoFolga, EquidadeResult,
  OperationConfig, ScheduleParams, TeamConfig,
} from '../../types';
import { OperationConfigPanel } from './OperationConfigPanel';
import { DistribuicaoFolgasCard } from './DistribuicaoFolgasCard';
import { EquidadeCard } from './EquidadeCard';
import { TeamPanel } from './TeamPanel';
import { CollaboratorWorkbench } from './CollaboratorWorkbench';
import {
  computeCapacity, computeDashboardOperation, computeDistribution, computeEquity,
  generateIntelligentScale, buildCanonicalTeams, letterFromName
} from '../../utils/escala52Engine';
import { BarChart3, Users, Activity, Gauge, Settings2 } from 'lucide-react';
import { teamColorOf } from '../../utils/teamColors';

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

interface WfmIntelligencePanelProps {
  operation: OperationConfig;
  onOperationChange: (op: OperationConfig) => void;
  colaboradores: Colaborador[];
  teams: TeamConfig[];
  params: ScheduleParams;
  demanda?: Partial<Record<'T1' | 'T2' | 'T3', number[]>>;
  onGerarEscala: (result: { colaboradores: Colaborador[]; teams: TeamConfig[] }) => void;
  onUpdateColaboradores: (colabs: Colaborador[]) => void;
}

export const WfmIntelligencePanel: React.FC<WfmIntelligencePanelProps> = ({
  operation, onOperationChange,
  colaboradores, teams, params, demanda,
  onGerarEscala, onUpdateColaboradores,
}) => {
  const month = params.month ?? new Date().getMonth();
  const year = params.year ?? new Date().getFullYear();
  const monthLabel = `${MONTH_NAMES[month]}/${year}`;

  const [activeTeam, setActiveTeam] = useState<TeamConfig | null>(null);
  const [showWorkbench, setShowWorkbench] = useState(false);

  const handleGerarEscala = () => {
    const result = generateIntelligentScale(operation, teams, colaboradores, month, year, demanda, params.maxConsecutiveWorkDays, params.rotationSequence);
    onGerarEscala(result);
  };

  const distribution: DistribuicaoFolga[] = useMemo(
    () => computeDistribution(colaboradores, teams, month, year),
    [colaboradores, teams, month, year],
  );

  const equity: EquidadeResult = useMemo(
    () => computeEquity(colaboradores, teams, month, year),
    [colaboradores, teams, month, year],
  );

  const annualEquity: EquidadeResult = useMemo(() => {
    const TEAM_LETTERS = ['A', 'B', 'C', 'D'] as const;
    const totals: Record<string, {
      finsDeSemanaCompletos: number;
      sabadosOff: number;
      domingosOff: number;
      members: number;
    }> = {
      A: { finsDeSemanaCompletos: 0, sabadosOff: 0, domingosOff: 0, members: 0 },
      B: { finsDeSemanaCompletos: 0, sabadosOff: 0, domingosOff: 0, members: 0 },
      C: { finsDeSemanaCompletos: 0, sabadosOff: 0, domingosOff: 0, members: 0 },
      D: { finsDeSemanaCompletos: 0, sabadosOff: 0, domingosOff: 0, members: 0 },
    };

    // Calculate members count for each team letter from the current active collaborators list
    colaboradores.forEach(c => {
      const letter = letterFromName(c.team);
      if (totals[letter]) {
        totals[letter].members++;
      }
    });

    for (let m = 0; m < 12; m++) {
      const generated = generateIntelligentScale(
        operation,
        teams,
        colaboradores,
        m,
        year,
        undefined,
        params.maxConsecutiveWorkDays,
        params.rotationSequence
      );
      const dist = computeDistribution(generated.colaboradores, generated.teams, m, year);
      dist.forEach(d => {
        const letter = letterFromName(d.teamName);
        if (totals[letter]) {
          totals[letter].finsDeSemanaCompletos += d.finsDeSemanaCompletos;
          totals[letter].sabadosOff += d.sabados;
          totals[letter].domingosOff += d.domingos;
        }
      });
    }

    const rows = TEAM_LETTERS.map(letter => {
      const tot = totals[letter];
      return {
        letter,
        label: `Equipe ${letter}`,
        members: tot.members,
        finsDeSemanaCompletos: tot.finsDeSemanaCompletos,
        sabadosOff: tot.sabadosOff,
        domingosOff: tot.domingosOff,
        mediaFinalsPorColab: tot.members > 0 ? Math.round((tot.finsDeSemanaCompletos / tot.members) * 100) / 100 : 0,
        percentualEquilibrio: 100,
        alert: false,
      };
    });

    let maxFinalsPer = 0;
    let minFinalsPer = Infinity;
    rows.forEach(r => {
      if (r.members > 0) {
        maxFinalsPer = Math.max(maxFinalsPer, r.mediaFinalsPorColab);
        minFinalsPer = Math.min(minFinalsPer, r.mediaFinalsPorColab);
      }
    });
    
    const balanceGlobal = maxFinalsPer > 0 ? Math.round(Math.max(0, 100 * (1 - (maxFinalsPer - minFinalsPer) / maxFinalsPer))) : 100;
    const totalFinals = rows.reduce((a, b) => a + b.finsDeSemanaCompletos, 0);
    const totalMembers = rows.reduce((a, b) => a + b.members, 0);
    const expected = totalMembers > 0 ? totalFinals / totalMembers : 0;

    rows.forEach(r => {
      const deviation = expected > 0 ? Math.abs(r.mediaFinalsPorColab - expected) : 0;
      r.percentualEquilibrio = expected > 0 ? Math.round(Math.max(0, Math.min(100, 100 * (1 - deviation / expected)))) : 100;
    });

    return {
      rows,
      balanceGlobal,
      hasAlert: false,
      alerts: [],
    };
  }, [operation, teams, colaboradores, year, params.maxConsecutiveWorkDays, params.rotationSequence]);

  const capacity: CapacityResult = useMemo(
    () => computeCapacity({ colaboradores, operation, month, year, demanda }),
    [colaboradores, operation, month, year, demanda],
  );

  const dashboardOp = useMemo(
    () => computeDashboardOperation({ colaboradores, operation, month, year, demanda }),
    [colaboradores, operation, month, year, demanda],
  );

  const groupedTeams = useMemo(() => {
    const map: Record<string, TeamConfig[]> = { T1: [], T2: [], T3: [] };
    teams.forEach(t => { if (map[t.shiftType]) map[t.shiftType].push(t); });
    return map;
  }, [teams]);

  return (
    <section className="mb-6 space-y-4">


      {/* 2. Daily capacity & surplus chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        {/* Coverage percentages */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Cobertura Diária (% Demanda Atendida)</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {dashboardOp.coberturaDia.map((c, d) => {
              const color = c >= 100 
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                : c >= 80 
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' 
                  : 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
              return (
                <span key={d} className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded border ${color}`} title={`Dia ${d + 1}: cobertura ${c.toFixed(0)}%`}>
                  D{d + 1}: {c.toFixed(0)}%
                </span>
              );
            })}
          </div>
        </div>

        {/* Daily capacity & surplus values */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Capacidade Diária Gerada ({operation.unit === 'm3' ? 'm³' : 'Pçs'})</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {dashboardOp.capacidadeDia.map((cap, d) => {
              return (
                <span key={d} className="text-[8.5px] font-bold px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-905 text-slate-600 dark:text-slate-400" title={`Dia ${d + 1}: capacidade ${Math.round(cap)}`}>
                  D{d + 1}: {Math.round(cap)}
                </span>
              );
            })}
          </div>
        </div>

        {/* Daily balance */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Saldo Diário (Capac. − Demanda)</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {dashboardOp.saldoDia.map((s, d) => {
              const pos = s >= 0;
              const color = pos ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
              return (
                <span key={d} className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded border ${color}`} title={`Dia ${d + 1}: saldo ${Math.round(s)}`}>
                  D{d + 1}: {s >= 0 ? '+' : ''}{Math.round(s)}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Distribution + Equity cards */}
      <div className="grid grid-cols-1 gap-4">
        <DistribuicaoFolgasCard rows={distribution} monthLabel={monthLabel} />
        <EquidadeCard data={equity} annualData={annualEquity} monthLabel={monthLabel} yearLabel={String(year)} />
      </div>
    </section>
  );
};