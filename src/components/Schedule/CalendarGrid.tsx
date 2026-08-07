import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Colaborador, ScheduleParams, TeamConfig, OperationConfig } from '../../types';
import { Calendar, User, Filter, Layers, ChevronDown, ChevronRight, ChevronsUpDown, Settings2, Calculator, CheckCircle2, FileSpreadsheet, Activity, Gauge } from 'lucide-react';
import { TeamManagerModal } from './TeamManagerModal';
import { ScenarioManager } from './ScenarioManager';
import { ImportPmtModal } from './ImportPmtModal';
import { ImportDemandaModal } from './ImportDemandaModal';
import { WfmIntelligencePanel } from './WfmIntelligencePanel';
import { OperationConfigPanel } from './OperationConfigPanel';
import { MonthNavigator } from './MonthNavigator';
import { DEFAULT_OPERATION, getOperationalWeekIndex, getDayLabel, getMonthInfo, getMondaysInMonth, computeCapacity, generateIntelligentScale } from '../../utils/escala52Engine';

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
  onParamsChange?: (newParams: ScheduleParams) => void;
  teams?: TeamConfig[];
  onUpdateTeams?: (teams: TeamConfig[]) => void;
  demandaDiariaM3Prop?: { [key: string]: number[] };
  demandaDiariaPcsProp?: { [key: string]: number[] };
  onDemandaChangeM3?: (val: { [key: string]: number[] }) => void;
  onDemandaChangePcs?: (val: { [key: string]: number[] }) => void;
  pmtM3Prop?: number[];
  pmtPcsProp?: number[];
  onPmtM3Change?: (val: number[]) => void;
  onPmtPcsChange?: (val: number[]) => void;
  prodRateM3Prop?: number;
  prodRatePcsProp?: number;
  prodUnitProp?: 'm3' | 'pcs';
  onProdRateChange?: (rateM3: number, ratePcs: number, unit: 'm3' | 'pcs') => void;
  dadosMensais?: any;
  onLoadScenario?: (data: { teams?: any; params?: any; dados_mensais?: any; prod_rate_m3?: number; prod_rate_pcs?: number; prod_unit?: string; scenarioName?: string; scenarioId?: number }) => void;
  activeScenarioName?: string;
  activeScenarioId?: number;
  isScenarioDirty?: boolean;
  onScenarioSaved?: () => void;
  operation?: OperationConfig;
  onOperationChange?: (op: OperationConfig) => void;
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
  onParamsChange,
  teams = [],
  onUpdateTeams,
  demandaDiariaM3Prop,
  demandaDiariaPcsProp,
  onDemandaChangeM3,
  onDemandaChangePcs,
  pmtM3Prop,
  pmtPcsProp,
  onPmtM3Change,
  onPmtPcsChange,
  prodRateM3Prop,
  prodRatePcsProp,
  prodUnitProp,
  onProdRateChange,
  dadosMensais,
  onLoadScenario,
  activeScenarioName,
  activeScenarioId,
  isScenarioDirty,
  onScenarioSaved,
  operation: operationProp,
  onOperationChange,
}) => {
  const startDayOfWeek = (month !== undefined && month !== -1 && year !== undefined)
    ? getMonthInfo(year, month).startDayOfWeek
    : 0;

  const weeksToRender = useMemo(() => {
    if (month === undefined || month === -1 || year === undefined) {
      return Array.from({ length: Math.ceil(diasCount / 7) }).map((_, wIdx) => ({
        weekNum: wIdx + 1,
        colSpan: Math.min(7, diasCount - wIdx * 7),
        label: `SEMANA ${wIdx + 1}`,
      }));
    }

    const weeks: { weekNum: number; colSpan: number; label: string }[] = [];
    let currentWeekNum = -999;
    let currentSpan = 0;
    let weekStartDay = 1;

    const buildLabel = (span: number, wNum: number, th: Date, we: Date) => {
      if (span <= 2) return `S${wNum}`;
      if (span <= 4) return `SEM ${wNum}`;
      return `SEM ${wNum} (${String(th.getUTCDate()).padStart(2, '0')}/${String(th.getUTCMonth() + 1).padStart(2, '0')} A ${String(we.getUTCDate()).padStart(2, '0')}/${String(we.getUTCMonth() + 1).padStart(2, '0')})`;
    };

    for (let d = 0; d < diasCount; d++) {
      const currentDate = new Date(year, month, d + 1);
      const wIdx = getOperationalWeekIndex(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      const wNum = wIdx + 1;

      if (wNum !== currentWeekNum) {
        if (currentSpan > 0) {
          const thDate = new Date(Date.UTC(2025, 11, 29 + (currentWeekNum - 1) * 7));
          const weDate = new Date(Date.UTC(2025, 11, 29 + (currentWeekNum - 1) * 7 + 6));
          weeks.push({
            weekNum: currentWeekNum,
            colSpan: currentSpan,
            label: buildLabel(currentSpan, currentWeekNum, thDate, weDate),
          });
        }
        currentWeekNum = wNum;
        currentSpan = 1;
        weekStartDay = d + 1;
      } else {
        currentSpan++;
      }
    }

    if (currentSpan > 0) {
      const thDate = new Date(Date.UTC(2025, 11, 29 + (currentWeekNum - 1) * 7));
      const weDate = new Date(Date.UTC(2025, 11, 29 + (currentWeekNum - 1) * 7 + 6));
      weeks.push({
        weekNum: currentWeekNum,
        colSpan: currentSpan,
        label: buildLabel(currentSpan, currentWeekNum, thDate, weDate),
      });
    }

    return weeks;
  }, [diasCount, month, year]);

  const operation = operationProp ?? params?.operation ?? DEFAULT_OPERATION;
  const setOperation = onOperationChange ?? ((_op: OperationConfig) => {});
  const [selectedShifts, setSelectedShifts] = useState<string[]>(['T1', 'T2', 'T3']);
  // State holds view mode: 'grouped' (split by shift-teams) or 'consolidated' (flat list per shift)
  const [viewMode, setViewMode] = useState<'grouped' | 'consolidated'>('grouped');
  // State holds array of collapsed group keys
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  // State holds array of collapsed summary panel keys (T1, T2, T3, CONSOLIDADO)
  const [collapsedSummaryPanels, setCollapsedSummaryPanels] = useState<string[]>(['T1', 'T2', 'T3']);

  // Click & Drag range selection states (supports dragging across rows and groups like Excel)
  const [isDraggingRange, setIsDraggingRange] = useState(false);
  const [selectionAnchor, setSelectionAnchor] = useState<{ rowIdx: number; colIdx: number; status: any } | null>(null);
  const [selectionCurrent, setSelectionCurrent] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const [dragModifier, setDragModifier] = useState<'copy' | 'clear' | 'fillEmpty' | 'normal'>('normal');

  const handleCellMouseDown = (_colabId: string, rowIdx: number, d: number, status: any, e: React.MouseEvent) => {
    e.preventDefault();
    let mod: 'copy' | 'clear' | 'fillEmpty' | 'normal' = 'normal';
    if (e.altKey) mod = 'clear';
    else if (e.ctrlKey) mod = 'copy';
    else if (e.shiftKey) mod = 'fillEmpty';

    setIsDraggingRange(true);
    setSelectionAnchor({ rowIdx, colIdx: d, status: mod === 'clear' ? 'OFF' : status });
    setSelectionCurrent({ rowIdx, colIdx: d });
    setDragModifier(mod);
  };

  const handleCellMouseEnter = (rowIdx: number, d: number) => {
    if (isDraggingRange) {
      setSelectionCurrent({ rowIdx, colIdx: d });
    }
  };

  const toggleSummaryPanel = (key: string) => {
    if (collapsedSummaryPanels.includes(key)) {
      setCollapsedSummaryPanels(collapsedSummaryPanels.filter(p => p !== key));
    } else {
      setCollapsedSummaryPanels([...collapsedSummaryPanels, key]);
    }
  };

  const prodRateM3 = prodRateM3Prop ?? 25;
  const prodRatePcs = prodRatePcsProp ?? 250;
  const prodUnit = prodUnitProp ?? 'm3';
  const prodRate = prodUnit === 'm3' ? prodRateM3 : prodRatePcs;

  const [editingPmtM3, setEditingPmtM3] = useState<number[]>(() =>
    (pmtM3Prop ?? []).length >= diasCount ? (pmtM3Prop ?? []) : Array(diasCount).fill(0)
  );
  const [editingPmtPcs, setEditingPmtPcs] = useState<number[]>(() =>
    (pmtPcsProp ?? []).length >= diasCount ? (pmtPcsProp ?? []) : Array(diasCount).fill(0)
  );
  const pmtData = prodUnit === 'm3'
    ? (editingPmtM3.length >= diasCount ? editingPmtM3 : Array(diasCount).fill(0))
    : (editingPmtPcs.length >= diasCount ? editingPmtPcs : Array(diasCount).fill(0));

  useEffect(() => { setEditingPmtM3((pmtM3Prop ?? []).length >= diasCount ? (pmtM3Prop ?? []) : Array(diasCount).fill(0)); }, [pmtM3Prop, diasCount]);
  useEffect(() => { setEditingPmtPcs((pmtPcsProp ?? []).length >= diasCount ? (pmtPcsProp ?? []) : Array(diasCount).fill(0)); }, [pmtPcsProp, diasCount]);

  const updatePmtM3Data = (val: number[]) => {
    setEditingPmtM3(val);
    onPmtM3Change?.(val);
  };
  const updatePmtPcsData = (val: number[]) => {
    setEditingPmtPcs(val);
    onPmtPcsChange?.(val);
  };
  const updateProdUnit = (unit: 'm3' | 'pcs') => {
    onProdRateChange?.(prodRateM3, prodRatePcs, unit);
  };

  // Team manager modal
  const [showTeamManager, setShowTeamManager] = useState(false);
  const [isImportPmtOpen, setIsImportPmtOpen] = useState(false);
  const [isImportDemandaOpen, setIsImportDemandaOpen] = useState(false);
  const [importDemandaActiveShift, setImportDemandaActiveShift] = useState<'T1' | 'T2' | 'T3'>('T1');

  const [editingDemandaM3, setEditingDemandaM3] = useState<{ [key: string]: number[] }>(() =>
    demandaDiariaM3Prop ?? { T1: Array(diasCount).fill(0), T2: Array(diasCount).fill(0), T3: Array(diasCount).fill(0) }
  );
  const [editingDemandaPcs, setEditingDemandaPcs] = useState<{ [key: string]: number[] }>(() =>
    demandaDiariaPcsProp ?? { T1: Array(diasCount).fill(0), T2: Array(diasCount).fill(0), T3: Array(diasCount).fill(0) }
  );

  useEffect(() => { if (demandaDiariaM3Prop) setEditingDemandaM3(demandaDiariaM3Prop); }, [demandaDiariaM3Prop]);
  useEffect(() => { if (demandaDiariaPcsProp) setEditingDemandaPcs(demandaDiariaPcsProp); }, [demandaDiariaPcsProp]);

  const demandaDiaria = prodUnit === 'm3' ? editingDemandaM3 : editingDemandaPcs;

  const capacityStats = useMemo(() => {
    const baseT1 = selectedShifts.includes('T1') ? (params?.conferentesT1 ?? 0) : 0;
    const baseT2 = selectedShifts.includes('T2') ? (params?.conferentesT2 ?? 0) : 0;
    const baseT3 = selectedShifts.includes('T3') ? (params?.conferentesT3 ?? 0) : 0;
    const baseHC = baseT1 + baseT2 + baseT3;

    // Use the actual escala length from current colaboradores so both metrics
    // always reference the same number of days (avoids flicker on month change)
    const efectiveDias = colaboradores.length > 0
      ? colaboradores[0].escala.length
      : diasCount;

    const capacidadeTeorica = baseHC * prodRate * efectiveDias;

    let totalWorkDays = 0;
    let totalOffDays = 0;
    const activeColabs = colaboradores.filter(c => selectedShifts.includes(c.turno));
    const activeColabsCount = activeColabs.length;

    activeColabs.forEach(c => {
      c.escala.slice(0, efectiveDias).forEach(status => {
        if (status === 'WORK') {
          totalWorkDays++;
        } else if (status === 'OFF') {
          totalOffDays++;
        }
      });
    });

    const avgWorkDays = activeColabsCount > 0 ? Math.round(totalWorkDays / activeColabsCount) : 0;
    const avgOffDays = activeColabsCount > 0 ? Math.round(totalOffDays / activeColabsCount) : 0;

    const capacidadeReal = totalWorkDays * prodRate;

    const perdaCapacidade = capacidadeTeorica > 0
      ? ((capacidadeReal - capacidadeTeorica) / capacidadeTeorica) * 100
      : 0;

    // Dimensionamento e Ociosidade Lógica:
    const capacidadePorColab = baseHC > 0 ? (capacidadeReal / baseHC) : 0;
    const pmtTotal = pmtData.reduce((a, b) => a + b, 0);
    const colabsNecessarios = capacidadePorColab > 0 ? Math.ceil(pmtTotal / capacidadePorColab) : 0;
    const colabsExcedentes = baseHC - colabsNecessarios;
    const percentualOciosidade = baseHC > 0 ? (colabsExcedentes / baseHC) * 100 : 0;

    // Status da Operação Lógica:
    let opStatus = "Capacidade Total Utilizada";
    let opStatusColor = "amber";
    let opAbsolute = 0;
    let opPercent = 0;

    if (pmtTotal < capacidadeReal) {
      opStatus = "Ganho de Capacidade";
      opStatusColor = "emerald";
      opAbsolute = capacidadeReal - pmtTotal;
      opPercent = capacidadeReal > 0 ? (opAbsolute / capacidadeReal) * 100 : 0;
    } else if (pmtTotal > capacidadeReal) {
      opStatus = "Perda de Capacidade";
      opStatusColor = "red";
      opAbsolute = pmtTotal - capacidadeReal;
      opPercent = capacidadeReal > 0 ? (opAbsolute / capacidadeReal) * 100 : 0;
    }

    return {
      capacidadeTeorica,
      capacidadeReal,
      perdaCapacidade: Math.round(perdaCapacidade * 10) / 10,
      avgWorkDays,
      avgOffDays,
      capacidadePorColab,
      colabsNecessarios,
      colabsExcedentes,
      percentualOciosidade,
      baseHC,
      opStatus,
      opStatusColor,
      opAbsolute,
      opPercent,
    };
  }, [colaboradores, params, prodRate, diasCount, selectedShifts, pmtData]);


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

  const capacity = useMemo(() => {
    const calcOp = {
      ...operation,
      prodRate,
      unit: prodUnit,
    };
    return computeCapacity({
      colaboradores,
      operation: calcOp,
      month: month ?? 0,
      year: year ?? 2026,
      demanda: demandaDiaria,
    });
  }, [colaboradores, operation, prodRate, prodUnit, month, year, demandaDiaria]);

  const monthLabel = month !== undefined && year !== undefined
    ? `${['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][month]}/${year}`
    : '';

  const handleDemandaChange = (shift: string, dayIdx: number, val: number) => {
    if (prodUnit === 'm3') {
      const newDemanda = { ...editingDemandaM3 };
      if (!newDemanda[shift]) newDemanda[shift] = Array(diasCount).fill(0);
      newDemanda[shift][dayIdx] = val;
      setEditingDemandaM3(newDemanda);
      if (onDemandaChangeM3) onDemandaChangeM3(newDemanda);
    } else {
      const newDemanda = { ...editingDemandaPcs };
      if (!newDemanda[shift]) newDemanda[shift] = Array(diasCount).fill(0);
      newDemanda[shift][dayIdx] = val;
      setEditingDemandaPcs(newDemanda);
      if (onDemandaChangePcs) onDemandaChangePcs(newDemanda);
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

  // Sort groups: T3 first, then T1, then T2; inside each shift, by team order in config
  const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => {
    const shiftOrder: { [key: string]: number } = { '3º Turno (T3)': 1, '1º Turno (T1)': 2, '2º Turno (T2)': 3 };
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
      const orderA = a.turno === 'T3' ? 1 : a.turno === 'T1' ? 2 : 3;
      const orderB = b.turno === 'T3' ? 1 : b.turno === 'T1' ? 2 : 3;
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

  const isFirstGroupsLoad = React.useRef(true);
  useEffect(() => {
    if (isFirstGroupsLoad.current && sortedGroups.length > 0) {
      setCollapsedGroups(sortedGroups.map(g => g.key));
      isFirstGroupsLoad.current = false;
    }
  }, [sortedGroups]);

  const renderedColaboradores = useMemo(() => {
    if (viewMode === 'grouped') {
      return sortedGroups.flatMap(g => g.members);
    }
    return sortedColaboradoresConsolidated;
  }, [viewMode, sortedGroups, sortedColaboradoresConsolidated]);

  const colabRowIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    renderedColaboradores.forEach((c, idx) => map.set(c.id, idx));
    return map;
  }, [renderedColaboradores]);

  const handleMouseUp = useCallback(() => {
    if (isDraggingRange && selectionAnchor && selectionCurrent) {
      const minRow = Math.min(selectionAnchor.rowIdx, selectionCurrent.rowIdx);
      const maxRow = Math.max(selectionAnchor.rowIdx, selectionCurrent.rowIdx);
      const minCol = Math.min(selectionAnchor.colIdx, selectionCurrent.colIdx);
      const maxCol = Math.max(selectionAnchor.colIdx, selectionCurrent.colIdx);

      const sourceVal = selectionAnchor.status;

      if (onUpdateColaboradores) {
        const updated = [...colaboradores];
        
        for (let r = minRow; r <= maxRow; r++) {
          const colab = renderedColaboradores[r];
          if (!colab) continue;
          const globalIdx = updated.findIndex(c => c.id === colab.id);
          if (globalIdx !== -1) {
            const newEscala = [...updated[globalIdx].escala];
            for (let cCol = minCol; cCol <= maxCol; cCol++) {
              if (cCol >= 0 && cCol < newEscala.length) {
                if (dragModifier === 'clear') {
                  newEscala[cCol] = 'OFF';
                } else if (dragModifier === 'fillEmpty') {
                  if (newEscala[cCol] === 'OFF') {
                    newEscala[cCol] = sourceVal;
                  }
                } else {
                  newEscala[cCol] = sourceVal;
                }
              }
            }
            updated[globalIdx] = { ...updated[globalIdx], escala: newEscala };
          }
        }
        onUpdateColaboradores(updated);
      }
    }
    setIsDraggingRange(false);
    setSelectionAnchor(null);
    setSelectionCurrent(null);
  }, [isDraggingRange, selectionAnchor, selectionCurrent, dragModifier, colaboradores, renderedColaboradores, onUpdateColaboradores]);

  useEffect(() => {
    const onGlobalMouseUp = () => {
      if (isDraggingRange) {
        handleMouseUp();
      }
    };
    window.addEventListener('mouseup', onGlobalMouseUp);
    return () => window.removeEventListener('mouseup', onGlobalMouseUp);
  }, [isDraggingRange, handleMouseUp]);

  const isCellInSelection = (rowIdx: number, d: number) => {
    if (!isDraggingRange || !selectionAnchor || !selectionCurrent) return false;
    const minRow = Math.min(selectionAnchor.rowIdx, selectionCurrent.rowIdx);
    const maxRow = Math.max(selectionAnchor.rowIdx, selectionCurrent.rowIdx);
    const minCol = Math.min(selectionAnchor.colIdx, selectionCurrent.colIdx);
    const maxCol = Math.max(selectionAnchor.colIdx, selectionCurrent.colIdx);
    return rowIdx >= minRow && rowIdx <= maxRow && d >= minCol && d <= maxCol;
  };

  // Group / Team level drag and drop states and handlers
  const [isGroupDragging, setIsGroupDragging] = useState(false);
  const [dragGroupKey, setDragGroupKey] = useState<string | null>(null);
  const [dragGroupStartDay, setDragGroupStartDay] = useState<number | null>(null);
  const [dragGroupCurrentDay, setDragGroupCurrentDay] = useState<number | null>(null);
  const [dragGroupAction, setDragGroupAction] = useState<'WORK' | 'OFF'>('WORK');

  const handleGroupMouseDown = (groupKey: string, d: number, e: React.MouseEvent) => {
    e.preventDefault();
    const group = sortedGroups.find(g => g.key === groupKey);
    if (!group) return;
    const action: 'WORK' | 'OFF' = e.altKey ? 'OFF' : 'WORK';

    setIsGroupDragging(true);
    setDragGroupKey(groupKey);
    setDragGroupStartDay(d);
    setDragGroupCurrentDay(d);
    setDragGroupAction(action);
  };

  const handleGroupMouseEnter = (groupKey: string, d: number) => {
    if (isGroupDragging && dragGroupKey === groupKey) {
      setDragGroupCurrentDay(d);
    }
  };

  const handleGroupMouseUp = useCallback(() => {
    if (isGroupDragging && dragGroupKey !== null && dragGroupStartDay !== null && dragGroupCurrentDay !== null) {
      const minD = Math.min(dragGroupStartDay, dragGroupCurrentDay);
      const maxD = Math.max(dragGroupStartDay, dragGroupCurrentDay);
      const group = sortedGroups.find(g => g.key === dragGroupKey);

      if (group && onUpdateColaboradores) {
        const updated = [...colaboradores];
        const memberIds = new Set(group.members.map(m => m.id));

        for (let i = 0; i < updated.length; i++) {
          if (memberIds.has(updated[i].id)) {
            const newEscala = [...updated[i].escala];
            for (let d = minD; d <= maxD; d++) {
              if (d >= 0 && d < newEscala.length) {
                const dw = (startDayOfWeek + d) % 7;
                const isRestricted = updated[i].restrictions && (
                  (updated[i].restrictions?.noSaturdays && dw === 5) ||
                  (updated[i].restrictions?.noSundays && dw === 6) ||
                  (updated[i].restrictions?.ferias ?? []).some(r => d >= r.from && d <= r.to) ||
                  (updated[i].restrictions?.afastamentos ?? []).some(r => d >= r.from && d <= r.to)
                );
                if (!isRestricted) {
                  newEscala[d] = dragGroupAction;
                }
              }
            }
            updated[i] = { ...updated[i], escala: newEscala };
          }
        }
        onUpdateColaboradores(updated);
      }
    }
    setIsGroupDragging(false);
    setDragGroupKey(null);
    setDragGroupStartDay(null);
    setDragGroupCurrentDay(null);
  }, [isGroupDragging, dragGroupKey, dragGroupStartDay, dragGroupCurrentDay, dragGroupAction, sortedGroups, colaboradores, onUpdateColaboradores, startDayOfWeek]);

  useEffect(() => {
    const onGlobalGroupMouseUp = () => {
      if (isGroupDragging) {
        handleGroupMouseUp();
      }
    };
    window.addEventListener('mouseup', onGlobalGroupMouseUp);
    return () => window.removeEventListener('mouseup', onGlobalGroupMouseUp);
  }, [isGroupDragging, handleGroupMouseUp]);

  const isGroupCellInSelection = (groupKey: string, d: number) => {
    if (!isGroupDragging || dragGroupKey !== groupKey || dragGroupStartDay === null || dragGroupCurrentDay === null) return false;
    const minD = Math.min(dragGroupStartDay, dragGroupCurrentDay);
    const maxD = Math.max(dragGroupStartDay, dragGroupCurrentDay);
    return d >= minD && d <= maxD;
  };

  // Helper to render employee row
  const renderColaboradorRow = (colab: Colaborador) => {
    const rowIdx = colabRowIndexMap.get(colab.id) ?? 0;
    const diasTrabalhados = colab.escala.filter(status => status === 'WORK').length;
    const teamInfo = getTeamInfo(colab, teams);
    const shiftColorKey = colab.turno === 'T1' ? 'emerald' : colab.turno === 'T2' ? 'amber' : 'indigo';
    const colors = TEAM_COLOR_MAP[teamInfo.name === 'Sem Equipe' ? 'gray' : shiftColorKey];
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

          const inSelection = isCellInSelection(rowIdx, d);
          
          return (
            <td
              key={d}
              onMouseDown={(e) => handleCellMouseDown(colab.id, rowIdx, d, status, e)}
              onMouseEnter={() => handleCellMouseEnter(rowIdx, d)}
              className={`p-0.5 text-center select-none ${
                isSun 
                  ? 'bg-slate-50/10 dark:bg-slate-900/5 border-r-2 border-slate-300 dark:border-slate-700' 
                  : isSat 
                    ? 'bg-slate-50/10 dark:bg-slate-900/5 border-r border-slate-200 dark:border-slate-800' 
                    : 'border-r border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex justify-center relative">
                {colab.turno === 'T3' && isWorking && (
                  <span 
                    className="absolute -left-[5px] top-1/2 -translate-y-1/2 text-orange-500 font-black text-[12px] pointer-events-none select-none leading-none"
                    title="Este turno (T3) inicia às 22:00 da noite anterior"
                  >
                    ←
                  </span>
                )}
                <span
                  onClick={() => {
                    if (!isDraggingRange) handleToggleDay(colab.id, d);
                  }}
                  className={`w-[19px] h-[19px] rounded-md flex items-center justify-center font-black text-[9px] transition-all border ${
                    isDraggingRange ? 'cursor-grabbing' : 'cursor-pointer hover:scale-110'
                  } active:scale-95 select-none ${
                    inSelection ? 'ring-2 ring-blue-500 border-blue-600 opacity-85 shadow-md scale-105' : ''
                  } ${
                    isWorking
                      ? teamInfo.name === 'Sem Equipe'
                        ? 'bg-slate-300 text-slate-650 border-slate-450 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                        : `${TEAM_COLOR_MAP[shiftColorKey].badge} text-white border-slate-800/10`
                      : 'bg-slate-100 text-slate-400 border-slate-200/60 dark:bg-slate-900/40 dark:text-slate-600 dark:border-slate-800'
                  }`}
                  title={isWorking ? `Clique para dar Folga ao ${colab.id}` : `Clique para escalar o ${colab.id}`}
                >
                  {isWorking ? (teamInfo.name === 'Sem Equipe' ? '—' : colab.turno) : 'F'}
                </span>
                {inSelection && rowIdx === selectionCurrent?.rowIdx && d === selectionCurrent?.colIdx && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-30 bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap pointer-events-none">
                    {dragModifier === 'clear' ? 'Apagando' : selectionAnchor?.status === 'WORK' ? 'Trabalho' : 'Folga'}
                  </div>
                )}
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
                Calendário de Planejamento ({diasCount} Dias)
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
        
      </div>


      {/* Painel de Capacidade & Produtividade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6 noprint">
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
                  onClick={() => updateProdUnit('m3')}
                  className={`px-2 py-0.5 rounded-md text-[9px] font-black transition cursor-pointer ${
                    prodUnit === 'm3'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  m³
                </button>
                <button
                  onClick={() => updateProdUnit('pcs')}
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
                  onProdRateChange?.(val, prodRatePcs, 'm3');
                } else {
                  onProdRateChange?.(prodRateM3, val, 'pcs');
                }
              }}
              className="w-20 text-lg font-black text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-center"
            />
            <span className="text-slate-500 dark:text-slate-400 font-extrabold text-[11px]">
              {prodUnit === 'm3' ? 'm³/dia' : 'Pçs/dia'}
            </span>
          </div>
        </div>

        {/* Card 2: PMT */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <h5 className="text-[9px] font-black text-slate-450 dark:text-slate-555 uppercase tracking-wider">PMT</h5>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-800 dark:text-slate-100">
                  {pmtData.reduce((a, b) => a + b, 0).toLocaleString('pt-BR')}
                </span>
                <span className="text-xs font-bold text-slate-400">{prodUnit === 'm3' ? 'm³' : 'Pçs'}</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 px-2 py-1 rounded-xl text-xs text-slate-600 dark:text-slate-350 font-bold" title="Colaboradores necessários">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{capacityStats.colabsNecessarios}</span>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
            {capacityStats.avgWorkDays > 0 ? (
              prodUnit === 'm3' ? (
                <>
                  <div className="font-bold text-slate-700 dark:text-slate-350">
                    Média: {Math.round(editingPmtM3.reduce((a, b) => a + b, 0) / capacityStats.avgWorkDays).toLocaleString('pt-BR')} m³/dia em {capacityStats.avgWorkDays} dias
                  </div>
                  <div className="text-[9px] text-slate-400">
                    Média Pçs: {Math.round(editingPmtPcs.reduce((a, b) => a + b, 0) / capacityStats.avgWorkDays).toLocaleString('pt-BR')} Pçs/dia
                  </div>
                </>
              ) : (
                <>
                  <div className="font-bold text-slate-700 dark:text-slate-350">
                    Média: {Math.round(editingPmtPcs.reduce((a, b) => a + b, 0) / capacityStats.avgWorkDays).toLocaleString('pt-BR')} Pçs/dia em {capacityStats.avgWorkDays} dias
                  </div>
                  <div className="text-[9px] text-slate-400">
                    Média m³: {Math.round(editingPmtM3.reduce((a, b) => a + b, 0) / capacityStats.avgWorkDays).toLocaleString('pt-BR')} m³/dia
                  </div>
                </>
              )
            ) : (
              <div className="font-bold text-slate-400">Nenhum dia de trabalho na escala</div>
            )}
          </div>
          <p className="text-[9px] text-slate-400/80 mt-2">
            Média obtida dividindo o PMT total pelos dias de trabalho na escala
          </p>
        </div>

        {/* Card 3: Capacidade com Folgas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <h5 className="text-[9px] font-black text-slate-450 dark:text-slate-555 uppercase tracking-wider">Capacidade com Folgas</h5>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-blue-600 dark:text-blue-400">{capacityStats.capacidadeReal.toLocaleString('pt-BR')}</span>
                <span className="text-xs font-bold text-blue-400">{prodUnit === 'm3' ? 'm³' : 'Pçs'}</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 px-2 py-1 rounded-xl text-xs text-slate-600 dark:text-slate-350 font-bold" title="Total de colaboradores escalados">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{capacityStats.baseHC}</span>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
            <div className="font-bold text-slate-700 dark:text-slate-350">
              Escala: {capacityStats.avgWorkDays} dias trabalhados
            </div>
            <div className="text-[9px] text-slate-400">
              Folgas: {capacityStats.avgOffDays} folgas no mês
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Capacidade real de atendimento</span>
          </div>
        </div>

        {/* Card 4: Perda de Capacidade */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <h5 className="text-[9px] font-black text-slate-450 dark:text-slate-555 uppercase tracking-wider">Status da Operação</h5>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="text-xl">
                {capacityStats.opStatusColor === 'emerald' ? '🟢' : capacityStats.opStatusColor === 'red' ? '🔴' : '🟡'}
              </span>
              <span className={`text-[12px] font-black uppercase tracking-wider leading-tight ${
                capacityStats.opStatusColor === 'emerald'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : capacityStats.opStatusColor === 'red'
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-amber-500 dark:text-amber-400'
              }`}>
                {capacityStats.opStatus}
              </span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium space-y-1">
            <div>
              {capacityStats.opStatusColor === 'emerald' ? 'Excesso/Ganho' : capacityStats.opStatusColor === 'red' ? 'Defasagem/Perda' : 'Diferença'}:{' '}
              <span className="font-bold text-slate-700 dark:text-slate-350">
                {capacityStats.opAbsolute.toLocaleString('pt-BR')} {prodUnit === 'm3' ? 'm³' : 'Pçs'}
              </span>
            </div>
            <div>
              Percentual:{' '}
              <span className={`font-bold ${
                capacityStats.opStatusColor === 'emerald'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : capacityStats.opStatusColor === 'red'
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-amber-500 dark:text-amber-400'
              }`}>
                {capacityStats.opPercent.toFixed(2)}%
              </span>
            </div>
          </div>
          <p className="text-[9px] text-slate-400/80 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
            Comparação da capacidade real com o PMT do mês
          </p>
        </div>

        {/* Card 5: Dimensionamento de Equipe */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </span>
                <h5 className="text-[9px] font-black text-slate-450 dark:text-slate-555 uppercase tracking-wider">Dimensionamento</h5>
              </div>
            </div>
            <div className="flex items-baseline gap-1 mt-3">
              <span className={`text-3xl font-black ${capacityStats.colabsExcedentes >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                {capacityStats.colabsExcedentes >= 0 ? `+${capacityStats.colabsExcedentes}` : capacityStats.colabsExcedentes}
              </span>
              <span className="text-xs font-bold text-slate-400 ml-1">colabs excedentes</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium space-y-1">
            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-350">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Total de colaboradores: <span className="font-bold">{capacityStats.baseHC}</span></span>
            </div>
            <div>
              Capac. mensal/colab: <span className="font-bold text-slate-700 dark:text-slate-350">{Math.round(capacityStats.capacidadePorColab).toLocaleString('pt-BR')} {prodUnit === 'm3' ? 'm³' : 'Pçs'}</span>
            </div>
            <div>
              Necessários: <span className="font-bold text-slate-700 dark:text-slate-350">{capacityStats.colabsNecessarios} colabs</span>
            </div>
            <div>
              {capacityStats.colabsExcedentes >= 0 ? (
                <>Ociosidade: <span className="font-bold text-emerald-600 dark:text-emerald-400">{capacityStats.percentualOciosidade.toFixed(1)}%</span></>
              ) : (
                <>Sobrecarga: <span className="font-bold text-red-500 dark:text-red-400">{Math.abs(capacityStats.percentualOciosidade).toFixed(1)}%</span></>
              )}
            </div>
          </div>
          <p className="text-[9px] text-slate-400/80 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
            Cálculo dinâmico baseado na escala e PMT do mês
          </p>
        </div>
      </div>

      {/* Capacidade Calculada (T3 · T1 · T2) Card inserted between strip and table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <span className="p-1 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
              <Gauge className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </span>
            Capacidade Calculada (T3 · T1 · T2)
          </h4>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{monthLabel}</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {capacity.shifts.map(sc => (
            <div key={sc.shift} className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/50">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded text-white ${sc.shift === 'T1' ? 'bg-emerald-600' : sc.shift === 'T2' ? 'bg-amber-500' : 'bg-indigo-600'}`}>{sc.shift}</span>
                <span className="text-[9px] text-slate-400 font-bold">{sc.memberCount} colab</span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg font-black text-slate-800 dark:text-slate-100">{Math.round(sc.capacidadeDisponivel).toLocaleString('pt-BR')}</span>
                <span className="text-[10px] text-slate-400">{prodUnit === 'm3' ? 'm³' : 'Pçs'}</span>
              </div>
              <div className="text-[9px] text-slate-400 mt-1 space-y-0.5">
                <div>Trab: <strong className="text-slate-700 dark:text-slate-300">{sc.diasTrabalhados}d</strong></div>
                <div>Folga: <strong className="text-slate-700 dark:text-slate-300">{sc.diasFolga}d</strong></div>
                <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span>Cobert.:</span>
                  <strong className={`${sc.cobertura >= 100 ? 'text-emerald-600' : sc.cobertura >= 80 ? 'text-amber-600' : 'text-red-500'}`}>
                    {sc.cobertura}%
                  </strong>
                </div>
              </div>
            </div>
          ))}
          <div className="p-3 rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/30 lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider">Total Geral</span>
                <Activity className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-blue-700 dark:text-blue-400">{Math.round(capacity.totalCapacidade).toLocaleString('pt-BR')}</span>
                <span className="text-[10px] text-blue-500">{prodUnit === 'm3' ? 'm³' : 'Pçs'}</span>
              </div>
              <div className="text-[9px] text-slate-600 dark:text-slate-400 mt-1 space-y-0.5">
                <div>Capacidade após folgas: <strong className="text-slate-700 dark:text-slate-300">{Math.round(capacity.capacidadeApósFolgas).toLocaleString('pt-BR')}</strong></div>
                <div>Necessidade: <strong className="text-slate-700 dark:text-slate-300">{Math.round(capacity.totalNecessidade).toLocaleString('pt-BR')}</strong></div>
                <div className="flex items-center justify-between gap-1 pt-1 border-t border-blue-200/50 dark:border-blue-800/50">
                  <span>Saldo</span>
                  <strong className={capacity.totalSaldo >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                    {capacity.totalSaldo >= 0 ? '+' : ''}{Math.round(capacity.totalSaldo).toLocaleString('pt-BR')}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span>Cobertura Geral</span>
                  <strong className={`${capacity.coberturaGeral >= 100 ? 'text-emerald-600' : capacity.coberturaGeral >= 80 ? 'text-amber-600' : 'text-red-500'}`}>
                    {capacity.coberturaGeral}%
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <OperationConfigPanel
          operation={operation}
          onChange={setOperation}
          onGerarEscala={() => {
            const monthVal = month ?? 0;
            const yearVal = year ?? 2026;
            console.log("[DEBUG onGerarEscala] Input colaboradores count:", colaboradores.length);
            console.log("[DEBUG onGerarEscala] Input teams:", teams);
            const result = generateIntelligentScale(
              operation,
              teams,
              colaboradores,
              monthVal,
              yearVal,
              demandaDiaria,
              params?.maxConsecutiveWorkDays,
              params?.rotationSequence
            );
            console.log("[DEBUG onGerarEscala] Output colaboradores count:", result.colaboradores.length);
            onUpdateColaboradores?.(result.colaboradores);
            onUpdateTeams?.(result.teams);
          }}
          // Grid Controls
          viewMode={viewMode}
          setViewMode={setViewMode}
          collapsedGroups={collapsedGroups}
          expandAll={expandAll}
          collapseAll={collapseAll}
          sortedGroupsLength={sortedGroups.length}
          selectedShifts={selectedShifts}
          toggleShift={toggleShift}
          selectAll={selectAll}
          selectNone={selectNone}
          setShowTeamManager={setShowTeamManager}
          // ScenarioManager
          teams={teams}
          params={params}
          colaboradores={colaboradores}
          dadosMensais={dadosMensais}
          prodRateM3={prodRateM3}
          prodRatePcs={prodRatePcs}
          prodUnit={prodUnit}
          activeScenarioName={activeScenarioName}
          activeScenarioId={activeScenarioId}
          isScenarioDirty={isScenarioDirty}
          onScenarioSaved={onScenarioSaved}
          onLoadScenario={onLoadScenario}
        />
      </div>

      <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse text-[10px] table-fixed">
          <colgroup>
            <col className="w-[125px] min-w-[125px]" />
            {Array.from({ length: diasCount }).map((_, d) => (
              <col key={d} className="w-auto" />
            ))}
            <col className="w-[80px] min-w-[80px]" />
          </colgroup>
          <thead>
            {/* Week divider row */}
            <tr className="bg-slate-100 dark:bg-slate-900/60 text-[10px] font-black text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800">
              <th className="p-1.5 sticky left-0 z-20 bg-slate-100 dark:bg-slate-900 w-[125px] min-w-[125px] border-r border-slate-200 dark:border-slate-800 align-middle">
                {params && onParamsChange ? (
                  <MonthNavigator
                    month={params.month}
                    year={params.year}
                    onChangeMonthYear={(newM, newY, calculatedDays, calculatedWeeks) => {
                      onParamsChange({
                        ...params,
                        month: newM,
                        year: newY,
                        dias: calculatedDays,
                        weeks: calculatedWeeks,
                      });
                    }}
                    variant="grid"
                  />
                ) : null}
              </th>
              {weeksToRender.map((w, wIdx) => {
                return (
                  <th key={wIdx} colSpan={w.colSpan} className="p-1 text-center border-r-2 border-slate-300 dark:border-slate-700 font-extrabold tracking-wider text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40">
                    {w.colSpan <= 2 ? (
                      <span className="text-[9px] font-black uppercase text-slate-650 dark:text-slate-300">
                        {w.label}
                      </span>
                    ) : (
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-[9px] font-black uppercase text-slate-700 dark:text-slate-300">
                        {w.label}
                      </span>
                    )}
                  </th>
                );
              })}
              <th className="p-1 text-center bg-slate-150 dark:bg-slate-900/80 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-black w-[80px] min-w-[80px] uppercase text-[9px]">
                Resumo
              </th>
            </tr>
            <tr className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <th className="p-1.5 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300 w-[125px] min-w-[125px] text-[10px]">
                Colaborador
              </th>
              {Array.from({ length: diasCount }).map((_, d) => {
                const dayOfWeek = (startDayOfWeek + d) % 7;
                const isSat = dayOfWeek === 5;
                const isSun = dayOfWeek === 6;
                const weekdayName = WEEKDAYS[dayOfWeek];
                const labelInfo = (month !== undefined && month !== -1 && year !== undefined)
                  ? getDayLabel(year, month, d)
                  : { dayStr: String(d + 1).padStart(2, '0'), monthStr: '' };
                
                return (
                  <th
                    key={d}
                    title={labelInfo.monthStr ? `${labelInfo.dayStr}/${labelInfo.monthStr}/${year}` : undefined}
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
                      {labelInfo.dayStr}
                    </div>
                  </th>
                );
              })}
              <th className="p-1.5 text-center bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold border-l border-slate-200 dark:border-slate-800 w-[80px] min-w-[80px] text-[9.5px]">
                Total/Méd.
              </th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {viewMode === 'grouped' ? (
              (() => {
                let lastShift = '';
                return sortedGroups.map((group) => {
                  const isCollapsed = collapsedGroups.includes(group.key);
                  const currentShift = group.members[0]?.turno || '';
                  const showShiftHeader = currentShift !== lastShift;
                  lastShift = currentShift;
                  return (
                    <React.Fragment key={group.key}>
                      {showShiftHeader && (
                        <tr className="bg-slate-100/90 dark:bg-slate-800 border-y border-slate-350 dark:border-slate-700">
                          <td colSpan={diasCount + 2} className="p-2 py-2.5 sticky left-0 z-20 font-black text-[10px] text-slate-850 dark:text-slate-100 uppercase tracking-widest bg-slate-150/70 dark:bg-slate-800 shadow-sm border-r border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${
                                currentShift === 'T1' 
                                  ? 'bg-emerald-500 shadow-emerald-500/50 shadow'
                                  : currentShift === 'T2'
                                    ? 'bg-amber-500 shadow-amber-500/50 shadow'
                                    : 'bg-indigo-500 shadow-indigo-500/50 shadow'
                              }`} />
                              <span className="font-extrabold text-[10.5px] text-slate-800 dark:text-slate-200">{group.shiftLabel}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    {/* Group Header Row */}
                    <tr 
                      className="bg-slate-50/50 dark:bg-slate-900/30 text-[9px] font-extrabold text-slate-600 dark:text-slate-300 transition select-none"
                    >
                      {isCollapsed ? (
                        <>
                          {/* Collapsed Header: First Cell with Chevron */}
                          <td 
                            onClick={() => toggleGroupCollapse(group.key)}
                            className="p-1 sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200 shadow-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <div className="flex items-center gap-1.5 text-[9px] overflow-hidden">
                              <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className={`px-1.5 py-0.5 rounded font-black text-white text-[8.5px] shrink-0 ${
                                currentShift === 'T1' 
                                  ? 'bg-emerald-600 dark:bg-emerald-700'
                                  : currentShift === 'T2'
                                    ? 'bg-amber-600 dark:bg-amber-700'
                                    : 'bg-indigo-600 dark:bg-indigo-700'
                              }`}>
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
                            const inGroupSel = isGroupCellInSelection(group.key, d);
                            
                            return (
                              <td
                                key={d}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  handleGroupMouseDown(group.key, d, e);
                                }}
                                onMouseEnter={(e) => {
                                  e.stopPropagation();
                                  handleGroupMouseEnter(group.key, d);
                                }}
                                className={`p-0.5 text-center text-[9px] font-black bg-slate-50/20 dark:bg-slate-900/10 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 select-none cursor-grab active:cursor-grabbing ${
                                  inGroupSel ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/40' : ''
                                } ${
                                  isSun 
                                    ? 'border-r-2 border-slate-350 dark:border-slate-700' 
                                    : isSat 
                                      ? 'border-r border-slate-200 dark:border-slate-800' 
                                      : 'border-r border-slate-200 dark:border-slate-800'
                                }`}
                              >
                                <div className="flex justify-center relative">
                                  {currentShift === 'T3' && count > 0 && (
                                    <span 
                                      className="absolute -left-[5px] top-1/2 -translate-y-1/2 text-orange-500 font-black text-[12px] pointer-events-none select-none leading-none"
                                      title="Este turno (T3) inicia às 22:00 da noite anterior"
                                    >
                                      ←
                                    </span>
                                  )}
                                  {count > 0 ? (
                                    <span className={`w-[19px] h-[19px] rounded-full flex items-center justify-center font-black text-[9px] text-white shadow-sm ${
                                      inGroupSel ? 'ring-2 ring-white scale-110' : ''
                                    } ${
                                      currentShift === 'T1' 
                                        ? 'bg-emerald-600 dark:bg-emerald-700'
                                        : currentShift === 'T2'
                                          ? 'bg-amber-600 dark:bg-amber-700'
                                          : 'bg-indigo-600 dark:bg-indigo-700'
                                    }`}>
                                      {count}
                                    </span>
                                  ) : (
                                    <span className={`w-[19px] h-[19px] flex items-center justify-center text-slate-300 dark:text-slate-700 font-normal ${inGroupSel ? 'text-blue-500 font-bold' : ''}`}>
                                      0
                                    </span>
                                  )}
                                  {inGroupSel && d === dragGroupCurrentDay && (
                                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-30 bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap pointer-events-none">
                                      Aplicando em {group.members.length} colaboradores ({dragGroupAction === 'WORK' ? 'Trabalho' : 'Folga'})
                                    </div>
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
                          <div 
                            onClick={() => toggleGroupCollapse(group.key)}
                            className="sticky left-3 z-10 flex items-center gap-2 cursor-pointer hover:opacity-80 transition"
                          >
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-800 dark:text-slate-200">{group.shiftLabel}</span>
                            <span className="h-3 w-[1px] bg-slate-300 dark:bg-slate-700"></span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-black text-white ${
                              currentShift === 'T1' 
                                ? 'bg-emerald-600 dark:bg-emerald-700'
                                : currentShift === 'T2'
                                  ? 'bg-amber-600 dark:bg-amber-700'
                                  : 'bg-indigo-600 dark:bg-indigo-700'
                            }`}>
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
              });
            })()
          ) : (
              sortedColaboradoresConsolidated.map((colab) => renderColaboradorRow(colab))
            )}

            {/* Nível de Cobertura Diária Row */}
            <tr className="bg-slate-50/50 dark:bg-slate-900/40 border-t-2 border-b border-slate-200 dark:border-slate-800 transition">
              <td className="p-1 sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-800 font-black text-[8.5px] shadow-sm text-slate-700 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">
                Cobertura %
              </td>
              {Array.from({ length: diasCount }).map((_, d) => {
                const activeCount = filteredColaboradores.filter(c => c.escala[d] === 'WORK').length;
                const totalColabs = filteredColaboradores.length;
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
                        const activeCount = filteredColaboradores.filter(c => c.escala[d] === 'WORK').length;
                        const pct = filteredColaboradores.length > 0 ? (activeCount / filteredColaboradores.length) * 100 : 0;
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
                        className={`p-0.5 text-center text-[8px] font-black tracking-tighter whitespace-nowrap text-slate-700 dark:text-slate-300 ${
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
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition">
                  <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-300">
                    Capac. Geral
                  </td>
                  {Array.from({ length: diasCount }).map((_, d) => {
                    const count = colaboradores.filter(c => selectedShifts.includes(c.turno) && c.escala[d] === 'WORK').length;
                    const cap = count * prodRate;
                    const isSun = d % 7 === 6;
                    return (
                      <td
                        key={d}
                        className={`p-0.5 text-center text-[8px] font-black tracking-tighter whitespace-nowrap text-blue-600 dark:text-blue-400 ${
                          isSun 
                            ? 'border-r-2 border-slate-300 dark:border-slate-700' 
                            : 'border-r border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {cap.toLocaleString('pt-BR')}
                      </td>
                    );
                  })}
                  {/* Summary Cell */}
                  <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      <span>{Array.from({ length: diasCount }).map((_, d) => colaboradores.filter(c => selectedShifts.includes(c.turno) && c.escala[d] === 'WORK').length * prodRate).reduce((a, b) => a + b, 0).toLocaleString('pt-BR')}</span>
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
                        className={`p-0.5 text-center text-[8px] font-black tracking-tighter whitespace-nowrap text-slate-700 dark:text-slate-300 ${
                          isSun 
                            ? 'border-r-2 border-slate-300 dark:border-slate-700' 
                            : 'border-r border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {totalDemand.toLocaleString('pt-BR')}
                      </td>
                    );
                  })}
                  <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      <span>{(Array.from({ length: diasCount }).map((_, d) => selectedShifts.reduce((acc, s) => acc + ((demandaDiaria[s] && demandaDiaria[s][d]) || 0), 0)).reduce((a, b) => a + b, 0)).toLocaleString('pt-BR')}</span>
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
                        className={`p-0.5 text-center text-[8px] font-black tracking-tighter whitespace-nowrap ${
                          isSun 
                            ? 'border-r-2 border-slate-300 dark:border-slate-700' 
                            : 'border-r border-slate-200 dark:border-slate-800'
                        } ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-455' : 'text-red-555 dark:text-red-455'}`}
                      >
                        {diff > 0 ? `+${diff.toLocaleString('pt-BR')}` : diff.toLocaleString('pt-BR')}
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
                            <span className={totalSal >= 0 ? 'text-emerald-600 dark:text-emerald-455' : 'text-red-555 dark:text-red-455'}>
                              {totalSal > 0 ? `+${totalSal.toLocaleString('pt-BR')}` : totalSal.toLocaleString('pt-BR')}
                            </span>
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
                        className={`p-0.5 text-center text-[8px] font-black tracking-tighter whitespace-nowrap ${
                          isSun 
                            ? 'border-r-2 border-slate-300 dark:border-slate-700 bg-slate-50/50' 
                            : 'border-r border-slate-200 dark:border-slate-800 bg-slate-50/50'
                        } ${hcDiff >= 0 ? 'text-emerald-600 dark:text-emerald-455' : 'text-red-555 dark:text-red-455'}`}
                      >
                        {hcDiff > 0 ? `+${hcDiff.toLocaleString('pt-BR')}` : hcDiff.toLocaleString('pt-BR')}
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
                        const avgHc = Math.round(totalSal / prodRate / diasCount);
                        return (
                          <>
                            <span className={avgHc >= 0 ? 'text-emerald-600 dark:text-emerald-455' : 'text-red-555 dark:text-red-455'}>
                              {avgHc > 0 ? `+${avgHc.toLocaleString('pt-BR')}` : avgHc.toLocaleString('pt-BR')}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
                {/* PMT Row */}
                <tr className="hover:bg-slate-50/50 transition">
                  <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-violet-700 dark:text-violet-400">
                    <div className="flex items-center justify-start gap-0.5 whitespace-nowrap">
                      <span className="whitespace-nowrap text-[8.5px]">PMT</span>
                      <button
                        onClick={() => setIsImportPmtOpen(true)}
                        className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer text-violet-600 dark:text-violet-400"
                        title="Importar PMT de planilha"
                      >
                        <FileSpreadsheet className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  {Array.from({ length: diasCount }).map((_, d) => {
                    const isSun = d % 7 === 6;
                    return (
                      <td
                        key={d}
                        className={`p-0 text-center ${isSun ? 'border-r-2 border-slate-300 dark:border-slate-700' : 'border-r border-slate-200 dark:border-slate-800'}`}
                      >
                        <input
                          type="number"
                          value={pmtData[d]}
                          onChange={e => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            const next = [...pmtData];
                            next[d] = val;
                            if (prodUnit === 'm3') {
                              updatePmtM3Data(next);
                            } else {
                              updatePmtPcsData(next);
                            }
                          }}
                          className="w-full h-full bg-transparent text-center text-[9px] font-black text-slate-700 dark:text-slate-300 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:bg-violet-50 dark:focus:bg-violet-900/20"
                        />
                      </td>
                    );
                  })}
                  {/* Summary Cell */}
                  <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      <span>{pmtData.reduce((a, b) => a + b, 0).toLocaleString('pt-BR')}</span>
                    </div>
                  </td>
                </tr>
                </>
                )}
              </>
            )}

            {/* Shift Summary Groups */}
            {['T3', 'T1', 'T2'].map((shift) => {
              if (!selectedShifts.includes(shift)) return null;

              const style = {
                T1: { bg: 'bg-emerald-600 dark:bg-emerald-700', label: '1º TURNO (T1)', badge: 'Ativos T1', cap: 'Capac. T1', dem: 'Demand. T1', sal: 'Saldo T1', hc: 'Hc +/- T1' },
                T2: { bg: 'bg-amber-600 dark:bg-amber-700', label: '2º TURNO (T2)', badge: 'Ativos T2', cap: 'Capac. T2', dem: 'Demand. T2', sal: 'Saldo T2', hc: 'Hc +/- T2' },
                T3: { bg: 'bg-indigo-600 dark:bg-indigo-700', label: '3º TURNO (T3)', badge: 'Ativos T3', cap: 'Capac. T3', dem: 'Demand. T3', sal: 'Saldo T3', hc: 'Hc +/- T3' },
              }[shift as 'T1' | 'T2' | 'T3'];

              const isCollapsed = collapsedSummaryPanels.includes(shift);

              return (
                <React.Fragment key={shift}>
                  {/* Visual Shift Header */}
                  <tr 
                    onClick={() => toggleSummaryPanel(shift)}
                    className="bg-slate-50 dark:bg-slate-950 text-[9px] font-extrabold border-t-2 border-slate-200 dark:border-slate-800 cursor-pointer select-none"
                  >
                    <td colSpan={diasCount + 2} className={`p-1.5 px-3 text-white ${style.bg} border-l-4 border-slate-800 shadow-sm`}>
                      <span className="sticky left-3 z-10 flex items-center gap-1.5">
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-white" />
                        )}
                        <span>PAINEL DE TOTAIS: {style.label}</span>
                      </span>
                    </td>
                  </tr>
                  {!isCollapsed && (
                    <>
                      <tr className="hover:bg-slate-50/50 transition">
                        <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-300">
                          {style.badge}
                        </td>
                        {Array.from({ length: diasCount }).map((_, d) => {
                          const count = colaboradores.filter(c => c.turno === shift && c.escala[d] === 'WORK').length;
                          const isSun = d % 7 === 6;
                          const isSat = d % 7 === 5;
                          return (
                            <td
                              key={d}
                              className={`p-0.5 text-center text-[8px] font-black tracking-tighter whitespace-nowrap text-slate-700 dark:text-slate-300 ${
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
                            <span>{Math.round(Array.from({ length: diasCount }).map((_, d) => colaboradores.filter(c => c.turno === shift && c.escala[d] === 'WORK').length).reduce((a, b) => a + b, 0) / diasCount)}</span>
                            <span className="text-[6.5px] text-slate-400 font-normal">Média</span>
                          </div>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 transition">
                        <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-300">
                          {style.cap}
                        </td>
                        {Array.from({ length: diasCount }).map((_, d) => {
                          const count = colaboradores.filter(c => c.turno === shift && c.escala[d] === 'WORK').length;
                          const isSun = d % 7 === 6;
                          const isSat = d % 7 === 5;
                          return (
                            <td
                              key={d}
                              className={`p-0.5 text-center text-[8px] font-black tracking-tighter whitespace-nowrap text-slate-700 dark:text-slate-300 ${
                                isSun 
                                  ? 'border-r-2 border-slate-300 dark:border-slate-700' 
                                  : isSat
                                    ? 'border-r border-slate-200 dark:border-slate-800'
                                    : 'border-r border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              {(count * prodRate).toLocaleString('pt-BR')}
                            </td>
                          );
                        })}
                        {/* Summary Cell */}
                        <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                          <div className="flex flex-col items-center">
                            <span>{(Array.from({ length: diasCount }).map((_, d) => colaboradores.filter(c => c.turno === shift && c.escala[d] === 'WORK').length * prodRate).reduce((a, b) => a + b, 0)).toLocaleString('pt-BR')}</span>
                            <span className="text-[6.5px] text-slate-400 font-normal">TT</span>
                          </div>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 transition">
                        <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-300">
                          <div className="flex items-center justify-start gap-0.5 whitespace-nowrap">
                            <span className="whitespace-nowrap text-[8.5px]">{style.dem}</span>
                            <button
                              onClick={() => {
                                setImportDemandaActiveShift(shift as 'T1' | 'T2' | 'T3');
                                setIsImportDemandaOpen(true);
                              }}
                              className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer text-violet-600 dark:text-violet-400"
                              title={`Importar Demanda para o ${style.dem}`}
                            >
                              <FileSpreadsheet className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        {Array.from({ length: diasCount }).map((_, d) => {
                          const demand = (demandaDiaria[shift] && demandaDiaria[shift][d]) || 0;
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
                                  handleDemandaChange(shift, d, val);
                                }}
                                className="w-full text-center text-[8px] font-extrabold tracking-tighter bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-0.5 py-0.2 focus:outline-none focus:ring-1 focus:ring-slate-400"
                              />
                            </td>
                          );
                        })}
                        {/* Summary Cell */}
                        <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                          <div className="flex flex-col items-center">
                            <span>{((demandaDiaria[shift] || []).reduce((a, b) => a + b, 0)).toLocaleString('pt-BR')}</span>
                            <span className="text-[6.5px] text-slate-400 font-normal">TT</span>
                          </div>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 transition">
                        <td className="p-1 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-[9px] shadow-sm text-slate-700 dark:text-slate-300">
                          {style.sal}
                        </td>
                        {Array.from({ length: diasCount }).map((_, d) => {
                          const count = colaboradores.filter(c => c.turno === shift && c.escala[d] === 'WORK').length;
                          const cap = count * prodRate;
                          const demand = (demandaDiaria[shift] && demandaDiaria[shift][d]) || 0;
                          const diff = cap - demand;
                          const isSun = d % 7 === 6;
                          const isSat = d % 7 === 5;
                          return (
                            <td
                              key={d}
                              className={`p-0.5 text-center text-[8px] font-black tracking-tighter whitespace-nowrap ${
                                isSun 
                                  ? 'border-r-2 border-slate-300 dark:border-slate-700' 
                                  : isSat
                                    ? 'border-r border-slate-200 dark:border-slate-800'
                                    : 'border-r border-slate-200 dark:border-slate-800'
                              } ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
                            >
                              {diff > 0 ? `+${diff.toLocaleString('pt-BR')}` : diff.toLocaleString('pt-BR')}
                            </td>
                          );
                        })}
                        {/* Summary Cell */}
                        <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                          <div className="flex flex-col items-center">
                            {(() => {
                              const totalCap = Array.from({ length: diasCount }).map((_, d) => colaboradores.filter(c => c.turno === shift && c.escala[d] === 'WORK').length * prodRate).reduce((a, b) => a + b, 0);
                              const totalDem = (demandaDiaria[shift] || []).reduce((a, b) => a + b, 0);
                              const totalSal = totalCap - totalDem;
                              return (
                                <>
                                  <span className={totalSal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}>
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
                          {style.hc}
                        </td>
                        {Array.from({ length: diasCount }).map((_, d) => {
                          const count = colaboradores.filter(c => c.turno === shift && c.escala[d] === 'WORK').length;
                          const cap = count * prodRate;
                          const demand = (demandaDiaria[shift] && demandaDiaria[shift][d]) || 0;
                          const diff = cap - demand;
                          const hcDiff = Math.round(diff / prodRate);
                          const isSun = d % 7 === 6;
                          const isSat = d % 7 === 5;
                          return (
                            <td
                              key={d}
                              className={`p-0.5 text-center text-[8px] font-black tracking-tighter whitespace-nowrap ${
                                isSun 
                                  ? 'border-r-2 border-slate-300 dark:border-slate-700 bg-slate-50/50' 
                                  : isSat
                                    ? 'border-r border-slate-200 dark:border-slate-800 bg-slate-50/50'
                                    : 'border-r border-slate-200 dark:border-slate-800'
                              } ${hcDiff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
                            >
                              {hcDiff > 0 ? `+${hcDiff.toLocaleString('pt-BR')}` : hcDiff.toLocaleString('pt-BR')}
                            </td>
                          );
                        })}
                        {/* Summary Cell */}
                        <td className="p-0.5 text-center text-[9px] font-bold bg-slate-50/40 dark:bg-slate-900/20 border-l border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-300">
                          <div className="flex flex-col items-center">
                            {(() => {
                              const totalCap = Array.from({ length: diasCount }).map((_, d) => colaboradores.filter(c => c.turno === shift && c.escala[d] === 'WORK').length * prodRate).reduce((a, b) => a + b, 0);
                              const totalDem = (demandaDiaria[shift] || []).reduce((a, b) => a + b, 0);
                              const totalSal = totalCap - totalDem;
                              const avgHc = Math.round(totalSal / prodRate / diasCount);
                              return (
                                <>
                                  <span className={avgHc >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}>
                                    {avgHc > 0 ? `+${avgHc.toLocaleString('pt-BR')}` : avgHc.toLocaleString('pt-BR')}
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
                </React.Fragment>
              );
            })}

          </tbody>
        </table>
      </div>
    </div>

    {/* WFM Analytics Dashboard below the Grid */}
    <div className="mt-8">
      <WfmIntelligencePanel
        operation={operation}
        onOperationChange={setOperation}
        colaboradores={colaboradores}
        teams={teams}
        params={params ?? { conferentesT1: 14, conferentesT2: 10, conferentesT3: 16, weeks: 4, dias: diasCount, escala: '5x2', consecutiveOffDays: 2, maxConsecutiveSundays: 3, horasSemanais: 42, cenario: 'B', setor: 'comercio', month: month ?? 0, year: year ?? 2026 }}
        demanda={demandaDiaria}
        onGerarEscala={(res) => {
          onUpdateColaboradores?.(res.colaboradores);
          onUpdateTeams?.(res.teams);
        }}
        onUpdateColaboradores={(c) => {
          onUpdateColaboradores?.(c);
        }}
      />
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

    {/* Import PMT Modal */}
    <ImportPmtModal
      isOpen={isImportPmtOpen}
      onClose={() => setIsImportPmtOpen(false)}
      diasCount={diasCount}
      onApplyPmt={(newM3, newPcs) => {
        updatePmtM3Data(newM3);
        updatePmtPcsData(newPcs);
      }}
    />

    {/* Import Demanda Modal */}
    <ImportDemandaModal
      isOpen={isImportDemandaOpen}
      onClose={() => setIsImportDemandaOpen(false)}
      diasCount={diasCount}
      defaultShift={importDemandaActiveShift}
      onApplyDemanda={(shift, newM3, newPcs) => {
        if (prodUnit === 'm3') {
          const updatedM3 = { ...editingDemandaM3, [shift]: newM3 };
          setEditingDemandaM3(updatedM3);
          onDemandaChangeM3?.(updatedM3);
        } else {
          const updatedPcs = { ...editingDemandaPcs, [shift]: newPcs };
          setEditingDemandaPcs(updatedPcs);
          onDemandaChangePcs?.(updatedPcs);
        }
        
        // Let's also update both behind the scenes so the database stores both
        if (onDemandaChangeM3 && onDemandaChangePcs) {
          const updatedM3 = { ...editingDemandaM3, [shift]: newM3 };
          const updatedPcs = { ...editingDemandaPcs, [shift]: newPcs };
          setEditingDemandaM3(updatedM3);
          setEditingDemandaPcs(updatedPcs);
          onDemandaChangeM3(updatedM3);
          onDemandaChangePcs(updatedPcs);
        }
      }}
    />
    </React.Fragment>
  );
};