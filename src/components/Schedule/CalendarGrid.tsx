import React, { useState, useMemo } from 'react';
import type { Colaborador, ScheduleParams, TeamConfig } from '../../types';
import { Calendar, User, Filter, Layers, ChevronDown, ChevronRight, ChevronsUpDown, Settings2, Calculator, CheckCircle2, TrendingDown } from 'lucide-react';
import { TeamManagerModal } from './TeamManagerModal';

interface CalendarGridProps {
  colaboradores: Colaborador[];
  diasCount: number;
  plain?: boolean;
  month?: number;
  year?: number;
  onUpdateColaboradores?: (colabs: Colaborador[]) => void;
  isManualMode?: boolean;
  onToggleManualMode?: (val: boolean) => void;
  params?: ScheduleParams;
  teams?: TeamConfig[];
  onUpdateTeams?: (teams: TeamConfig[]) => void;
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Color mapping for dynamic TeamConfig
const TEAM_COLOR_MAP: Record<TeamConfig['colorKey'] | 'gray', { badge: string; bg: string; text: string; border: string }> = {
  emerald: { badge: 'bg-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  amber:   { badge: 'bg-amber-500',   bg: 'bg-amber-100 dark:bg-amber-950/40',   text: 'text-amber-800 dark:text-amber-300',   border: 'border-amber-200 dark:border-amber-800' },
  indigo:  { badge: 'bg-indigo-600',  bg: 'bg-indigo-100 dark:bg-indigo-950/40',  text: 'text-indigo-800 dark:text-indigo-300',  border: 'border-indigo-200 dark:border-indigo-800' },
  rose:    { badge: 'bg-rose-500',    bg: 'bg-rose-100 dark:bg-rose-950/40',    text: 'text-rose-800 dark:text-rose-300',    border: 'border-rose-200 dark:border-rose-800' },
  sky:     { badge: 'bg-sky-500',     bg: 'bg-sky-100 dark:bg-sky-950/40',     text: 'text-sky-800 dark:text-sky-300',     border: 'border-sky-200 dark:border-sky-800' },
  violet:  { badge: 'bg-violet-500',  bg: 'bg-violet-100 dark:bg-violet-950/40',  text: 'text-violet-800 dark:text-violet-300',  border: 'border-violet-200 dark:border-violet-800' },
  gray:    { badge: 'bg-slate-500',   bg: 'bg-slate-100 dark:bg-slate-800/60',   text: 'text-slate-600 dark:text-slate-400',   border: 'border-slate-200 dark:border-slate-700' },
};

// Find team config for a collaborator; when no team, returns neutral "Sem Equipe"
const getTeamInfo = (colab: Colaborador, teams: TeamConfig[]): { name: string; colorKey: TeamConfig['colorKey'] | 'gray'; desc: string } => {
  if (colab.team) {
    const found = teams.find(t => t.name === colab.team && t.shiftType === colab.turno);
    if (found) {
      return { name: found.name, colorKey: found.colorKey, desc: `Folga padrão ${found.offPattern === 4 ? 'Sex/Sáb' : found.offPattern === 5 ? 'Sáb/Dom' : 'Dom/Seg'}` };
    }
  }
  return { name: 'Sem Equipe', colorKey: 'gray', desc: 'Área de Espera (Escala Inativa / Folga)' };
};

export const CalendarGrid: React.FC<CalendarGridProps> = ({ 
  colaboradores, 
  diasCount, 
  plain = false,
  month,
  year,
  onUpdateColaboradores,
  isManualMode = false,
  onToggleManualMode,
  params,
  teams = [],
  onUpdateTeams,
}) => {
  const startDayOfWeek = (month !== undefined && year !== undefined)
    ? (new Date(year, month, 1).getDay() + 6) % 7
    : 0;

  const [selectedShifts, setSelectedShifts] = useState<string[]>(['T1', 'T2', 'T3']);
  // State holds view mode: 'grouped' (split by shift-teams) or 'consolidated' (flat list per shift)
  const [viewMode, setViewMode] = useState<'grouped' | 'consolidated'>('grouped');
  // State holds array of collapsed group keys
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  // State holds array of collapsed summary panel keys (T1, T2, T3, CONSOLIDADO)
  const [collapsedSummaryPanels, setCollapsedSummaryPanels] = useState<string[]>([]);

  const toggleSummaryPanel = (key: string) => {
    if (collapsedSummaryPanels.includes(key)) {
      setCollapsedSummaryPanels(collapsedSummaryPanels.filter(p => p !== key));
    } else {
      setCollapsedSummaryPanels([...collapsedSummaryPanels, key]);
    }
  };

  // Productivity rate (m³ or Pçs per collaborator per day)
  const [prodRateM3, setProdRateM3] = useState<number>(25);
  const [prodRatePcs, setProdRatePcs] = useState<number>(250);
  const [prodUnit, setProdUnit] = useState<'m3' | 'pcs'>('m3');
  const prodRate = prodUnit === 'm3' ? prodRateM3 : prodRatePcs;
  // Team manager modal
  const [showTeamManager, setShowTeamManager] = useState(false);
  // Daily demand store per shift (indexed T1, T2, T3) for m3
  const [demandaDiariaM3, setDemandaDiariaM3] = useState<{ [key: string]: number[] }>(() => {
    const saved = localStorage.getItem('demandaDiaria_m3') || localStorage.getItem('demandaDiaria');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        ['T1', 'T2', 'T3'].forEach(s => {
          if (!Array.isArray(parsed[s]) || parsed[s].length !== 28) {
            parsed[s] = Array(28).fill(0);
          }
        });
        return parsed;
      } catch (e) {}
    }
    return {
      T1: Array(28).fill(0),
      T2: Array(28).fill(0),
      T3: Array(28).fill(0)
    };
  });

