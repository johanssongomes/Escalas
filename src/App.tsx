import { useState, useEffect, useRef } from 'react';
import { ParametersForm } from './components/Schedule/ParametersForm';
import { CalendarGrid } from './components/Schedule/CalendarGrid';
import { generateSchedule } from './utils/scheduleEngine';
import type { ScheduleParams, Colaborador, TeamConfig, DayStatus, ShiftType } from './types';
import { ShieldCheck, Truck, Moon, Sun, Calendar, BarChart3, Upload } from 'lucide-react';
import { ImportModal } from './components/Schedule/ImportModal';

import { ShiftCards } from './components/Schedule/ShiftCards';
import { CompliancePanel } from './components/Schedule/CompliancePanel';
import { CoverageTable } from './components/Schedule/CoverageTable';
import { ExportActions } from './components/Schedule/ExportActions';
import { Indicators } from './components/Dashboard/Indicators';
import { Charts } from './components/Dashboard/Charts';
import { ShiftTimeline } from './components/Dashboard/ShiftTimeline';
import { calculateDailyCoverage, calculateWeeklyCoverage } from './utils/coverageEngine';
import { calculateIndicators } from './utils/dashboardEngine';
import { fetchConfig, saveConfig } from './utils/apiClient';

function App() {
  const [dbLoading, setDbLoading] = useState<boolean>(true);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState<boolean>(false);
  // Tracks whether valid data was loaded from DB — prevents handleRecalculate from
  // overwriting DB-loaded data due to the isInitialLoadDone effect firing after 800ms
  const dbLoadedRef = useRef(false);

  const [serverOffline, setServerOffline] = useState(false);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      return saved !== null ? saved === 'true' : false;
    }
    return false;
  });
  const [params, setParams] = useState<ScheduleParams>(() => {
    const today = new Date();
    return {
      conferentesT1: 22,
      conferentesT2: 10,
      conferentesT3: 12,
      weeks: 4,
      dias: 28,
      escala: '5x2',
      consecutiveOffDays: 2,
      maxConsecutiveSundays: 3,
      horasSemanais: 42,
      cenario: 'B',
      setor: 'comercio',
      month: today.getMonth(),
      year: today.getFullYear(),
    };
  });

  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);

  const [activeTab, setActiveTab] = useState<'painel' | 'planejador'>('planejador');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [activeScenarioName, setActiveScenarioName] = useState<string | undefined>(undefined);
  const [activeScenarioId, setActiveScenarioId] = useState<number | undefined>(undefined);
  const [isScenarioDirty, setIsScenarioDirty] = useState(false);
  // Ref to skip marking dirty on the very first render after loading a scenario
  const scenarioJustLoadedRef = useRef(0);

  const [teams, setTeams] = useState<TeamConfig[]>([]);

  const [demandaDiariaM3, setDemandaDiariaM3] = useState<{ [key: string]: number[] }>({ T1: Array(28).fill(0), T2: Array(28).fill(0), T3: Array(28).fill(0) });
  const [demandaDiariaPcs, setDemandaDiariaPcs] = useState<{ [key: string]: number[] }>({ T1: Array(28).fill(0), T2: Array(28).fill(0), T3: Array(28).fill(0) });

  const [prodRateM3, setProdRateM3] = useState<number>(25);
  const [prodRatePcs, setProdRatePcs] = useState<number>(250);
  const [prodUnit, setProdUnit] = useState<'m3' | 'pcs'>('m3');
  const prodRateM3Ref = useRef(prodRateM3);
  prodRateM3Ref.current = prodRateM3;
  const prodRatePcsRef = useRef(prodRatePcs);
  prodRatePcsRef.current = prodRatePcs;
  const prodUnitRef = useRef(prodUnit);
  prodUnitRef.current = prodUnit;

  // Accumulates per-month PMT data for PostgreSQL persistence
  const pmtByMonthRef = useRef<Record<string, { m3: number[]; pcs: number[] }>>({});
  // Accumulates per-month demanda data for fast navigation
  const demandaM3ByMonthRef = useRef<Record<string, { [key: string]: number[] }>>({});
  const demandaPcsByMonthRef = useRef<Record<string, { [key: string]: number[] }>>({});

  const [pmtDataM3, setPmtDataM3] = useState<number[]>([]);
  const [pmtDataPcs, setPmtDataPcs] = useState<number[]>([]);

  // Distribute collaborators to teams based on the configured memberCount
  const applyTeamsToColaboradores = (colabs: Colaborador[], newTeams: TeamConfig[], startDay: number, dias: number): Colaborador[] => {
    const result = [...colabs];
    const shifts = ['T1', 'T2', 'T3'] as const;

    for (const shift of shifts) {
      const shiftColabs = result.filter(c => c.turno === shift);
      const shiftTeams = newTeams.filter(t => t.shiftType === shift);

      let cursor = 0;
      for (const team of shiftTeams) {
        const countToAssign = team.memberCount;
        for (let i = 0; i < countToAssign && cursor < shiftColabs.length; i++) {
          const colab = shiftColabs[cursor];
          const pat = team.offPattern;

          const escala = Array.from({ length: dias }, (_, d) => {
            const dw = (startDay + d) % 7;
            if (Array.isArray(pat)) {
              return (dw === pat[0] || dw === pat[1]) ? 'OFF' : 'WORK';
            }
            const isOff = pat === 4 ? (dw === 4 || dw === 5) :
                          pat === 5 ? (dw === 5 || dw === 6) :
                          (dw === 6 || dw === 0);
            return isOff ? 'OFF' : 'WORK';
          }) as Colaborador['escala'];

          const colabIdx = result.findIndex(c => c.id === colab.id);
          if (colabIdx !== -1) {
            result[colabIdx] = {
              ...result[colabIdx],
              team: team.name,
              escala
            };
          }
          cursor++;
        }
      }

      while (cursor < shiftColabs.length) {
        const colab = shiftColabs[cursor];
        const colabIdx = result.findIndex(c => c.id === colab.id);
        if (colabIdx !== -1) {
          result[colabIdx] = {
            ...result[colabIdx],
            team: undefined,
            escala: Array(dias).fill('WORK' as DayStatus)
          };
        }
        cursor++;
      }
    }

    return result;
  };

  // State wrappers to automatically set the dirty flag on user edits
  const handleParamsChange = (newParams: ScheduleParams | ((prev: ScheduleParams) => ScheduleParams)) => {
    const resolved = typeof newParams === 'function' ? newParams(params) : newParams;
    // Detect month/year change and persist/load colaboradores in the SAME render
    if (isInitialLoadDone && resolved.month !== undefined && resolved.month >= 0 &&
        (resolved.month !== params.month || resolved.year !== params.year)) {
      const mesesData = { ...(params.meses_data ?? {}) } as Record<string, Colaborador[]>;
      const currentKey = `${params.month}_${params.year}`;
      const targetKey = `${resolved.month}_${resolved.year}`;

      if (colaboradores.length > 0 && params.month !== undefined && params.month >= 0 && params.year !== undefined) {
        mesesData[currentKey] = colaboradores;
      }

      // Save current month's PMT and demand to refs (in-memory)
      pmtByMonthRef.current[currentKey] = {
        m3: pmtDataM3,
        pcs: pmtDataPcs
      };
      demandaM3ByMonthRef.current[currentKey] = demandaDiariaM3;
      demandaPcsByMonthRef.current[currentKey] = demandaDiariaPcs;

      const targetDays = resolved.year !== undefined ? new Date(resolved.year, resolved.month! + 1, 0).getDate() : 28;
      const targetM3Parsed = demandaM3ByMonthRef.current[targetKey] ?? { T1: Array(targetDays).fill(0), T2: Array(targetDays).fill(0), T3: Array(targetDays).fill(0) };
      const targetPcsParsed = demandaPcsByMonthRef.current[targetKey] ?? { T1: Array(targetDays).fill(0), T2: Array(targetDays).fill(0), T3: Array(targetDays).fill(0) };
      setDemandaDiariaM3(targetM3Parsed);
      setDemandaDiariaPcs(targetPcsParsed);

      const targetPmt = pmtByMonthRef.current[targetKey] ?? { m3: Array(targetDays).fill(0), pcs: Array(targetDays).fill(0) };
      const nextPmtM3 = targetPmt.m3 && targetPmt.m3.length >= targetDays ? targetPmt.m3 : Array(targetDays).fill(0);
      const nextPmtPcs = targetPmt.pcs && targetPmt.pcs.length >= targetDays ? targetPmt.pcs : Array(targetDays).fill(0);
      setPmtDataM3(nextPmtM3);
      setPmtDataPcs(nextPmtPcs);

      // Restore target month's schedule from memory, or start empty
      const existingColabs = mesesData[targetKey] ?? [];
      setColaboradores(existingColabs);
      // Teams are global — preserve them instead of clearing
      setIsManualMode(true);
      // Changing months exits the loaded scenario context
      setActiveScenarioName(undefined);
      setActiveScenarioId(undefined);
      setIsScenarioDirty(false);
      scenarioJustLoadedRef.current = 0;
      const newColabs: Colaborador[] = existingColabs;

      const updatedParams = { ...resolved, meses_data: { ...mesesData, [targetKey]: newColabs } };
      setParams(updatedParams);
      saveToDatabase(newColabs, teams, updatedParams, targetM3Parsed, targetPcsParsed, nextPmtM3, nextPmtPcs);
      return;
    }

    setParams(resolved);
    saveToDatabase(colaboradores, teams, { ...resolved, meses_data: params.meses_data }, demandaDiariaM3, demandaDiariaPcs);
  };

  const handleColaboradoresChange = (newColabs: Colaborador[]) => {
    setColaboradores(newColabs);
    saveToDatabase(newColabs, teams, params, demandaDiariaM3, demandaDiariaPcs);
  };

  const handleDemandaM3Change = (newDemanda: { [key: string]: number[] }) => {
    setDemandaDiariaM3(newDemanda);
    saveToDatabase(colaboradores, teams, params, newDemanda, demandaDiariaPcs);
  };

  const handleDemandaPcsChange = (newDemanda: { [key: string]: number[] }) => {
    setDemandaDiariaPcs(newDemanda);
    saveToDatabase(colaboradores, teams, params, demandaDiariaM3, newDemanda);
  };

  const handlePmtM3Change = (newPmt: number[]) => {
    setPmtDataM3(newPmt);
    saveToDatabase(colaboradores, teams, params, demandaDiariaM3, demandaDiariaPcs, newPmt, undefined);
  };

  const handlePmtPcsChange = (newPmt: number[]) => {
    setPmtDataPcs(newPmt);
    saveToDatabase(colaboradores, teams, params, demandaDiariaM3, demandaDiariaPcs, undefined, newPmt);
  };

  const handleProdRateChange = (rateM3: number, ratePcs: number, unit: 'm3' | 'pcs') => {
    setProdRateM3(rateM3);
    setProdRatePcs(ratePcs);
    setProdUnit(unit);
    saveToDatabase(colaboradores, teams, params, demandaDiariaM3, demandaDiariaPcs, undefined, undefined);
  };

  // Load from local database on init
  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchConfig();
        if (data && data.id) {
          if (data.params && typeof data.params === 'object' && Object.keys(data.params).length > 0) {
            setParams(data.params);
          }
          const currentKey = `${data.params?.month ?? params.month}_${data.params?.year ?? params.year}`;
          if (data.demanda_m3) {
            if (typeof data.demanda_m3 === 'object' && !Array.isArray(data.demanda_m3) && !data.demanda_m3.T1) {
              demandaM3ByMonthRef.current = data.demanda_m3;
              const entry = data.demanda_m3[currentKey];
              if (entry) setDemandaDiariaM3(entry);
            } else {
              demandaM3ByMonthRef.current[currentKey] = data.demanda_m3;
              setDemandaDiariaM3(data.demanda_m3);
            }
          }
          if (data.demanda_pcs) {
            if (typeof data.demanda_pcs === 'object' && !Array.isArray(data.demanda_pcs) && !data.demanda_pcs.T1) {
              demandaPcsByMonthRef.current = data.demanda_pcs;
              const entry = data.demanda_pcs[currentKey];
              if (entry) setDemandaDiariaPcs(entry);
            } else {
              demandaPcsByMonthRef.current[currentKey] = data.demanda_pcs;
              setDemandaDiariaPcs(data.demanda_pcs);
            }
          }
          if (data.pmt) {
            if (typeof data.pmt === 'object' && !Array.isArray(data.pmt)) {
              const entry = data.pmt[currentKey];
              if (entry) {
                pmtByMonthRef.current = data.pmt;
                if (entry.m3) setPmtDataM3(entry.m3);
                if (entry.pcs) setPmtDataPcs(entry.pcs);
              } else {
                const keys = Object.keys(data.pmt);
                if (keys.some(k => /^\d+_\d+$/.test(k))) {
                  pmtByMonthRef.current = data.pmt;
                }
              }
            } else if (Array.isArray(data.pmt)) {
              pmtByMonthRef.current[currentKey] = { m3: data.pmt, pcs: data.pmt };
              setPmtDataM3(data.pmt);
              setPmtDataPcs(data.pmt);
            }
          }
          if (data.prod_rate_m3 != null) setProdRateM3(data.prod_rate_m3);
          if (data.prod_rate_pcs != null) setProdRatePcs(data.prod_rate_pcs);
          if (data.prod_unit != null) setProdUnit(data.prod_unit as 'm3' | 'pcs');
        }
      } catch (err) {
        console.error("Falha de conexão com o banco de dados:", err);
        setServerOffline(true);
      } finally {
        setTimeout(() => {
          setTeams(currentTeams => {
            if (currentTeams.length === 0) {
              setColaboradores(currentColabs => {
                if (currentColabs.length > 0) {
                  return [];
                }
                return currentColabs;
              });
            }
            return currentTeams;
          });
        }, 0);
        setDbLoading(false);
      }
    }
    loadData();
  }, []);

  // Track isInitialLoadDone — after DB load completes, auto-apply teams if DB has wiped state
  useEffect(() => {
    if (!dbLoading) {
      const t = setTimeout(() => {
        setIsInitialLoadDone(true);
        if (teams.length === 0 && colaboradores.length > 0) {
          setColaboradores([]);
        }
      }, 800);
      return () => clearTimeout(t);
    }
  }, [dbLoading]);

  // Refs to always read latest state inside async callbacks (debounce, realtime)
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const colaboradoresRef = useRef(colaboradores);
  colaboradoresRef.current = colaboradores;
  const teamsRef = useRef(teams);
  teamsRef.current = teams;
  const demandaM3Ref = useRef(demandaDiariaM3);
  demandaM3Ref.current = demandaDiariaM3;
  const demandaPcsRef = useRef(demandaDiariaPcs);
  demandaPcsRef.current = demandaDiariaPcs;

  const saveToDatabase = async (
    colabs: Colaborador[],
    tms: TeamConfig[],
    pms: ScheduleParams,
    demM3: typeof demandaDiariaM3,
    demPcs: typeof demandaDiariaPcs,
    pmtM3?: number[],
    pmtPcs?: number[]
  ) => {
    // Build meses_data from in-memory params.meses_data + current colaboradores
    const mesesData = { ...((pms as any).meses_data ?? {}) } as Record<string, Colaborador[]>;
    const currentKey = `${pms.month}_${pms.year}`;
    mesesData[currentKey] = colabs;

    // Update in-memory refs with current month's data
    const existing = pmtByMonthRef.current[currentKey] ?? {};
    pmtByMonthRef.current[currentKey] = {
      m3: pmtM3 ?? existing.m3 ?? [],
      pcs: pmtPcs ?? existing.pcs ?? [],
    };
    demandaM3ByMonthRef.current[currentKey] = demM3;
    demandaPcsByMonthRef.current[currentKey] = demPcs;

    try {
      await saveConfig({
        colaboradores: colabs,
        teams: tms,
        params: { ...pms, meses_data: mesesData },
        demanda_m3: demandaM3ByMonthRef.current,
        demanda_pcs: demandaPcsByMonthRef.current,
        pmt: pmtByMonthRef.current,
        prod_rate_m3: prodRateM3Ref.current,
        prod_rate_pcs: prodRatePcsRef.current,
        prod_unit: prodUnitRef.current,
      });
    } catch (err) {
      console.error("Erro ao salvar no banco:", err);
    }
  };

  const handleLoadScenario = (data: { teams?: any; params?: any; demanda_m3?: any; demanda_pcs?: any; pmt_m3?: any; pmt_pcs?: any; prod_rate_m3?: number; prod_rate_pcs?: number; prod_unit?: string; scenarioName?: string; scenarioId?: number }) => {
    if (data.scenarioName) {
      setActiveScenarioName(data.scenarioName);
    }
    if (data.scenarioId !== undefined) {
      setActiveScenarioId(data.scenarioId);
    }
    // Mark that a scenario was just loaded so we don't immediately flag it as dirty
    scenarioJustLoadedRef.current = 2; // 2 = initial teams/colabs set + potential headcount sync
    setIsScenarioDirty(false);
    if ('teams' in data) {
      const newTeams = data.teams ?? [];
      setTeams(newTeams);
    }
    let loadParams = params;
    if (data.params) {
      // Keep current month/year — scenario applies to the month the user is viewing
      const currentMonth = params.month;
      const currentYear = params.year;
      loadParams = { ...data.params, month: currentMonth, year: currentYear };
      // Merge meses_data from scenario so we can look up the current month
      const mergedMesesData = { ...((params as any).meses_data ?? {}), ...((data.params as any).meses_data ?? {}) };
      loadParams.meses_data = mergedMesesData;
      setParams(loadParams);
      const viewKey = `${currentMonth}_${currentYear}`;
      if (mergedMesesData[viewKey] && mergedMesesData[viewKey].length > 0) {
        const filtered = mergedMesesData[viewKey].filter((c: Colaborador) => c.team);
        setColaboradores(filtered);
        setIsManualMode(true);
      } else {
        // Fallback: generate colaboradores from teams and params for the CURRENT month
        const startDay = (currentMonth !== undefined && currentYear !== undefined)
          ? (new Date(currentYear!, currentMonth!, 1).getDay() + 6) % 7
          : 0;
        const dias = (currentMonth !== undefined && currentYear !== undefined)
          ? new Date(currentYear!, currentMonth! + 1, 0).getDate()
          : data.params.dias;
        if (data.teams && data.teams.length > 0) {
          const scale = generateSchedule(data.params).map(c => ({
            ...c,
            team: undefined,
            escala: Array(dias).fill('WORK' as DayStatus),
          }));
          const applied = applyTeamsToColaboradores(scale, data.teams, startDay, dias);
          const kept = applied.filter(c => c.team !== undefined);
          setColaboradores(kept);
          setIsManualMode(true);
        }
      }
    }
    saveToDatabase(colaboradores, data.teams ?? teams, loadParams, demandaDiariaM3, demandaDiariaPcs, pmtDataM3, pmtDataPcs);
    if (data.prod_rate_m3 != null) setProdRateM3(data.prod_rate_m3);
    if (data.prod_rate_pcs != null) setProdRatePcs(data.prod_rate_pcs);
    if (data.prod_unit != null) setProdUnit(data.prod_unit as 'm3' | 'pcs');
  };

  const handleUpdateTeams = (newTeams: TeamConfig[]) => {
    setTeams(newTeams);

    const currentKey = `${params.month}_${params.year}`;
    const shiftsWithTeams = newTeams.length > 0 ? new Set(newTeams.map(t => t.shiftType)) as Set<ShiftType> : new Set<ShiftType>();
    const updatedMesesData = { ...((params as any).meses_data ?? {}) } as Record<string, Colaborador[]>;

    if (newTeams.length === 0) {
      setColaboradores([]);
      setIsManualMode(true);
      // Clear current month from meses_data
      delete updatedMesesData[currentKey];
      // Clear all other months
      for (const key of Object.keys(updatedMesesData)) {
        updatedMesesData[key] = [];
      }
      setParams(prev => ({ ...prev, meses_data: updatedMesesData }));
      saveToDatabase([], newTeams, { ...params, meses_data: updatedMesesData }, demandaDiariaM3, demandaDiariaPcs);
    } else {
      const startDay = (params.month !== undefined && params.year !== undefined)
        ? (new Date(params.year, params.month, 1).getDay() + 6) % 7
        : 0;
      const dias = (params.month !== undefined && params.year !== undefined)
        ? new Date(params.year, params.month + 1, 0).getDate()
        : params.dias;

      let colabs = [...colaboradores];
      colabs = colabs.filter(c => shiftsWithTeams.has(c.turno));

      for (const shift of shiftsWithTeams) {
        const shiftTeams = newTeams.filter(t => t.shiftType === shift);
        const totalNeeded = shiftTeams.reduce((sum, t) => sum + t.memberCount, 0);
        const existing = colabs.filter(c => c.turno === shift).length;
        const missing = totalNeeded - existing;

        if (missing > 0) {
          for (let i = 0; i < missing; i++) {
            const nextNum = existing + i + 1;
            colabs.push({
              id: `${shift}-${String(nextNum).padStart(3, '0')}`,
              turno: shift,
              escala: Array(dias).fill('WORK' as DayStatus),
            });
          }
        }
      }

      const updated = applyTeamsToColaboradores(colabs, newTeams, startDay, dias);
      const kept = updated.filter(c => c.team !== undefined);
      setColaboradores(kept);
      setIsManualMode(true);

      // Persist current month into meses_data
      if (kept.length > 0) {
        updatedMesesData[currentKey] = kept;
      } else {
        delete updatedMesesData[currentKey];
      }

      // Re-apply teams to each other saved month
      for (const [key, monthColabs] of Object.entries(updatedMesesData)) {
        if (key === currentKey) continue;
        const parts = key.split('_');
        const m = parseInt(parts[0]);
        const y = parseInt(parts[1]);
        if (isNaN(m) || isNaN(y)) continue;

        const savedStartDay = (new Date(y, m, 1).getDay() + 6) % 7;
        const savedDias = new Date(y, m + 1, 0).getDate();
        let monthData = monthColabs.filter(c => shiftsWithTeams.has(c.turno));

        for (const shift of shiftsWithTeams) {
          const shiftTeams = newTeams.filter(t => t.shiftType === shift);
          const totalNeeded = shiftTeams.reduce((sum, t) => sum + t.memberCount, 0);
          const existing = monthData.filter(c => c.turno === shift).length;
          const missing = totalNeeded - existing;

          if (missing > 0) {
            for (let j = 0; j < missing; j++) {
              monthData.push({
                id: `${shift}-${String(existing + j + 1).padStart(3, '0')}`,
                turno: shift,
                escala: Array(savedDias).fill('WORK' as DayStatus),
              });
            }
          }
        }

        const reapplied = applyTeamsToColaboradores(monthData, newTeams, savedStartDay, savedDias);
        updatedMesesData[key] = reapplied.filter(c => c.team !== undefined);
      }

      setParams(prev => ({ ...prev, meses_data: updatedMesesData }));
      saveToDatabase(kept, newTeams, { ...params, meses_data: updatedMesesData }, demandaDiariaM3, demandaDiariaPcs);
    }
  };

  const [isManualMode, setIsManualMode] = useState<boolean>(true);


  // Toggle Dark Mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  // Generate empty schedule (all WORK — no off days until teams are applied)
  const handleRecalculate = () => {
    if (teams.length === 0) {
      setColaboradores([]);
      saveToDatabase([], teams, params, demandaDiariaM3, demandaDiariaPcs);
      return;
    }
    const scale = generateSchedule(params).map(c => ({
      ...c,
      team: undefined,
      escala: Array(c.escala.length).fill('WORK' as DayStatus),
    }));
    const startDay = (params.month !== undefined && params.year !== undefined)
      ? (new Date(params.year, params.month, 1).getDay() + 6) % 7
      : 0;
    const dias = (params.month !== undefined && params.year !== undefined)
      ? new Date(params.year, params.month + 1, 0).getDate()
      : params.dias;
    const applied = applyTeamsToColaboradores(scale, teams, startDay, dias);
    const kept = applied.filter(c => c.team !== undefined);
    setColaboradores(kept);
    saveToDatabase(kept, teams, params, demandaDiariaM3, demandaDiariaPcs);
  };

  // Run on initial mount or parameters change (only if not in manual mode)
  useEffect(() => {
    // Skip recalculation if DB just loaded valid data — avoids overwriting DB state
    if (dbLoadedRef.current) {
      dbLoadedRef.current = false;
      return;
    }
    if (isInitialLoadDone && !isManualMode) {
      handleRecalculate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.conferentesT1, params.conferentesT2, params.conferentesT3,
    params.dias, params.horasSemanais, params.cenario, params.escala,
    params.setor, params.weeks,
    isManualMode, isInitialLoadDone
  ]);

  // Detect changes made after a scenario was loaded → mark as dirty
  useEffect(() => {
    if (!activeScenarioName) return;
    if (scenarioJustLoadedRef.current > 0) {
      scenarioJustLoadedRef.current--;
      return;
    }
    setIsScenarioDirty(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams, colaboradores]);

  // Synchronize headcount parameters with the collaborators list (even in manual mode)
  useEffect(() => {
    if (colaboradores.length === 0) return;

    const t1Colabs = colaboradores.filter(c => c.turno === 'T1');
    const t2Colabs = colaboradores.filter(c => c.turno === 'T2');
    const t3Colabs = colaboradores.filter(c => c.turno === 'T3');

    const diffT1 = params.conferentesT1 - t1Colabs.length;
    const diffT2 = params.conferentesT2 - t2Colabs.length;
    const diffT3 = params.conferentesT3 - t3Colabs.length;

    if (diffT1 === 0 && diffT2 === 0 && diffT3 === 0) return;

    let updated = [...colaboradores];
    const dias = (params.month !== undefined && params.year !== undefined)
      ? new Date(params.year, params.month + 1, 0).getDate()
      : params.dias;

    // Adjust T1
    if (diffT1 < 0) {
      const toRemove = t1Colabs.slice(diffT1);
      const idsToRemove = new Set(toRemove.map(c => c.id));
      updated = updated.filter(c => !idsToRemove.has(c.id));
    } else if (diffT1 > 0) {
      for (let i = 0; i < diffT1; i++) {
        const nextNum = t1Colabs.length + i + 1;
        const newId = `T1-${String(nextNum).padStart(3, '0')}`;
        updated.push({
          id: newId,
          turno: 'T1',
          escala: Array(dias).fill('WORK' as DayStatus)
        });
      }
    }

    // Adjust T2
    if (diffT2 < 0) {
      const toRemove = t2Colabs.slice(diffT2);
      const idsToRemove = new Set(toRemove.map(c => c.id));
      updated = updated.filter(c => !idsToRemove.has(c.id));
    } else if (diffT2 > 0) {
      for (let i = 0; i < diffT2; i++) {
        const nextNum = t2Colabs.length + i + 1;
        const newId = `T2-${String(nextNum).padStart(3, '0')}`;
        updated.push({
          id: newId,
          turno: 'T2',
          escala: Array(dias).fill('WORK' as DayStatus)
        });
      }
    }

    // Adjust T3
    if (diffT3 < 0) {
      const toRemove = t3Colabs.slice(diffT3);
      const idsToRemove = new Set(toRemove.map(c => c.id));
      updated = updated.filter(c => !idsToRemove.has(c.id));
    } else if (diffT3 > 0) {
      for (let i = 0; i < diffT3; i++) {
        const nextNum = t3Colabs.length + i + 1;
        const newId = `T3-${String(nextNum).padStart(3, '0')}`;
        updated.push({
          id: newId,
          turno: 'T3',
          escala: Array(dias).fill('WORK' as DayStatus)
        });
      }
    }

    setColaboradores(updated);
    // Do NOT mark dirty here — headcount sync is an internal adjustment, not a user edit
  }, [params.conferentesT1, params.conferentesT2, params.conferentesT3]);

  const startDay = (params.month !== undefined && params.year !== undefined)
    ? (new Date(params.year, params.month, 1).getDay() + 6) % 7
    : 0;
  const diasNum = (params.month !== undefined && params.year !== undefined)
    ? new Date(params.year, params.month + 1, 0).getDate()
    : params.dias;

  if (dbLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-800 dark:text-slate-100 transition-colors duration-200">
        <div className="flex flex-col items-center gap-4">
          <Truck className="w-12 h-12 text-blue-600 animate-bounce" />
          <p className="font-bold text-sm tracking-wide">Carregando dados do banco local...</p>
          <div className="w-48 bg-slate-200 dark:bg-slate-850 h-1.5 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full w-2/3 animate-pulse rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  const dailyCoverage = calculateDailyCoverage(colaboradores, diasNum);
  const weeklyCoverage = calculateWeeklyCoverage(dailyCoverage, startDay);
  const indicators = calculateIndicators(colaboradores, dailyCoverage);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Magalu inspired Header */}
      <header className="magalu-header text-white py-6 px-6 sm:px-12 shadow-md relative overflow-hidden noprint">
        {/* Abstract background shape */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl transform translate-x-20 -translate-y-20"></div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
              <Truck className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-2xl tracking-tight">Magalog</span>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-orange-500 px-2 py-0.5 rounded-full">
                  CD Shift Planner
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Sistema Executivo de Planejamento de Escalas de Trabalho (5x2)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition backdrop-blur-md border border-white/20 cursor-pointer"
              title="Alternar Tema"
            >
              {darkMode ? <Sun className="w-5 h-5 text-yellow-300" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <div className="flex items-center gap-2 text-xs bg-white/10 border border-white/20 px-3.5 py-2 rounded-xl backdrop-blur-md">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span className="font-semibold text-blue-50">Conformidade CLT Regulamentada</span>
            </div>
          </div>
        </div>
      </header>

      {/* Server offline warning */}
      {serverOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-center text-xs font-bold py-2 px-4">
          Servidor offline — dados sendo salvos apenas no navegador. Execute <code className="bg-red-700 px-1.5 py-0.5 rounded">npm run dev:server</code> para ativar o banco de dados.
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 pb-px noprint">
          <button
            onClick={() => setActiveTab('painel')}
            className={`pb-3 text-sm font-bold transition relative flex items-center gap-2 cursor-pointer ${
              activeTab === 'painel'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Painel & Resumo
          </button>
          <button
            onClick={() => setActiveTab('planejador')}
            className={`pb-3 text-sm font-bold transition relative flex items-center gap-2 cursor-pointer ${
              activeTab === 'planejador'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Calendário & Planejamento
          </button>
        </div>

        {activeTab === 'painel' ? (
          <>
            {/* Filtro do Modelo de Carga Horária Semanal e Cenários */}
            <section className="noprint">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                {/* Carga Horária */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">1. Jornada Semanal</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Defina a carga horária base</p>
                  </div>
                  <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-850">
                    {[40, 42, 44].map((hours) => (
                      <button
                        key={hours}
                        onClick={() => handleParamsChange({ ...params, horasSemanais: hours as 40 | 42 | 44 })}
                        className={`px-5 py-2 rounded-xl text-xs font-black transition duration-200 cursor-pointer ${
                          params.horasSemanais === hours
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                      >
                        {hours} Horas
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cenário de Sobreposição */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">2. Cenário de Turnos</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Altere as sobreposições operacionais</p>
                  </div>
                  <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-850">
                    {(['A', 'B', 'C', 'D'] as const).map((scen) => (
                      <button
                        key={scen}
                        onClick={() => handleParamsChange({ ...params, cenario: scen })}
                        className={`px-5 py-2 rounded-xl text-xs font-black transition duration-200 cursor-pointer ${
                          params.cenario === scen
                            ? 'bg-orange-500 text-white shadow-md'
                            : 'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                      >
                        Cenário {scen}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Module 1: Shift Cards */}
            <section className="print-no-break">
              <ShiftCards horasSemanais={params.horasSemanais} cenario={params.cenario} />
            </section>

            {/* Overlap Timeline component */}
            <section className="print-no-break">
              <ShiftTimeline horasSemanais={params.horasSemanais} cenario={params.cenario} />
            </section>

            {/* Compliance & Labor Law Panel */}
            <section className="print-no-break">
              <CompliancePanel horasSemanais={params.horasSemanais} setor={params.setor} />
            </section>

            {/* Module 8: KPI Indicators */}
            <section className="print-no-break">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Painel de Performance Operacional
                </h3>
              </div>
              <Indicators indicators={indicators} />
            </section>

            {/* Export and Print Action Toolbar */}
            <section>
              <ExportActions colaboradores={colaboradores} />
            </section>

            {/* Module 7: Charts Panel */}
            <section className="print-break-after">
              <Charts
                dailyCoverage={dailyCoverage}
                weeklyCoverage={weeklyCoverage}
                colaboradores={colaboradores}
                params={params}
              />
            </section>

            {/* Module 5 & 6: Coverage Tables */}
            <section className="print-no-break">
              <CoverageTable dailyCoverage={dailyCoverage} weeklyCoverage={weeklyCoverage} />
            </section>
          </>
        ) : (
          <>
            {/* Unified Planning & Scale Card (Module 2, 4 & 9) */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm mb-8 space-y-6 print-break-after">
              <div className="flex items-center justify-between mb-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                      Calendário de Planejamento & Parâmetros ({diasNum} Dias)
                    </h3>
                    <p className="text-[11px] text-slate-400">Ajuste as metas de Hc, regras da CLT e veja o impacto imediatamente na escala</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Importe Leis - Normas
                </button>
              </div>

              {/* Part 1: Parameters Form */}
              <div className="noprint">
                <ParametersForm
                  initialValues={params}
                  onChange={handleParamsChange}
                  plain={true}
                />
              </div>

              {/* Divider */}
              <div className="border-t border-slate-200 dark:border-slate-800/80 my-4 noprint"></div>

              {/* Part 2: Interactive Grid */}
              <CalendarGrid key={`${params.month}_${params.year}`}
                colaboradores={colaboradores.filter(c => c.team)} 
                diasCount={diasNum} 
                month={params.month} 
                year={params.year} 
                plain={true} 
                onUpdateColaboradores={handleColaboradoresChange}
                isManualMode={isManualMode}
                onToggleManualMode={setIsManualMode}
                params={params}
                teams={teams}
                onUpdateTeams={handleUpdateTeams}
                demandaDiariaM3Prop={demandaDiariaM3}
                demandaDiariaPcsProp={demandaDiariaPcs}
                onDemandaChangeM3={handleDemandaM3Change}
                onDemandaChangePcs={handleDemandaPcsChange}
                pmtM3Prop={pmtDataM3}
                pmtPcsProp={pmtDataPcs}
                onPmtM3Change={handlePmtM3Change}
                onPmtPcsChange={handlePmtPcsChange}
                prodRateM3Prop={prodRateM3}
                prodRatePcsProp={prodRatePcs}
                prodUnitProp={prodUnit}
                onProdRateChange={handleProdRateChange}
                onLoadScenario={handleLoadScenario}
                activeScenarioName={activeScenarioName}
                activeScenarioId={activeScenarioId}
                isScenarioDirty={isScenarioDirty}
                onScenarioSaved={() => setIsScenarioDirty(false)}
              />
            </section>
          </>
        )}

        <ImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onApplyRules={(rules) => {
            handleParamsChange(prev => ({
              ...prev,
              ...rules
            }));
          }}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400 mt-12 noprint">
        <p>© 2026 Magalog Distribuição. Todos os direitos reservados. Em conformidade com a Consolidação das Leis do Trabalho (CLT).</p>
      </footer>
    </div>
  );
}

export default App;