  // Daily demand store per shift (indexed T1, T2, T3) for pcs
  const [demandaDiariaPcs, setDemandaDiariaPcs] = useState<{ [key: string]: number[] }>(() => {
    const saved = localStorage.getItem('demandaDiaria_pcs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        ['T1', 'T2', 'T3'].forEach(s => {
          if (!Array.isArray(parsed[s]) || parsed[s].length !== 28) {
            parsed[s] = Array(28).fill(0);
          }
        });
        return parsed;
      } catch (e) {}
    }
    return {
      T1: Array(28).fill(0),
      T2: Array(28).fill(0),
      T3: Array(28).fill(0)
    };
  });

  const demandaDiaria = prodUnit === 'm3' ? demandaDiariaM3 : demandaDiariaPcs;

  const capacityStats = useMemo(() => {
    const baseT1 = selectedShifts.includes('T1') ? (params?.conferentesT1 ?? 0) : 0;
    const baseT2 = selectedShifts.includes('T2') ? (params?.conferentesT2 ?? 0) : 0;
    const baseT3 = selectedShifts.includes('T3') ? (params?.conferentesT3 ?? 0) : 0;
    const baseHC = baseT1 + baseT2 + baseT3;
    
    const capacidadeTeorica = baseHC * prodRate * diasCount;

    let totalWorkDays = 0;
    colaboradores.forEach(c => {
      if (selectedShifts.includes(c.turno)) {
        c.escala.forEach(status => {
          if (status === 'WORK') {
            totalWorkDays++;
          }
        });
      }
    });
    const capacidadeReal = totalWorkDays * prodRate;

    const perdaCapacidade = capacidadeTeorica > 0 
      ? ((capacidadeReal - capacidadeTeorica) / capacidadeTeorica) * 100 
      : 0;

    return {
      capacidadeTeorica,
      capacidadeReal,
      perdaCapacidade: Math.round(perdaCapacidade * 10) / 10
    };
  }, [colaboradores, params, prodRate, diasCount, selectedShifts]);


  const toggleShift = (shift: string) => {
    if (selectedShifts.includes(shift)) {
      setSelectedShifts(selectedShifts.filter((s) => s !== shift));
    } else {
      setSelectedShifts([...selectedShifts, shift]);
    }
  };

  const selectAll = () => {
    setSelectedShifts(['T1', 'T2', 'T3']);
  };

  const selectNone = () => {
    setSelectedShifts([]);
  };

  const handleDemandaChange = (shift: string, dayIdx: number, val: number) => {
    if (prodUnit === 'm3') {
      const newDemanda = { ...demandaDiariaM3 };
      if (!newDemanda[shift]) newDemanda[shift] = Array(diasCount).fill(0);
      newDemanda[shift][dayIdx] = val;
      setDemandaDiariaM3(newDemanda);
      localStorage.setItem('demandaDiaria_m3', JSON.stringify(newDemanda));
    } else {
      const newDemanda = { ...demandaDiariaPcs };
      if (!newDemanda[shift]) newDemanda[shift] = Array(diasCount).fill(0);
      newDemanda[shift][dayIdx] = val;
      setDemandaDiariaPcs(newDemanda);
      localStorage.setItem('demandaDiaria_pcs', JSON.stringify(newDemanda));
    }
  };

  const handleToggleDay = (colabId: string, dayIdx: number) => {
    if (!isManualMode) {
      if (onToggleManualMode) onToggleManualMode(true);
    }
    if (onUpdateColaboradores) {
      const updated = colaboradores.map(c => {
        if (c.id === colabId) {
          const newEscala = [...c.escala];
          newEscala[dayIdx] = newEscala[dayIdx] === 'WORK' ? 'OFF' : 'WORK';
          return { ...c, escala: newEscala };
        }
        return c;
      });
      onUpdateColaboradores(updated);
    }
  };

  const filteredColaboradores = colaboradores.filter(
    (c) => selectedShifts.includes(c.turno)
  );

  // Grouping structure for rendering table rows under headers
  interface GroupedData {
    key: string;
    shiftLabel: string;
    teamLabel: string;
    teamDesc: string;
    teamColorKey: TeamConfig['colorKey'] | 'gray';
    teamOrder: number; // order from teams config
    members: Colaborador[];
  }

  // Generate groups
  const groupsMap = new Map<string, GroupedData>();

  filteredColaboradores.forEach((colab) => {
    const teamInfo = getTeamInfo(colab, teams);
    const shiftLabel = colab.turno === 'T1' ? '1º Turno (T1)' : colab.turno === 'T2' ? '2º Turno (T2)' : '3º Turno (T3)';
    const groupKey = `${colab.turno}-${teamInfo.name}`;
    const teamOrder = teams.findIndex(t => t.name === teamInfo.name && t.shiftType === colab.turno);

    if (!groupsMap.has(groupKey)) {
      groupsMap.set(groupKey, {
        key: groupKey,
        shiftLabel,
        teamLabel: teamInfo.name,
        teamDesc: teamInfo.desc,
        teamColorKey: teamInfo.colorKey,
        teamOrder: teamOrder === -1 ? 99 : teamOrder,
        members: []
      });
    }
    groupsMap.get(groupKey)!.members.push(colab);
  });

  // Sort groups: T1 first, then T2, then T3; inside each shift, by team order in config
  const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => {
    const shiftOrder: { [key: string]: number } = { '1º Turno (T1)': 1, '2º Turno (T2)': 2, '3º Turno (T3)': 3 };
    const orderA = shiftOrder[a.shiftLabel] || 99;
    const orderB = shiftOrder[b.shiftLabel] || 99;
    if (orderA !== orderB) return orderA - orderB;
    if (a.teamOrder !== b.teamOrder) return a.teamOrder - b.teamOrder;
    return a.teamLabel.localeCompare(b.teamLabel);
  });

  // Sort members inside each group by ID
  sortedGroups.forEach(g => {
    g.members.sort((a, b) => a.id.localeCompare(b.id));
  });

  // Sorted list for consolidated view mode
  const sortedColaboradoresConsolidated = [...filteredColaboradores].sort((a, b) => {
    if (a.turno !== b.turno) {
      const orderA = a.turno === 'T1' ? 1 : a.turno === 'T2' ? 2 : 3;
      const orderB = b.turno === 'T1' ? 1 : b.turno === 'T2' ? 2 : 3;
      return orderA - orderB;
    }
    return a.id.localeCompare(b.id);
  });

  // Collapse/Expand toggles
  const toggleGroupCollapse = (key: string) => {
    if (collapsedGroups.includes(key)) {
      setCollapsedGroups(collapsedGroups.filter((g) => g !== key));
    } else {
      setCollapsedGroups([...collapsedGroups, key]);
    }
  };

  const collapseAll = () => {
    setCollapsedGroups(sortedGroups.map(g => g.key));
  };

  const expandAll = () => {
    setCollapsedGroups([]);
  };

  // Helper to render employee row
  const renderColaboradorRow = (colab: Colaborador) => {
    const diasTrabalhados = colab.escala.filter(status => status === 'WORK').length;
    const teamInfo = getTeamInfo(colab, teams);
    const colors = TEAM_COLOR_MAP[teamInfo.colorKey];
    return (
      <tr key={colab.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition border-b border-slate-100 dark:border-slate-800">
        <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between gap-1 shadow-sm">
          <div className="flex items-center gap-1 overflow-hidden">
            <User className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate text-[9.5px]">{colab.id.split('-')[1] || colab.id}</span>
            <span
              className={`text-[7px] px-1 py-0.5 rounded font-black shrink-0 border ${colors.bg} ${colors.text} ${colors.border}`}
            >
              {teamInfo.name === 'Sem Equipe' ? '—' : teamInfo.name.split(' ').slice(1).join(' ') || teamInfo.name}
            </span>
          </div>
          <span className={`text-[7.5px] px-1.5 py-0.2 rounded font-black text-white uppercase shrink-0 ${
            colab.turno === 'T1' 
              ? 'bg-emerald-600 dark:bg-emerald-700'
              : colab.turno === 'T2'
                ? 'bg-amber-600 dark:bg-amber-700'
                : 'bg-indigo-600 dark:bg-indigo-700'
          }`}>
            {colab.turno}
          </span>
        </td>
        
        {colab.escala.map((status, d) => {
          const isWorking = status === 'WORK';
          const dayOfWeek = (startDayOfWeek + d) % 7;
          const isSun = dayOfWeek === 6;
          const isSat = dayOfWeek === 5;
          
          return (
            <td
              key={d}
              className={`p-0.5 text-center ${
                isSun 
                  ? 'bg-slate-50/10 dark:bg-slate-900/5 border-r-2 border-slate-300 dark:border-slate-700' 
                  : isSat 
                    ? 'bg-slate-50/10 dark:bg-slate-900/5 border-r border-slate-200 dark:border-slate-800' 
                    : 'border-r border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex justify-center">
                <span
                  onClick={() => handleToggleDay(colab.id, d)}
                  className={`w-[19px] h-[19px] rounded-md flex items-center justify-center font-black text-[9px] transition-all border cursor-pointer hover:scale-110 active:scale-95 select-none ${
                    isWorking
                      ? teamInfo.name === 'Sem Equipe'
                        ? 'bg-slate-300 text-slate-650 border-slate-450 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                        : `${TEAM_COLOR_MAP[teamInfo.colorKey].badge} text-white border-slate-800/10`
                      : 'bg-slate-100 text-slate-400 border-slate-200/60 dark:bg-slate-900/40 dark:text-slate-600 dark:border-slate-800'
                  }`}
                  title={isWorking ? `Clique para dar Folga ao ${colab.id}` : `Clique para escalar o ${colab.id}`}
                >
                  {isWorking ? (teamInfo.name === 'Sem Equipe' ? '—' : colab.turno) : 'F'}
                </span>
              </div>
            </td>
          );
        })}
        {/* Collaborator days worked summary cell */}
        <td className="p-0.5 text-center text-[9px] font-black bg-slate-100/30 dark:bg-slate-900/40 border-l border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
          <div className="flex flex-col items-center">
            <span>{diasTrabalhados}</span>
            <span className="text-[6.5px] text-slate-400 font-normal">Dias</span>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <React.Fragment>
      <div className={plain ? "w-full overflow-hidden" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm mb-8 overflow-hidden"}>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800/60">
        {!plain ? (
          <div className="sticky left-3 z-10 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-600" />
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-slate-100">
                Calendário de Planejamento (28 Dias)
              </h2>
              <p className="text-[10px] text-slate-400">Escala de folgas e turnos da equipe</p>
            </div>
          </div>
        ) : (
          <div className="sticky left-3 z-10 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span className="font-extrabold text-sm text-slate-700 dark:text-slate-200">Grade da Escala Consolidada</span>
          </div>
        )}
        
        <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold">
          <div className="flex flex-wrap items-center justify-between gap-4 w-full border-b border-slate-100 dark:border-slate-800/40 pb-3 mb-1">
            <div className="flex flex-wrap items-center gap-4">

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  Exibição:
                </span>
                <div className="flex bg-slate-200/60 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-250 dark:border-slate-800">
                  <button
                    onClick={() => setViewMode('grouped')}
                    className={`px-2.5 py-0.5 rounded-md text-[9px] font-black transition duration-200 cursor-pointer ${
                      viewMode === 'grouped'
                        ? 'bg-slate-600 text-white shadow-sm dark:bg-slate-800'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    Por Equipes
                  </button>
                  <button
                    onClick={() => setViewMode('consolidated')}
                    className={`px-2.5 py-0.5 rounded-md text-[9px] font-black transition duration-200 cursor-pointer ${
                      viewMode === 'consolidated'
                        ? 'bg-slate-600 text-white shadow-sm dark:bg-slate-800'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    Consolidado
                  </button>
                </div>
              </div>

              {/* Collapse/Expand Control (Only in Grouped) */}
              {viewMode === 'grouped' && (
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] font-black text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    Grupos:
                  </span>
                  <div className="flex bg-slate-200/60 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-250 dark:border-slate-800">
                    <button
                      onClick={expandAll}
                      className={`px-2 py-0.5 rounded text-[8px] font-black transition cursor-pointer ${
                        collapsedGroups.length === 0
                          ? 'bg-slate-400 text-white dark:bg-slate-850'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                      }`}
                    >
                      Expandir
                    </button>
                    <button
                      onClick={collapseAll}
                      className={`px-2 py-0.5 rounded text-[8px] font-black transition cursor-pointer ${
                        collapsedGroups.length === sortedGroups.length
                          ? 'bg-slate-400 text-white dark:bg-slate-850'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                      }`}
                    >
                      Recolher
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Gerenciar Equipes Button */}
            <button
              onClick={() => setShowTeamManager(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer shadow-md hover:shadow-lg"
              title="Criar, excluir e distribuir colaboradores entre equipes"
            >
              <Settings2 className="w-4 h-4" />
              Gerenciar Equipes
            </button>
          </div>

          {/* Row 2: Filtering and Legend */}
          <div className="flex flex-wrap items-center justify-between gap-4 w-full pt-1">
            {/* Shift Filter */}
            <div className="sticky left-3 z-10 flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                Filtrar Turno:
              </span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200/50 dark:border-slate-850">
                <button
                  onClick={() => {
                    if (selectedShifts.length === 3) selectNone();
                    else selectAll();
                  }}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-black transition duration-200 cursor-pointer text-slate-500 hover:text-slate-800 dark:text-slate-400"
                >
                  {selectedShifts.length === 3 ? 'Nenhum' : 'Todos'}
                </button>
                <div className="h-3 w-[1px] bg-slate-350 dark:bg-slate-700 mx-0.5" />
                {['T1', 'T2', 'T3'].map((shift) => {
                  const isActive = selectedShifts.includes(shift);
                  const label = shift === 'T1' ? '1º Turno' : shift === 'T2' ? '2º Turno' : '3º Turno';
                  return (
                    <button
                      key={shift}
                      onClick={() => toggleShift(shift)}
                      className={`px-3 py-1 rounded-lg text-[9px] font-black transition duration-200 cursor-pointer ${
                        isActive
                          ? shift === 'T1'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : shift === 'T2'
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>


          </div>
        </div>
      </div>


      {/* Painel de Capacidade & Produtividade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 noprint">
        {/* Card 1: Meta de Produtividade */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </span>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Meta de Produtividade</h4>
              </div>

              {/* Unit Toggle */}
              <div className="flex bg-slate-100 dark:bg-slate-850 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-800 shrink-0">
                <button
                  onClick={() => setProdUnit('m3')}
                  className={`px-2 py-0.5 rounded-md text-[9px] font-black transition cursor-pointer ${
                    prodUnit === 'm3'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  m³
                </button>
                <button
                  onClick={() => setProdUnit('pcs')}
                  className={`px-2 py-0.5 rounded-md text-[9px] font-black transition cursor-pointer ${
                    prodUnit === 'pcs'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Pçs
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Ajuste o volume processado por conferente por dia
            </p>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <input
              type="number"
              value={prodRate}
              onChange={(e) => {
                const val = Math.max(1, parseInt(e.target.value) || 0);
                if (prodUnit === 'm3') {
                  setProdRateM3(val);
                } else {
                  setProdRatePcs(val);
                }
              }}
              className="w-20 text-lg font-black text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-center"
            />
            <span className="text-slate-500 dark:text-slate-400 font-extrabold text-[11px]">
              {prodUnit === 'm3' ? 'm³/dia' : 'Pçs/dia'}
            </span>
          </div>
        </div>

        {/* Card 2: Capacidade Teórica */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <h5 className="text-[9px] font-black text-slate-450 dark:text-slate-555 uppercase tracking-wider">Capacidade Teórica</h5>
            <div className="flex items-baseline gap-1 mt-3">
              <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{capacityStats.capacidadeTeorica.toLocaleString('pt-BR')}</span>
              <span className="text-xs font-bold text-slate-400">{prodUnit === 'm3' ? 'm³' : 'Pçs'}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4">
            Sem considerar folgas da escala
          </p>
        </div>

        {/* Card 3: Capacidade com Folgas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <h5 className="text-[9px] font-black text-slate-450 dark:text-slate-555 uppercase tracking-wider">Capacidade com Folgas</h5>
            <div className="flex items-baseline gap-1 mt-3">
              <span className="text-3xl font-black text-blue-600 dark:text-blue-400">{capacityStats.capacidadeReal.toLocaleString('pt-BR')}</span>
              <span className="text-xs font-bold text-blue-400">{prodUnit === 'm3' ? 'm³' : 'Pçs'}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-4 pt-2 border-t border-slate-100 dark:border-slate-800/50">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Capacidade real de atendimento</span>
          </div>
        </div>

        {/* Card 4: Perda de Capacidade */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <h5 className="text-[9px] font-black text-slate-450 dark:text-slate-555 uppercase tracking-wider">Perda de Capacidade</h5>
            <div className="flex items-baseline gap-1.5 mt-3">
              <span className="text-3xl font-black text-orange-500 dark:text-orange-400">{capacityStats.perdaCapacidade}%</span>
              <TrendingDown className="w-4 h-4 text-orange-500 dark:text-orange-400 self-center" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4">
            Redução operacional devido à escala 5x2
          </p>
        </div>
      </div>

      <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse text-[10px] table-fixed">
          <thead>
            {/* Week divider row */}
            <tr className="bg-slate-100 dark:bg-slate-900/60 text-[10px] font-black text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800">
              <th className="p-1.5 sticky left-0 z-20 bg-slate-100 dark:bg-slate-900 w-[92px] min-w-[92px] border-r border-slate-200 dark:border-slate-800"></th>
              {Array.from({ length: Math.ceil(diasCount / 7) }).map((_, wIdx) => {
                const colSpan = Math.min(7, diasCount - wIdx * 7);
                const startDay = wIdx * 7 + 1;
                const endDay = Math.min((wIdx + 1) * 7, diasCount);
                const dateLabel = (month !== undefined && year !== undefined)
                  ? ` (${String(startDay).padStart(2, '0')}/${String(month + 1).padStart(2, '0')} a ${String(endDay).padStart(2, '0')}/${String(month + 1).padStart(2, '0')})`
                  : '';
                return (
                  <th key={wIdx} colSpan={colSpan} className="p-1 text-center border-r-2 border-slate-300 dark:border-slate-700 font-extrabold tracking-wider text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-[9px] font-black uppercase text-slate-700 dark:text-slate-300">
                      Semana {wIdx + 1}{dateLabel}
                    </span>
                  </th>
                );
              })}
              <th className="p-1 text-center bg-slate-150 dark:bg-slate-900/80 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-black w-[55px] min-w-[55px] uppercase text-[9px]">
                Resumo
              </th>
            </tr>
            <tr className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <th className="p-1.5 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300 w-[92px] min-w-[92px] text-[10px]">
                Colaborador
              </th>
              {Array.from({ length: diasCount }).map((_, d) => {
                const dayOfWeek = (startDayOfWeek + d) % 7;
                const isSat = dayOfWeek === 5;
                const isSun = dayOfWeek === 6;
                const weekdayName = WEEKDAYS[dayOfWeek];
                
                return (
                  <th
                    key={d}
                    className={`p-1 text-center font-bold transition-colors ${
                      isSun 
                        ? 'bg-rose-50/60 dark:bg-rose-950/20 border-r-2 border-slate-300 dark:border-slate-700' 
                        : isSat 
                          ? 'bg-blue-50/60 dark:bg-blue-950/20 border-r border-slate-200 dark:border-slate-800' 
                          : 'bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className={`text-[8px] uppercase font-black ${
                      isSun 
                        ? 'text-rose-600 dark:text-rose-400' 
                        : isSat 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : 'text-slate-400'
                    }`}>
                      {weekdayName[0]}
                    </div>
                    <div className={`text-[10px] font-extrabold ${
                      isSun 
                        ? 'text-rose-700 dark:text-rose-300' 
                        : isSat 
                          ? 'text-blue-700 dark:text-blue-300' 
                          : 'text-slate-700 dark:text-slate-200'
                    }`}>
                      {String(d + 1).padStart(2, '0')}
                    </div>
                  </th>
                );
              })}
              <th className="p-1.5 text-center bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold border-l border-slate-200 dark:border-slate-800 w-[55px] min-w-[55px] text-[9.5px]">
                Total/Méd.
              </th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {viewMode === 'grouped' ? (
              sortedGroups.map((group) => {
                const isCollapsed = collapsedGroups.includes(group.key);
                return (
                  <React.Fragment key={group.key}>
                    {/* Group Header Row */}
                    <tr 
                      onClick={() => toggleGroupCollapse(group.key)}
                      className="bg-slate-50/50 dark:bg-slate-900/30 text-[9px] font-extrabold text-slate-600 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-900/60 transition cursor-pointer select-none"
                    >
                      {isCollapsed ? (
                        <>
                          {/* Collapsed Header: First Cell */}
                          <td className="p-1 sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200 shadow-sm">
                            <div className="flex items-center gap-1.5 text-[9px] overflow-hidden">
                              <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className={`px-1.5 py-0.5 rounded font-black text-white text-[8.5px] shrink-0 ${TEAM_COLOR_MAP[group.teamColorKey]?.badge || 'bg-slate-600'}`}>
                                {group.teamLabel}
                              </span>
                              <span className={`text-[7.5px] px-1 py-0.2 rounded font-black text-white uppercase shrink-0 ${
                                group.members[0]?.turno === 'T1' 
                                  ? 'bg-emerald-600'
                                  : group.members[0]?.turno === 'T2'
                                    ? 'bg-amber-600'
                                    : 'bg-indigo-600'
                              }`}>
                                {group.members[0]?.turno}
                              </span>
                            </div>
                          </td>

                          {/* Collapsed Header: Daily Counts */}
                          {Array.from({ length: diasCount }).map((_, d) => {
                            const count = group.members.filter(c => c.escala[d] === 'WORK').length;
                            const dayOfWeek = (startDayOfWeek + d) % 7;
                            const isSun = dayOfWeek === 6;
                            const isSat = dayOfWeek === 5;
                            
                            return (
                              <td
                                key={d}
                                className={`p-0.5 text-center text-[9px] font-black bg-slate-50/20 dark:bg-slate-900/10 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 ${
                                  isSun 
                                    ? 'border-r-2 border-slate-350 dark:border-slate-700' 
                                    : isSat 
                                      ? 'border-r border-slate-200 dark:border-slate-800' 
                                      : 'border-r border-slate-200 dark:border-slate-800'
                                }`}
                              >
                                <div className="flex justify-center">
                                  {count > 0 ? (
                                    <span className={`w-[19px] h-[19px] rounded-full flex items-center justify-center font-black text-[9px] text-white shadow-sm ${
                                      TEAM_COLOR_MAP[group.teamColorKey]?.badge || 'bg-slate-600'
                                    }`}>
                                      {count}
                                    </span>
                                  ) : (
                                    <span className="w-[19px] h-[19px] flex items-center justify-center text-slate-300 dark:text-slate-700 font-normal">
                                      0
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          })}

                          {/* Collapsed Header: Summary Cell */}
                          <td className="p-0.5 text-center text-[9px] font-black bg-slate-100/30 dark:bg-slate-900/40 border-l border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                            <div className="flex flex-col items-center">
                              <span>{group.members.length}</span>
                              <span className="text-[6.5px] text-slate-450 font-normal leading-none mt-0.5">Colab</span>
                            </div>
                          </td>
                        </>
                      ) : (
                        /* Expanded Header: Single colSpan Cell */
                        <td colSpan={diasCount + 2} className="p-1.5 px-3 border-y border-slate-200/60 dark:border-slate-800/80 ">
                          <div className="sticky left-3 z-10 flex items-center gap-2">
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-800 dark:text-slate-200">{group.shiftLabel}</span>
                            <span className="h-3 w-[1px] bg-slate-300 dark:bg-slate-700"></span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-black text-white ${TEAM_COLOR_MAP[group.teamColorKey]?.badge || 'bg-slate-600'}`}>
                              {group.teamLabel}
                            </span>
                            <span className="text-slate-400 font-normal">({group.teamDesc})</span>
                            <span className="ml-auto text-slate-400 font-medium">{group.members.length} colaboradores</span>
                          </div>
                        </td>
                      )}
                    </tr>

                    {/* Group Members Rows */}
                    {!isCollapsed && group.members.map((colab) => renderColaboradorRow(colab))}
                  </React.Fragment>
                );
              })
            ) : (
              sortedColaboradoresConsolidated.map((colab) => renderColaboradorRow(colab))
            )}

            {/* Nível de Cobertura Diária Row */}
            <tr className="bg-slate-50/50 dark:bg-slate-900/40 border-t-2 border-b border-slate-200 dark:border-slate-800 transition">
              <td className="p-1 sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-800 font-black text-[9px] shadow-sm text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Cobertura %
              </td>
              {Array.from({ length: diasCount }).map((_, d) => {
                const activeCount = colaboradores.filter(c => c.escala[d] === 'WORK').length;
                const totalColabs = colaboradores.length;
                const pct = totalColabs > 0 ? Math.round((activeCount / totalColabs) * 100) : 0;
                
                const isSun = d % 7 === 6;
                const isSat = d % 7 === 5;
                
                // Color coding based on heatmap thresholds
                let colorClass = 'text-emerald-700 dark:text-emerald-350 bg-emerald-500/10 dark:bg-emerald-500/20';
                if (pct < 70) {
                  colorClass = 'text-rose-700 dark:text-rose-350 bg-rose-500/20 dark:bg-rose-500/30';
                } else if (pct < 80) {
                  colorClass = 'text-orange-700 dark:text-orange-350 bg-orange-500/15 dark:bg-orange-500/25';
                }
                
                return (
                  <td
                    key={d}
                    className={`p-0.5 text-center text-[9px] font-black ${colorClass} ${
                      isSun 
                        ? 'border-r-2 border-slate-300 dark:border-slate-700' 
                        : isSat
                          ? 'border-r border-slate-200 dark:border-slate-800'
                          : 'border-r border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {pct}%
                  </td>
                );
              })}
              {/* Summary Cell */}
              <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                <div className="flex flex-col items-center">
                  {(() => {
                    const avgPct = Math.round(
                      Array.from({ length: diasCount }).reduce((acc: number, _, d) => {
                        const activeCount = colaboradores.filter(c => c.escala[d] === 'WORK').length;
                        const pct = colaboradores.length > 0 ? (activeCount / colaboradores.length) * 100 : 0;
                        return acc + pct;
                      }, 0) / diasCount
                    );
                    return (
                      <>
                        <span className="font-extrabold text-[9px] text-slate-800 dark:text-slate-200">{avgPct}%</span>
                        <span className="text-[6.5px] text-slate-450 font-normal">Média</span>
                      </>
                    );
                  })()}
                </div>
              </td>
            </tr>

            {/* T1 Summary Group */}
            {selectedShifts.includes('T1') && (
              <>
                {/* Visual Shift Header */}
                <tr 
                  onClick={() => toggleSummaryPanel('T1')}
                  className="bg-slate-50 dark:bg-slate-950 text-[9px] font-extrabold border-t-2 border-slate-200 dark:border-slate-800 cursor-pointer select-none"
                >
                  <td colSpan={diasCount + 2} className="p-1.5 px-3 text-white bg-emerald-600 dark:bg-emerald-700 border-l-4 border-slate-800 shadow-sm">
                    <span className="sticky left-3 z-10 flex items-center gap-1.5">
                      {collapsedSummaryPanels.includes('T1') ? (
                        <ChevronRight className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-white" />
                      )}
                      <span>PAINEL DE TOTAIS: 1º TURNO (T1)</span>
                    </span>
                  </td>
                </tr>
                {!collapsedSummaryPanels.includes('T1') && (
                <>
                <tr className="hover:bg-slate-50/50 transition">
                  <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-300">
                    Ativos T1
                  </td>
                  {Array.from({ length: diasCount }).map((_, d) => {
                    const count = colaboradores.filter(c => c.turno === 'T1' && c.escala[d] === 'WORK').length;
                    const isSun = d % 7 === 6;
                    const isSat = d % 7 === 5;
                    return (
                      <td
                        key={d}
                        className={`p-0.5 text-center text-[9px] font-black text-slate-700 dark:text-slate-300 ${
                          isSun 
                            ? 'border-r-2 border-slate-300 dark:border-slate-700' 
                            : isSat
                              ? 'border-r border-slate-200 dark:border-slate-800'
                              : 'border-r border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {count}
                      </td>
                    );
                  })}
                  {/* Summary Cell */}
                  <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      <span>{Math.round(Array.from({ length: diasCount }).map((_, d) => colaboradores.filter(c => c.turno === 'T1' && c.escala[d] === 'WORK').length).reduce((a, b) => a + b, 0) / diasCount)}</span>
                      <span className="text-[6.5px] text-slate-400 font-normal">Média</span>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition">
                  <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-300">
                    Capac. T1
                  </td>
                  {Array.from({ length: diasCount }).map((_, d) => {
                    const count = colaboradores.filter(c => c.turno === 'T1' && c.escala[d] === 'WORK').length;
                    const isSun = d % 7 === 6;
                    const isSat = d % 7 === 5;
                    return (
                      <td
                        key={d}
                        className={`p-0.5 text-center text-[9px] font-black text-slate-700 dark:text-slate-300 ${
                          isSun 
                            ? 'border-r-2 border-slate-300 dark:border-slate-700' 
                            : isSat
                              ? 'border-r border-slate-200 dark:border-slate-800'
                              : 'border-r border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {count * prodRate}
                      </td>
                    );
                  })}
                  {/* Summary Cell */}
                  <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      <span>{(Array.from({ length: diasCount }).map((_, d) => colaboradores.filter(c => c.turno === 'T1' && c.escala[d] === 'WORK').length * prodRate).reduce((a, b) => a + b, 0)).toLocaleString('pt-BR')}</span>
                      <span className="text-[6.5px] text-slate-400 font-normal">TT</span>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition">
                  <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-305">
                    Demand. T1
                  </td>
                  {Array.from({ length: diasCount }).map((_, d) => {
                    const demand = (demandaDiaria['T1'] && demandaDiaria['T1'][d]) || 0;
                    const isSun = d % 7 === 6;
                    const isSat = d % 7 === 5;
                    return (
                      <td
                        key={d}
                        className={`p-0.5 text-center text-[9px] font-black ${
                          isSun 
                            ? 'border-r-2 border-slate-300 dark:border-slate-700' 
                            : isSat
                              ? 'border-r border-slate-200 dark:border-slate-800'
                              : 'border-r border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={demand === 0 ? '' : demand}
                          placeholder="0"
                          onChange={(e) => {
                            const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                            handleDemandaChange('T1', d, val);
                          }}
                          className="w-full text-center text-[9px] font-extrabold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-0.5 py-0.2 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                      </td>
                    );
                  })}
                  {/* Summary Cell */}
                  <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      <span>{((demandaDiaria['T1'] || []).reduce((a, b) => a + b, 0)).toLocaleString('pt-BR')}</span>
                      <span className="text-[6.5px] text-slate-400 font-normal">TT</span>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition">
                  <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-300">
                    Saldo T1
                  </td>
                  {Array.from({ length: diasCount }).map((_, d) => {
                    const count = colaboradores.filter(c => c.turno === 'T1' && c.escala[d] === 'WORK').length;
                    const cap = count * prodRate;
                    const demand = (demandaDiaria['T1'] && demandaDiaria['T1'][d]) || 0;
                    const diff = cap - demand;
                    const isSun = d % 7 === 6;
                    const isSat = d % 7 === 5;
                    return (
                      <td
                        key={d}
                        className={`p-0.5 text-center text-[9px] font-black ${
                          isSun 
                            ? 'border-r-2 border-slate-300 dark:border-slate-700' 
                            : isSat
                              ? 'border-r border-slate-200 dark:border-slate-800'
                              : 'border-r border-slate-200 dark:border-slate-800'
                        } ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
                      >
                        {diff > 0 ? `+${diff}` : diff}
                      </td>
                    );
                  })}
                  {/* Summary Cell */}
                  <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      {(() => {
                        const totalCap = Array.from({ length: diasCount }).map((_, d) => colaboradores.filter(c => c.turno === 'T1' && c.escala[d] === 'WORK').length * prodRate).reduce((a, b) => a + b, 0);
                        const totalDem = (demandaDiaria['T1'] || []).reduce((a, b) => a + b, 0);
                        const totalSal = totalCap - totalDem;
                        return (
                          <>
                            <span className={totalSal >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-red-500 dark:text-red-450'}>
                              {totalSal > 0 ? `+${totalSal.toLocaleString('pt-BR')}` : totalSal.toLocaleString('pt-BR')}
                            </span>
                            <span className="text-[6.5px] text-slate-400 font-normal">SL TT</span>
                          </>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
                {/* HC +/- Row */}
                <tr className="bg-slate-50/20 dark:bg-slate-955/20 font-black border-b-2 border-slate-200 dark:border-slate-800 transition">
                  <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-300">
                    Hc +/- T1
                  </td>
                  {Array.from({ length: diasCount }).map((_, d) => {
                    const count = colaboradores.filter(c => c.turno === 'T1' && c.escala[d] === 'WORK').length;
                    const cap = count * prodRate;
                    const demand = (demandaDiaria['T1'] && demandaDiaria['T1'][d]) || 0;
                    const diff = cap - demand;
                    const hcDiff = Math.round(diff / prodRate);
                    const isSun = d % 7 === 6;
                    const isSat = d % 7 === 5;
                    return (
                      <td
                        key={d}
                        className={`p-0.5 text-center text-[9px] font-black ${
                          isSun 
                            ? 'border-r-2 border-slate-300 dark:border-slate-700 bg-slate-50/50' 
                            : isSat
                              ? 'border-r border-slate-200 dark:border-slate-800 bg-slate-50/50'
                              : 'border-r border-slate-200 dark:border-slate-800'
                        } ${hcDiff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
                      >
                        {hcDiff > 0 ? `+${hcDiff}` : hcDiff}
                      </td>
                    );
                  })}
                  {/* Summary Cell */}
                  <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      {(() => {
                        const totalCap = Array.from({ length: diasCount }).map((_, d) => colaboradores.filter(c => c.turno === 'T1' && c.escala[d] === 'WORK').length * prodRate).reduce((a, b) => a + b, 0);
                        const totalDem = (demandaDiaria['T1'] || []).reduce((a, b) => a + b, 0);
                        const totalSal = totalCap - totalDem;
                        const avgHc = Math.round((totalSal / prodRate / diasCount) * 10) / 10;
                        return (
                          <>
                            <span className={avgHc >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-red-500 dark:text-red-450'}>
                              {avgHc > 0 ? `+${avgHc}` : avgHc}
                            </span>
                            <span className="text-[6.5px] text-slate-400 font-normal">Média</span>
                          </>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
                </>
                )}
              </>
            )}

            {/* T2 Summary Group */}
            {selectedShifts.includes('T2') && (
              <>
                {/* Visual Shift Header */}
                <tr 
                  onClick={() => toggleSummaryPanel('T2')}
                  className="bg-slate-50 dark:bg-slate-950 text-[9px] font-extrabold border-t-2 border-slate-200 dark:border-slate-800 cursor-pointer select-none"
                >
                  <td colSpan={diasCount + 2} className="p-1.5 px-3 text-white bg-amber-600 dark:bg-amber-700 border-l-4 border-slate-800 shadow-sm">
                    <span className="sticky left-3 z-10 flex items-center gap-1.5">
                      {collapsedSummaryPanels.includes('T2') ? (
                        <ChevronRight className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-white" />
                      )}
                      <span>PAINEL DE TOTAIS: 2º TURNO (T2)</span>
                    </span>
                  </td>
                </tr>
                {!collapsedSummaryPanels.includes('T2') && (
                <>
                <tr className="hover:bg-slate-50/50 transition">
                  <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-300">
                    Ativos T2
                  </td>
                  {Array.from({ length: diasCount }).map((_, d) => {
                    const count = colaboradores.filter(c => c.turno === 'T2' && c.escala[d] === 'WORK').length;
                    const isSun = d % 7 === 6;
                    const isSat = d % 7 === 5;
                    return (
                      <td
                        key={d}
                        className={`p-0.5 text-center text-[9px] font-black text-slate-700 dark:text-slate-300 ${
                          isSun 
                            ? 'border-r-2 border-slate-300 dark:border-slate-700' 
                            : isSat
                              ? 'border-r border-slate-200 dark:border-slate-800'
                              : 'border-r border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {count}
                      </td>
                    );
                  })}
                  {/* Summary Cell */}
                  <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      <span>{Math.round(Array.from({ length: diasCount }).map((_, d) => colaboradores.filter(c => c.turno === 'T2' && c.escala[d] === 'WORK').length).reduce((a, b) => a + b, 0) / diasCount)}</span>
                      <span className="text-[6.5px] text-slate-400 font-normal">Média</span>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition">
                  <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-300">
                    Capac. T2
                  </td>
                  {Array.from({ length: diasCount }).map((_, d) => {
                    const count = colaboradores.filter(c => c.turno === 'T2' && c.escala[d] === 'WORK').length;
                    const isSun = d % 7 === 6;
                    const isSat = d % 7 === 5;
                    return (
                      <td
                        key={d}
                        className={`p-0.5 text-center text-[9px] font-black text-slate-700 dark:text-slate-300 ${
                          isSun 
                            ? 'border-r-2 border-slate-300 dark:border-slate-700' 
                            : isSat
                              ? 'border-r border-slate-200 dark:border-slate-800'
                              : 'border-r border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {count * prodRate}
                      </td>
                    );
                  })}
                  {/* Summary Cell */}
                  <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      <span>{(Array.from({ length: diasCount }).map((_, d) => colaboradores.filter(c => c.turno === 'T2' && c.escala[d] === 'WORK').length * prodRate).reduce((a, b) => a + b, 0)).toLocaleString('pt-BR')}</span>
                      <span className="text-[6.5px] text-slate-400 font-normal">TT</span>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition">
                  <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-305">
                    Demand. T2
                  </td>
                  {Array.from({ length: diasCount }).map((_, d) => {
                    const demand = (demandaDiaria['T2'] && demandaDiaria['T2'][d]) || 0;
                    const isSun = d % 7 === 6;
                    const isSat = d % 7 === 5;
                    return (
                      <td
                        key={d}
                        className={`p-0.5 text-center text-[9px] font-black ${
                          isSun 
                            ? 'border-r-2 border-slate-300 dark:border-slate-700' 
                            : isSat
                              ? 'border-r border-slate-200 dark:border-slate-800'
                              : 'border-r border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={demand === 0 ? '' : demand}
                          placeholder="0"
                          onChange={(e) => {
                            const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                            handleDemandaChange('T2', d, val);
                          }}
                          className="w-full text-center text-[9px] font-extrabold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-0.5 py-0.2 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                      </td>
                    );
                  })}
                  {/* Summary Cell */}
                  <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      <span>{((demandaDiaria['T2'] || []).reduce((a, b) => a + b, 0)).toLocaleString('pt-BR')}</span>
                      <span className="text-[6.5px] text-slate-400 font-normal">TT</span>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition">
                  <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-300">
                    Saldo T2
                  </td>
                  {Array.from({ length: diasCount }).map((_, d) => {
                    const count = colaboradores.filter(c => c.turno === 'T2' && c.escala[d] === 'WORK').length;
                    const cap = count * prodRate;
                    const demand = (demandaDiaria['T2'] && demandaDiaria['T2'][d]) || 0;
                    const diff = cap - demand;
                    const isSun = d % 7 === 6;
                    const isSat = d % 7 === 5;
                    return (
                      <td
                        key={d}
                        className={`p-0.5 text-center text-[9px] font-black ${
                          isSun 
                            ? 'border-r-2 border-slate-300 dark:border-slate-700' 
                            : isSat
                              ? 'border-r border-slate-200 dark:border-slate-800'
                              : 'border-r border-slate-200 dark:border-slate-800'
                        } ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
                      >
                        {diff > 0 ? `+${diff}` : diff}
                      </td>
                    );
                  })}
                  {/* Summary Cell */}
                  <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      {(() => {
                        const totalCap = Array.from({ length: diasCount }).map((_, d) => colaboradores.filter(c => c.turno === 'T2' && c.escala[d] === 'WORK').length * prodRate).reduce((a, b) => a + b, 0);
                        const totalDem = (demandaDiaria['T2'] || []).reduce((a, b) => a + b, 0);
                        const totalSal = totalCap - totalDem;
                        return (
                          <>
                            <span className={totalSal >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-red-500 dark:text-red-455'}>
                              {totalSal > 0 ? `+${totalSal.toLocaleString('pt-BR')}` : totalSal.toLocaleString('pt-BR')}
                            </span>
                            <span className="text-[6.5px] text-slate-400 font-normal">SL TT</span>
                          </>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
                {/* HC +/- Row */}
                <tr className="bg-slate-50/20 dark:bg-slate-950/20 font-black border-b-2 border-slate-200 dark:border-slate-800 transition">
                  <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-300">
                    Hc +/- T2
                  </td>
                  {Array.from({ length: diasCount }).map((_, d) => {
                    const count = colaboradores.filter(c => c.turno === 'T2' && c.escala[d] === 'WORK').length;
                    const cap = count * prodRate;
                    const demand = (demandaDiaria['T2'] && demandaDiaria['T2'][d]) || 0;
                    const diff = cap - demand;
                    const hcDiff = Math.round(diff / prodRate);
                    const isSun = d % 7 === 6;
                    const isSat = d % 7 === 5;
                    return (
                      <td
                        key={d}
                        className={`p-0.5 text-center text-[9px] font-black ${
                          isSun 
                            ? 'border-r-2 border-slate-300 dark:border-slate-700 bg-slate-50/50' 
                            : isSat
                              ? 'border-r border-slate-200 dark:border-slate-800 bg-slate-50/50'
                              : 'border-r border-slate-200 dark:border-slate-800'
                        } ${hcDiff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
                      >
                        {hcDiff > 0 ? `+${hcDiff}` : hcDiff}
                      </td>
                    );
                  })}
                  {/* Summary Cell */}
                  <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      {(() => {
                        const totalCap = Array.from({ length: diasCount }).map((_, d) => colaboradores.filter(c => c.turno === 'T2' && c.escala[d] === 'WORK').length * prodRate).reduce((a, b) => a + b, 0);
                        const totalDem = (demandaDiaria['T2'] || []).reduce((a, b) => a + b, 0);
                        const totalSal = totalCap - totalDem;
                        const avgHc = Math.round((totalSal / prodRate / diasCount) * 10) / 10;
                        return (
                          <>
                            <span className={avgHc >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-red-500 dark:text-red-455'}>
                              {avgHc > 0 ? `+${avgHc}` : avgHc}
                            </span>
                            <span className="text-[6.5px] text-slate-400 font-normal">Média</span>
                          </>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
                </>
                )}
              </>
            )}

            {/* T3 Summary Group */}
            {selectedShifts.includes('T3') && (
              <>
                {/* Visual Shift Header */}
                <tr 
                  onClick={() => toggleSummaryPanel('T3')}
                  className="bg-slate-50 dark:bg-slate-950 text-[9px] font-extrabold border-t-2 border-slate-200 dark:border-slate-800 cursor-pointer select-none"
                >
                  <td colSpan={diasCount + 2} className="p-1.5 px-3 text-white bg-indigo-600 dark:bg-indigo-700 border-l-4 border-slate-800 shadow-sm animate-none">
                    <span className="sticky left-3 z-10 flex items-center gap-1.5">
                      {collapsedSummaryPanels.includes('T3') ? (
                        <ChevronRight className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-white" />
                      )}
                      <span>PAINEL DE TOTAIS: 3º TURNO (T3)</span>
                    </span>
                  </td>
                </tr>
                {!collapsedSummaryPanels.includes('T3') && (
                <>
                <tr className="hover:bg-slate-50/50 transition">
                  <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-300">
                    Ativos T3
                  </td>
                  {Array.from({ length: diasCount }).map((_, d) => {
                    const count = colaboradores.filter(c => c.turno === 'T3' && c.escala[d] === 'WORK').length;
                    const isSun = d % 7 === 6;
                    const isSat = d % 7 === 5;
                    return (
                      <td
                        key={d}
                        className={`p-0.5 text-center text-[9px] font-black text-slate-700 dark:text-slate-300 ${
                          isSun 
                            ? 'border-r-2 border-slate-300 dark:border-slate-700' 
                            : isSat
                              ? 'border-r border-slate-200 dark:border-slate-800'
                              : 'border-r border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {count}
                      </td>
                    );
                  })}
                  {/* Summary Cell */}
                  <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      <span>{Math.round(Array.from({ length: diasCount }).map((_, d) => colaboradores.filter(c => c.turno === 'T3' && c.escala[d] === 'WORK').length).reduce((a, b) => a + b, 0) / diasCount)}</span>
                      <span className="text-[6.5px] text-slate-400 font-normal">Média</span>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition">
                  <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-300">
                    Capac. T3
                  </td>
                  {Array.from({ length: diasCount }).map((_, d) => {
                    const count = colaboradores.filter(c => c.turno === 'T3' && c.escala[d] === 'WORK').length;
                    const isSun = d % 7 === 6;
                    const isSat = d % 7 === 5;
                    return (
                      <td
                        key={d}
                        className={`p-0.5 text-center text-[9px] font-black text-slate-700 dark:text-slate-300 ${
                          isSun 
                            ? 'border-r-2 border-slate-300 dark:border-slate-700' 
                            : isSat
                              ? 'border-r border-slate-200 dark:border-slate-800'
                              : 'border-r border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {count * prodRate}
                      </td>
                    );
                  })}
                  {/* Summary Cell */}
                  <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      <span>{(Array.from({ length: diasCount }).map((_, d) => colaboradores.filter(c => c.turno === 'T3' && c.escala[d] === 'WORK').length * prodRate).reduce((a, b) => a + b, 0)).toLocaleString('pt-BR')}</span>
                      <span className="text-[6.5px] text-slate-400 font-normal">TT</span>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition">
                  <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-305">
                    Demand. T3
                  </td>
                  {Array.from({ length: diasCount }).map((_, d) => {
                    const demand = (demandaDiaria['T3'] && demandaDiaria['T3'][d]) || 0;
                    const isSun = d % 7 === 6;
                    const isSat = d % 7 === 5;
                    return (
                      <td
                        key={d}
                        className={`p-0.5 text-center text-[9px] font-black ${
                          isSun 
                            ? 'border-r-2 border-slate-300 dark:border-slate-700' 
                            : isSat
                              ? 'border-r border-slate-200 dark:border-slate-800'
                              : 'border-r border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={demand === 0 ? '' : demand}
                          placeholder="0"
                          onChange={(e) => {
                            const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                            handleDemandaChange('T3', d, val);
                          }}
                          className="w-full text-center text-[9px] font-extrabold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-0.5 py-0.2 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                      </td>
                    );
                  })}
                  {/* Summary Cell */}
                  <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      <span>{((demandaDiaria['T3'] || []).reduce((a, b) => a + b, 0)).toLocaleString('pt-BR')}</span>
                      <span className="text-[6.5px] text-slate-400 font-normal">TT</span>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition">
                  <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-300">
                    Saldo T3
                  </td>
                  {Array.from({ length: diasCount }).map((_, d) => {
                    const count = colaboradores.filter(c => c.turno === 'T3' && c.escala[d] === 'WORK').length;
                    const cap = count * prodRate;
                    const demand = (demandaDiaria['T3'] && demandaDiaria['T3'][d]) || 0;
                    const diff = cap - demand;
                    const isSun = d % 7 === 6;
                    const isSat = d % 7 === 5;
                    return (
                      <td
                        key={d}
                        className={`p-0.5 text-center text-[9px] font-black ${
                          isSun 
                            ? 'border-r-2 border-slate-300 dark:border-slate-700' 
                            : isSat
                              ? 'border-r border-slate-200 dark:border-slate-800'
                              : 'border-r border-slate-200 dark:border-slate-800'
                        } ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
                      >
                        {diff > 0 ? `+${diff}` : diff}
                      </td>
                    );
                  })}
                  {/* Summary Cell */}
                  <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      {(() => {
                        const totalCap = Array.from({ length: diasCount }).map((_, d) => colaboradores.filter(c => c.turno === 'T3' && c.escala[d] === 'WORK').length * prodRate).reduce((a, b) => a + b, 0);
                        const totalDem = (demandaDiaria['T3'] || []).reduce((a, b) => a + b, 0);
                        const totalSal = totalCap - totalDem;
                        return (
                          <>
                            <span className={totalSal >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-red-500 dark:text-red-455'}>
                              {totalSal > 0 ? `+${totalSal.toLocaleString('pt-BR')}` : totalSal.toLocaleString('pt-BR')}
                            </span>
                            <span className="text-[6.5px] text-slate-400 font-normal">SL TT</span>
                          </>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
                {/* HC +/- Row */}
                <tr className="bg-slate-50/20 dark:bg-slate-950/20 font-black border-b-2 border-slate-200 dark:border-slate-800 transition">
                  <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-300">
                    Hc +/- T3
                  </td>
                  {Array.from({ length: diasCount }).map((_, d) => {
                    const count = colaboradores.filter(c => c.turno === 'T3' && c.escala[d] === 'WORK').length;
                    const cap = count * prodRate;
                    const demand = (demandaDiaria['T3'] && demandaDiaria['T3'][d]) || 0;
                    const diff = cap - demand;
                    const hcDiff = Math.round(diff / prodRate);
                    const isSun = d % 7 === 6;
                    const isSat = d % 7 === 5;
                    return (
                      <td
                        key={d}
                        className={`p-0.5 text-center text-[9px] font-black ${
                          isSun 
                            ? 'border-r-2 border-slate-300 dark:border-slate-700 bg-slate-50/50' 
                            : isSat
                              ? 'border-r border-slate-200 dark:border-slate-800 bg-slate-50/50'
                              : 'border-r border-slate-200 dark:border-slate-800'
                        } ${hcDiff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
                      >
                        {hcDiff > 0 ? `+${hcDiff}` : hcDiff}
                      </td>
                    );
                  })}
                  {/* Summary Cell */}
                  <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      {(() => {
                        const totalCap = Array.from({ length: diasCount }).map((_, d) => colaboradores.filter(c => c.turno === 'T3' && c.escala[d] === 'WORK').length * prodRate).reduce((a, b) => a + b, 0);
                        const totalDem = (demandaDiaria['T3'] || []).reduce((a, b) => a + b, 0);
                        const totalSal = totalCap - totalDem;
                        const avgHc = Math.round((totalSal / prodRate / diasCount) * 10) / 10;
                        return (
                          <>
                            <span className={avgHc >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-red-500 dark:text-red-455'}>
                              {avgHc > 0 ? `+${avgHc}` : avgHc}
                            </span>
                            <span className="text-[6.5px] text-slate-400 font-normal">Média</span>
                          </>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
                </>
                )}
              </>
            )}

            {/* Total Geral Summary Group */}
            {selectedShifts.length > 1 && (
              <>
                {/* Visual Shift Header */}
                <tr 
                  onClick={() => toggleSummaryPanel('CONSOLIDADO')}
                  className="bg-slate-50 dark:bg-slate-955 text-[9px] font-extrabold border-t-2 border-slate-200 dark:border-slate-800 cursor-pointer select-none"
                >
                  <td colSpan={diasCount + 2} className="p-1.5 px-3 text-white bg-slate-700 dark:bg-slate-800 border-l-4 border-slate-800 shadow-sm animate-none">
                    <span className="sticky left-3 z-10 flex items-center gap-1.5">
                      {collapsedSummaryPanels.includes('CONSOLIDADO') ? (
                        <ChevronRight className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-white" />
                      )}
                      <span>CONSOLIDADO GERAL (TODOS OS TURNOS)</span>
                    </span>
                  </td>
                </tr>
                {!collapsedSummaryPanels.includes('CONSOLIDADO') && (
                <>
                <tr className="hover:bg-slate-50/50 transition">
                  <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-300">
                    Ativos Geral
                  </td>
                  {Array.from({ length: diasCount }).map((_, d) => {
                    const count = colaboradores.filter(c => selectedShifts.includes(c.turno) && c.escala[d] === 'WORK').length;
                    const isSun = d % 7 === 6;
                    return (
                      <td
                        key={d}
                        className={`p-0.5 text-center text-[9px] font-black text-slate-700 dark:text-slate-300 ${
                          isSun 
                            ? 'border-r-2 border-slate-300 dark:border-slate-700' 
                            : 'border-r border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {count}
                      </td>
                    );
                  })}
                  {/* Summary Cell */}
                  <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      <span>{Math.round(Array.from({ length: diasCount }).map((_, d) => colaboradores.filter(c => selectedShifts.includes(c.turno) && c.escala[d] === 'WORK').length).reduce((a, b) => a + b, 0) / diasCount)}</span>
                      <span className="text-[6.5px] text-slate-400 font-normal">Média</span>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition">
                  <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-300">
                    Capac. Geral
                  </td>
                  {Array.from({ length: diasCount }).map((_, d) => {
                    const count = colaboradores.filter(c => selectedShifts.includes(c.turno) && c.escala[d] === 'WORK').length;
                    const isSun = d % 7 === 6;
                    return (
                      <td
                        key={d}
                        className={`p-0.5 text-center text-[9px] font-black text-slate-700 dark:text-slate-300 ${
                          isSun 
                            ? 'border-r-2 border-slate-300 dark:border-slate-700' 
                            : 'border-r border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {count * prodRate}
                      </td>
                    );
                  })}
                  {/* Summary Cell */}
                  <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      <span>{(Array.from({ length: diasCount }).map((_, d) => colaboradores.filter(c => selectedShifts.includes(c.turno) && c.escala[d] === 'WORK').length * prodRate).reduce((a, b) => a + b, 0)).toLocaleString('pt-BR')}</span>
                      <span className="text-[6.5px] text-slate-400 font-normal">TT</span>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition">
                  <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-300">
                    Demand. Geral
                  </td>
                  {Array.from({ length: diasCount }).map((_, d) => {
                    let totalDemand = 0;
                    selectedShifts.forEach(s => {
                      totalDemand += (demandaDiaria[s] && demandaDiaria[s][d]) || 0;
                    });
                    const isSun = d % 7 === 6;
                    return (
                      <td
                        key={d}
                        className={`p-0.5 text-center text-[9px] font-black text-slate-700 dark:text-slate-300 ${
                          isSun 
                            ? 'border-r-2 border-slate-300 dark:border-slate-700' 
                            : 'border-r border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {totalDemand}
                      </td>
                    );
                  })}
                  <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      <span>{(Array.from({ length: diasCount }).map((_, d) => selectedShifts.reduce((acc, s) => acc + ((demandaDiaria[s] && demandaDiaria[s][d]) || 0), 0)).reduce((a, b) => a + b, 0)).toLocaleString('pt-BR')}</span>
                      <span className="text-[6.5px] text-slate-400 font-normal">TT</span>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition">
                  <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-300">
                    Saldo Geral
                  </td>
                  {Array.from({ length: diasCount }).map((_, d) => {
                    const count = colaboradores.filter(c => selectedShifts.includes(c.turno) && c.escala[d] === 'WORK').length;
                    const cap = count * prodRate;
                    let totalDemand = 0;
                    selectedShifts.forEach(s => {
                      totalDemand += (demandaDiaria[s] && demandaDiaria[s][d]) || 0;
                    });
                    const diff = cap - totalDemand;
                    const isSun = d % 7 === 6;
                    return (
                      <td
                        key={d}
                        className={`p-0.5 text-center text-[9px] font-black ${
                          isSun 
                            ? 'border-r-2 border-slate-300 dark:border-slate-700' 
                            : 'border-r border-slate-200 dark:border-slate-800'
                        } ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-red-550 dark:text-red-455'}`}
                      >
                        {diff > 0 ? `+${diff}` : diff}
                      </td>
                    );
                  })}
                  {/* Summary Cell */}
                  <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      {(() => {
                        const totalCap = Array.from({ length: diasCount }).map((_, d) => colaboradores.filter(c => selectedShifts.includes(c.turno) && c.escala[d] === 'WORK').length * prodRate).reduce((a, b) => a + b, 0);
                        let grandDemand = 0;
                        for (let d = 0; d < diasCount; d++) {
                          selectedShifts.forEach(s => {
                            grandDemand += (demandaDiaria[s] && demandaDiaria[s][d]) || 0;
                          });
                        }
                        const totalSal = totalCap - grandDemand;
                        return (
                          <>
                            <span className={totalSal >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-red-550 dark:text-red-455'}>
                              {totalSal > 0 ? `+${totalSal.toLocaleString('pt-BR')}` : totalSal.toLocaleString('pt-BR')}
                            </span>
                            <span className="text-[6.5px] text-slate-400 font-normal">SL TT</span>
                          </>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
                {/* HC +/- Row */}
                <tr className="bg-slate-50/20 dark:bg-slate-900/20 font-black border-b border-slate-300 dark:border-slate-700 transition">
                  <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-300">
                    Hc +/- Geral
                  </td>
                  {Array.from({ length: diasCount }).map((_, d) => {
                    const count = colaboradores.filter(c => selectedShifts.includes(c.turno) && c.escala[d] === 'WORK').length;
                    const cap = count * prodRate;
                    let totalDemand = 0;
                    selectedShifts.forEach(s => {
                      totalDemand += (demandaDiaria[s] && demandaDiaria[s][d]) || 0;
                    });
                    const diff = cap - totalDemand;
                    const hcDiff = Math.round(diff / prodRate);
                    const isSun = d % 7 === 6;
                    return (
                      <td
                        key={d}
                        className={`p-0.5 text-center text-[9px] font-black ${
                          isSun 
                            ? 'border-r-2 border-slate-300 dark:border-slate-700 bg-slate-50/50' 
                            : 'border-r border-slate-200 dark:border-slate-800 bg-slate-50/50'
                        } ${hcDiff >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-red-550 dark:text-red-455'}`}
                      >
                        {hcDiff > 0 ? `+${hcDiff}` : hcDiff}
                      </td>
                    );
                  })}
                  {/* Summary Cell */}
                  <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      {(() => {
                        const totalCap = Array.from({ length: diasCount }).map((_, d) => colaboradores.filter(c => selectedShifts.includes(c.turno) && c.escala[d] === 'WORK').length * prodRate).reduce((a, b) => a + b, 0);
                        let grandDemand = 0;
                        for (let d = 0; d < diasCount; d++) {
                          selectedShifts.forEach(s => {
                            grandDemand += (demandaDiaria[s] && demandaDiaria[s][d]) || 0;
                          });
                        }
                        const totalSal = totalCap - grandDemand;
                        const avgHc = Math.round((totalSal / prodRate / diasCount) * 10) / 10;
                        return (
                          <>
                            <span className={avgHc >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-red-550 dark:text-red-455'}>
                              {avgHc > 0 ? `+${avgHc}` : avgHc}
                            </span>
                            <span className="text-[6.5px] text-slate-400 font-normal">Média</span>
                          </>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
                </>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* Team Manager Modal */}
    {showTeamManager && params && (
      <TeamManagerModal
        teams={teams}
        params={params}
        onSave={(newTeams) => {
          if (onUpdateTeams) onUpdateTeams(newTeams);
          setShowTeamManager(false);
        }}
        onClose={() => setShowTeamManager(false)}
      />
    )}
    </React.Fragment>
  );
};