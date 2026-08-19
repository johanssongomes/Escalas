import { useState, useEffect, useRef, useCallback } from 'react';
import { ParametersForm } from './components/Schedule/ParametersForm';
import { CalendarGrid } from './components/Schedule/CalendarGrid';
import { generateSchedule } from './utils/scheduleEngine';
import { generateIntelligentScale, buildCanonicalTeams, DEFAULT_OPERATION, getMonthInfo, letterFromName, TEAM_LETTERS } from './utils/escala52Engine';
import type { ScheduleParams, Colaborador, TeamConfig, DayStatus, ShiftType, DadosMes, DadosMensais, OperationConfig, TeamLetter } from './types';
import { ShieldCheck, Truck, Moon, Sun, Calendar, BarChart3, Upload } from 'lucide-react';
import { ImportModal } from './components/Schedule/ImportModal';
import { ScaleValidator } from './components/Schedule/ScaleValidator';

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

function mesKey(month: number, year: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function criarDadosMes(dias: number): DadosMes {
  const empty = Array(dias).fill(0);
  return {
    demandaM3: { T1: [...empty], T2: [...empty], T3: [...empty] },
    demandaPcs: { T1: [...empty], T2: [...empty], T3: [...empty] },
    pmtM3: [...empty],
    pmtPcs: [...empty],
  };
}

function adaptDadosMes(source: DadosMes, targetDias: number): DadosMes {
  const resizeArray = (arr: number[] | undefined) => {
    const safeArr = arr ?? [];
    if (safeArr.length === targetDias) return [...safeArr];
    if (safeArr.length > targetDias) return safeArr.slice(0, targetDias);
    return [...safeArr, ...Array(targetDias - safeArr.length).fill(0)];
  };

  return {
    demandaM3: {
      T1: resizeArray(source.demandaM3?.T1),
      T2: resizeArray(source.demandaM3?.T2),
      T3: resizeArray(source.demandaM3?.T3),
    },
    demandaPcs: {
      T1: resizeArray(source.demandaPcs?.T1),
      T2: resizeArray(source.demandaPcs?.T2),
      T3: resizeArray(source.demandaPcs?.T3),
    },
    pmtM3: resizeArray(source.pmtM3),
    pmtPcs: resizeArray(source.pmtPcs),
    teams: source.teams,
  };
}

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
  const [params, setParamsState] = useState<ScheduleParams>(() => {
    const today = new Date();
    const initial = {
      conferentesT1: 14,
      conferentesT2: 10,
      conferentesT3: 16,
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
      operation: DEFAULT_OPERATION,
      maxConsecutiveWorkDays: 6,
      rotationSequence: 'A',
    };
    const info = getMonthInfo(initial.year, initial.month);
    initial.dias = info.dias;
    initial.weeks = Math.ceil(info.dias / 7);
    return initial;
  });

  const setParams = useCallback((updated: ScheduleParams | ((prev: ScheduleParams) => ScheduleParams)) => {
    setParamsState(prev => {
      const next = typeof updated === 'function' ? (updated as Function)(prev) : updated;
      if (next.month !== undefined && next.month !== -1 && next.year !== undefined) {
        const info = getMonthInfo(next.year, next.month);
        return {
          ...next,
          dias: info.dias,
          weeks: Math.ceil(info.dias / 7)
        };
      }
      return next;
    });
  }, [setParamsState]);

  const handleOperationChange = (newOp: OperationConfig) => {
    const t1Count = newOp.shifts.T1?.memberCount ?? params.conferentesT1;
    const t2Count = newOp.shifts.T2?.memberCount ?? params.conferentesT2;
    const t3Count = newOp.shifts.T3?.memberCount ?? params.conferentesT3;
    const newTeams = buildCanonicalTeams(newOp);
    const newProdRate = newOp.prodRate;
    const newUnit = newOp.unit;

    setTeams(newTeams);
    if (newUnit === 'm3') setProdRateM3(newProdRate);
    else setProdRatePcs(newProdRate);
    setProdUnit(newUnit);

    const updatedParams = {
      ...params,
      conferentesT1: t1Count,
      conferentesT2: t2Count,
      conferentesT3: t3Count,
      operation: newOp,
    };
    setParams(updatedParams);
    setIsScenarioDirty(true);

    const scaleResult = generateIntelligentScale(newOp, newTeams, colaboradores, params.month ?? 0, params.year ?? 2026, undefined, params.maxConsecutiveWorkDays, params.rotationSequence);
    setColaboradores(scaleResult.colaboradores);
    setTeams(scaleResult.teams);
  };

  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);

  const [activeTab, setActiveTab] = useState<'painel' | 'planejador'>('planejador');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [activeScenarioName, setActiveScenarioName] = useState<string | undefined>(undefined);
  const [activeScenarioId, setActiveScenarioId] = useState<number | undefined>(undefined);
  const [isScenarioDirty, setIsScenarioDirty] = useState(false);
  // Ref to skip marking dirty on the very first render after loading a scenario
  const scenarioJustLoadedRef = useRef(0);

  const [teams, setTeams] = useState<TeamConfig[]>([]);

  const [dadosMensais, setDadosMensais] = useState<DadosMensais>({});

  const [prodRateM3, setProdRateM3] = useState<number>(25);
  const [prodRatePcs, setProdRatePcs] = useState<number>(250);
  const [prodUnit, setProdUnit] = useState<'m3' | 'pcs'>('m3');
  const prodRateM3Ref = useRef(prodRateM3);
  prodRateM3Ref.current = prodRateM3;
  const prodRatePcsRef = useRef(prodRatePcs);
  prodRatePcsRef.current = prodRatePcs;
  const prodUnitRef = useRef(prodUnit);
  prodUnitRef.current = prodUnit;

  // Get the current month key and data from dadosMensais
  const currentKey = (params.month !== undefined && params.year !== undefined)
    ? mesKey(params.month, params.year) : '';
  const diasNum = (params.month !== undefined && params.month !== -1 && params.year !== undefined)
    ? getMonthInfo(params.year, params.month).dias
    : params.dias;

  const dadosMes = currentKey
    ? (dadosMensais[currentKey] ?? criarDadosMes(diasNum))
    : criarDadosMes(diasNum);

  // State wrappers — all edits go into dadosMensais, never overwrite other months
  const handleParamsChange = (newParams: ScheduleParams | ((prev: ScheduleParams) => ScheduleParams)) => {
    const resolved = typeof newParams === 'function' ? newParams(params) : newParams;
    if (isInitialLoadDone && resolved.month !== undefined && resolved.month >= 0 && resolved.year !== undefined &&
        (resolved.month !== params.month || resolved.year !== params.year)) {
      // Month switch — save current month's dadosMensais entry, then use target's
      const targetKey = mesKey(resolved.month, resolved.year);
      const currentKeyLocal = currentKey;

      setDadosMensais(prev => {
        const next = { ...prev };
        // Persist current month's data into the store
        next[currentKeyLocal] = dadosMes;
        // Ensure target month has an entry
        if (!next[targetKey]) {
          const targetDays = getMonthInfo(resolved.year!, resolved.month!).dias;
          next[targetKey] = criarDadosMes(targetDays);
        }
        return next;
      });

      // Handle colaboradores
      const mesesData = { ...(params.meses_data ?? {}) } as Record<string, Colaborador[]>;
      const oldKeyFlat = `${params.month}_${params.year}`;
      if (colaboradores.length > 0 && params.month !== undefined && params.month >= 0 && params.year !== undefined) {
        mesesData[oldKeyFlat] = colaboradores;
      }
      let existingColabs = mesesData[`${resolved.month}_${resolved.year}`] ?? [];
      
      const targetDadosMes = dadosMensais[targetKey];
      const monthSpecificTeams = targetDadosMes?.teams ?? teams;
      setTeams(monthSpecificTeams);

      // 1. If this month has no saved collaborators, auto-generate them from current teams/params
      if (existingColabs.length === 0 && monthSpecificTeams.length > 0) {
        const scale = generateSchedule(resolved).map(c => ({
          ...c,
          team: undefined,
          escala: Array(c.escala.length).fill('WORK' as DayStatus),
        }));
        const op = resolved.operation ?? params.operation ?? DEFAULT_OPERATION;
        const genRes = generateIntelligentScale(op, monthSpecificTeams, scale, resolved.month!, resolved.year!, undefined, resolved.maxConsecutiveWorkDays, resolved.rotationSequence);
        existingColabs = genRes.colaboradores.filter(c => c.team !== undefined);
      }
      // 2. If they exist but somehow lost their team names (e.g. older migration/reset), restore team names
      else if (existingColabs.length > 0 && monthSpecificTeams.length > 0 && existingColabs.every(c => !c.team)) {
        const op = resolved.operation ?? params.operation ?? DEFAULT_OPERATION;
        const genRes = generateIntelligentScale(op, monthSpecificTeams, existingColabs, resolved.month!, resolved.year!, undefined, resolved.maxConsecutiveWorkDays, resolved.rotationSequence);
        existingColabs = genRes.colaboradores;
      }

      setColaboradores(existingColabs);
      setIsManualMode(true);
      setActiveScenarioName(undefined);
      setActiveScenarioId(undefined);
      setIsScenarioDirty(false);
      scenarioJustLoadedRef.current = 0;

      const updatedParams = { ...resolved, meses_data: { ...mesesData, [`${resolved.month}_${resolved.year}`]: existingColabs } };
      setParams(updatedParams);

      // Save sychronously/immediately to the DB config to avoid stale closure or loss on quick actions
      const tempNext = { ...dadosMensais };
      // Make sure the month we are leaving also preserves its teams in dadosMensais
      tempNext[currentKeyLocal] = { ...dadosMes, teams: teams };
      if (!tempNext[targetKey]) {
        const targetDays = getMonthInfo(resolved.year!, resolved.month!).dias;
        tempNext[targetKey] = { ...criarDadosMes(targetDays), teams: monthSpecificTeams };
      } else if (!tempNext[targetKey].teams) {
        tempNext[targetKey].teams = monthSpecificTeams;
      }

      saveConfig({
        colaboradores: existingColabs,
        teams: monthSpecificTeams,
        params: updatedParams,
        dados_mensais: tempNext,
        prod_rate_m3: prodRateM3Ref.current,
        prod_rate_pcs: prodRatePcsRef.current,
        prod_unit: prodUnitRef.current,
      }).catch(err => console.error("Erro ao salvar imediatamente no banco:", err));

      return;
    }

    setParams(resolved);
  };

  const handleColaboradoresChange = (newColabs: Colaborador[]) => {
    setColaboradores(newColabs);
  };

  const handleDemandaM3Change = (newDemanda: { [key: string]: number[] }) => {
    setDadosMensais(prev => ({
      ...prev,
      [currentKey]: { ...(prev[currentKey] ?? criarDadosMes(diasNum)), demandaM3: newDemanda as DadosMes['demandaM3'] }
    }));
  };

  const handleDemandaPcsChange = (newDemanda: { [key: string]: number[] }) => {
    setDadosMensais(prev => ({
      ...prev,
      [currentKey]: { ...(prev[currentKey] ?? criarDadosMes(diasNum)), demandaPcs: newDemanda as DadosMes['demandaPcs'] }
    }));
  };

  const handlePmtM3Change = (newPmt: number[]) => {
    setDadosMensais(prev => ({
      ...prev,
      [currentKey]: { ...(prev[currentKey] ?? criarDadosMes(diasNum)), pmtM3: newPmt }
    }));
  };

  const handlePmtPcsChange = (newPmt: number[]) => {
    setDadosMensais(prev => ({
      ...prev,
      [currentKey]: { ...(prev[currentKey] ?? criarDadosMes(diasNum)), pmtPcs: newPmt }
    }));
  };

  const handleProdRateChange = (rateM3: number, ratePcs: number, unit: 'm3' | 'pcs') => {
    setProdRateM3(rateM3);
    setProdRatePcs(ratePcs);
    setProdUnit(unit);
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
          // Load per-month dadosMensais from the unified field
          if (data.dados_mensais) {
            setDadosMensais(data.dados_mensais as DadosMensais);
          } else {
            // Migrate from old separate fields into unified structure
            const migrated: DadosMensais = {};
            const dbMonth = data.params?.month ?? params.month;
            const dbYear = data.params?.year ?? params.year;
            if (dbMonth !== undefined && dbYear !== undefined) {
              const dbKey = mesKey(dbMonth, dbYear);
              const dias = new Date(dbYear, dbMonth + 1, 0).getDate();

              const parseDemanda = (val: any): { T1: number[]; T2: number[]; T3: number[] } | null => {
                if (!val) return null;
                if (typeof val === 'object' && !Array.isArray(val) && !val.T1) {
                  const entry = (val as Record<string, any>)[`${dbMonth}_${dbYear}`] ?? val[dbKey];
                  if (entry?.T1) return entry as any;
                  return null;
                }
                if (val.T1) return val;
                return null;
              };
              const m3 = parseDemanda(data.demanda_m3);
              const pcs = parseDemanda(data.demanda_pcs);

              // PMT migration: array (old) or multi-month object
              let pmtM3 = Array(dias).fill(0) as number[];
              let pmtPcs = Array(dias).fill(0) as number[];
              if (data.pmt) {
                if (Array.isArray(data.pmt)) {
                  pmtM3 = data.pmt;
                  pmtPcs = data.pmt;
                } else if (typeof data.pmt === 'object') {
                  const pmtEntry = (data.pmt as any)[`${dbMonth}_${dbYear}`] ?? (data.pmt as any)[dbKey];
                  if (pmtEntry) {
                    pmtM3 = pmtEntry.m3 ?? pmtEntry;
                    pmtPcs = pmtEntry.pcs ?? pmtEntry;
                  }
                }
              }

              const entry: DadosMes = {
                demandaM3: m3 ?? { T1: Array(dias).fill(0), T2: Array(dias).fill(0), T3: Array(dias).fill(0) },
                demandaPcs: pcs ?? { T1: Array(dias).fill(0), T2: Array(dias).fill(0), T3: Array(dias).fill(0) },
                pmtM3,
                pmtPcs,
              };
              migrated[dbKey] = entry;

              // Also check for multi-month data in old fields
              if (data.demanda_m3 && typeof data.demanda_m3 === 'object' && !Array.isArray(data.demanda_m3) && !data.demanda_m3.T1) {
                for (const key of Object.keys(data.demanda_m3)) {
                  if (!migrated[key]) {
                    const parts = key.split('_');
                    if (parts.length === 2) {
                      const m = parseInt(parts[0]);
                      const y = parseInt(parts[1]);
                      if (!isNaN(m) && !isNaN(y)) {
                        const d = new Date(y, m + 1, 0).getDate();
                        migrated[key] = criarDadosMes(d);
                        const dm3 = (data.demanda_m3 as any)[key];
                        if (dm3) migrated[key].demandaM3 = dm3;
                        const dpcs = (data.demanda_pcs as any)?.[key];
                        if (dpcs) migrated[key].demandaPcs = dpcs;
                        const pmtEntry = (data.pmt as any)?.[key];
                        if (pmtEntry) {
                          migrated[key].pmtM3 = pmtEntry.m3 ?? Array(d).fill(0);
                          migrated[key].pmtPcs = pmtEntry.pcs ?? Array(d).fill(0);
                        }
                      }
                    }
                  }
                }
              }
              setDadosMensais(migrated);
            }
          }
          const initialMonth = data.params?.month ?? params.month;
          const initialYear = data.params?.year ?? params.year;
          if (initialMonth !== undefined && initialYear !== undefined) {
            const colabKey = `${initialMonth}_${initialYear}`;
            if (data.params?.meses_data?.[colabKey]) {
              setColaboradores(data.params.meses_data[colabKey]);
            } else if (data.colaboradores) {
              setColaboradores(data.colaboradores);
            }

            const initialKey = mesKey(initialMonth, initialYear);
            const loadedDadosMensais = (data.dados_mensais || {}) as DadosMensais;
            const initialMonthTeams = loadedDadosMensais[initialKey]?.teams ?? data.teams;
            if (initialMonthTeams) setTeams(initialMonthTeams);
          } else {
            if (data.colaboradores) setColaboradores(data.colaboradores);
            if (data.teams) setTeams(data.teams);
          }
          if (data.prod_rate_m3 != null) setProdRateM3(data.prod_rate_m3);
          if (data.prod_rate_pcs != null) setProdRatePcs(data.prod_rate_pcs);
          if (data.prod_unit != null) setProdUnit(data.prod_unit as 'm3' | 'pcs');
          dbLoadedRef.current = true;
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

  // Keep operation.teamSizes in sync with teams state automatically
  useEffect(() => {
    const op = params.operation ?? DEFAULT_OPERATION;
    const currentTeamSizes = op.teamSizes;
    const expectedTeamSizes: Record<ShiftType, Record<TeamLetter, number>> = {
      T1: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0 },
      T2: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0 },
      T3: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0 },
    };
    teams.forEach(t => {
      const letter = letterFromName(t.name);
      if (expectedTeamSizes[t.shiftType] && letter in expectedTeamSizes[t.shiftType]) {
        expectedTeamSizes[t.shiftType][letter] = t.memberCount;
      }
    });

    let hasDiff = false;
    for (const shift of ['T1', 'T2', 'T3'] as ShiftType[]) {
      for (const letter of TEAM_LETTERS) {
        if ((currentTeamSizes[shift]?.[letter] ?? 0) !== (expectedTeamSizes[shift]?.[letter] ?? 0)) {
          hasDiff = true;
          break;
        }
      }
    }

    if (hasDiff) {
      setParams(prev => ({
        ...prev,
        operation: {
          ...(prev.operation ?? DEFAULT_OPERATION),
          teamSizes: expectedTeamSizes
        }
      }));
    }
  }, [teams, params.operation]);

  // Refs for latest prod rate inside async callbacks
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const colaboradoresRef = useRef(colaboradores);
  colaboradoresRef.current = colaboradores;
  const teamsRef = useRef(teams);
  teamsRef.current = teams;

  const saveToDatabase = useCallback(async () => {
    const pms = params;
    const colabs = colaboradores;
    const tms = teams;
    const dados = dadosMensais;
    const colabKeyFlat = `${pms.month}_${pms.year}`;
    const mesesData = { ...((pms as any).meses_data ?? {}) } as Record<string, Colaborador[]>;
    mesesData[colabKeyFlat] = colabs;

    try {
      await saveConfig({
        colaboradores: colabs,
        teams: tms,
        params: { ...pms, meses_data: mesesData },
        dados_mensais: dados,
        prod_rate_m3: prodRateM3Ref.current,
        prod_rate_pcs: prodRatePcsRef.current,
        prod_unit: prodUnitRef.current,
      });
    } catch (err) {
      console.error("Erro ao salvar no banco:", err);
    }
  }, [currentKey, params, colaboradores, teams, dadosMensais]);

  // Save whenever dadosMensais, params, colaboradores or teams change (debounced 2s)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (dbLoading || Object.keys(dadosMensais).length === 0) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { saveToDatabase(); }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [dadosMensais, params, colaboradores, teams, dbLoading]);

  const handleLoadScenario = (data: { teams?: any; params?: any; dados_mensais?: DadosMensais; demanda_m3?: any; demanda_pcs?: any; pmt_m3?: any; pmt_pcs?: any; prod_rate_m3?: number; prod_rate_pcs?: number; prod_unit?: string; scenarioName?: string; scenarioId?: number }) => {
    if (data.scenarioName) {
      setActiveScenarioName(data.scenarioName);
    }
    if (data.scenarioId !== undefined) {
      setActiveScenarioId(data.scenarioId);
    }
    scenarioJustLoadedRef.current = 2;
    setIsScenarioDirty(false);
    if ('teams' in data) {
      const newTeams = data.teams ?? [];
      setTeams(newTeams);
    }

    const currentMonth = params.month;
    const currentYear = params.year;
    const currentDbKey = (currentMonth !== undefined && currentYear !== undefined) ? mesKey(currentMonth, currentYear) : '';
    const currentDays = (currentMonth !== undefined && currentYear !== undefined)
      ? getMonthInfo(currentYear, currentMonth).dias
      : params.dias;

    // Merge dados_mensais from scenario
    if (data.dados_mensais) {
      setDadosMensais(prev => {
        // Keep existing session data (prev) to avoid overwriting months already configured
        const next = { ...data.dados_mensais, ...prev };
        // If the scenario was saved in a different month, only copy/adapt its dados_mensais data if the current month has no configured data
        if (data.params && data.params.month !== undefined && data.params.year !== undefined) {
          const savedDbKey = mesKey(data.params.month, data.params.year);
          const hasCurrentData = prev[currentDbKey] && (
            (prev[currentDbKey].pmtM3 && prev[currentDbKey].pmtM3.some((v: number) => v > 0)) ||
            (prev[currentDbKey].pmtPcs && prev[currentDbKey].pmtPcs.some((v: number) => v > 0)) ||
            (prev[currentDbKey].demandaM3?.T1 && prev[currentDbKey].demandaM3.T1.some((v: number) => v > 0)) ||
            (prev[currentDbKey].demandaPcs?.T1 && prev[currentDbKey].demandaPcs.T1.some((v: number) => v > 0))
          );

          if (savedDbKey !== currentDbKey && next[savedDbKey] && currentDbKey && !hasCurrentData) {
            next[currentDbKey] = adaptDadosMes(next[savedDbKey], currentDays);
          }
        }
        return next;
      });
    }

    let loadParams = params;
    if (data.params) {
      loadParams = { ...data.params, month: currentMonth, year: currentYear };
      const mergedMesesData = { ...((params as any).meses_data ?? {}), ...((data.params as any).meses_data ?? {}) };

      // Let's check if the loaded scenario has collaborators for the saved month/year
      const savedKeyFlat = `${data.params.month}_${data.params.year}`;
      const currentKeyFlat = `${currentMonth}_${currentYear}`;

      if (mergedMesesData[savedKeyFlat] && savedKeyFlat !== currentKeyFlat) {
        // Adapt the escala length of each collaborator to the current month's days count
        const adaptedColaboradores = mergedMesesData[savedKeyFlat].map((c: Colaborador) => {
          let newEscala = [...c.escala];
          if (newEscala.length !== currentDays) {
            if (newEscala.length > currentDays) {
              newEscala = newEscala.slice(0, currentDays);
            } else {
              newEscala = [...newEscala, ...Array(currentDays - newEscala.length).fill('WORK' as DayStatus)];
            }
          }
          return { ...c, escala: newEscala };
        });
        mergedMesesData[currentKeyFlat] = adaptedColaboradores;
      }

      loadParams.meses_data = mergedMesesData;
      setParams(loadParams);
      const viewKey = `${currentMonth}_${currentYear}`;
      if (mergedMesesData[viewKey] && mergedMesesData[viewKey].length > 0) {
        const filtered = mergedMesesData[viewKey].filter((c: Colaborador) => c.team);
        setColaboradores(filtered);
        setIsManualMode(true);
      } else {
        if (data.teams && data.teams.length > 0) {
          const scale = generateSchedule(data.params).map(c => ({
            ...c,
            team: undefined,
            escala: Array(diasNum).fill('WORK' as DayStatus),
          }));
          const op = data.params?.operation ?? params.operation ?? DEFAULT_OPERATION;
          const genRes = generateIntelligentScale(op, data.teams, scale, currentMonth ?? 0, currentYear ?? 2026);
          const kept = genRes.colaboradores.filter(c => c.team !== undefined);
          setColaboradores(kept);
          setIsManualMode(true);
        }
      }
    }
    if (data.prod_rate_m3 != null) setProdRateM3(data.prod_rate_m3);
    if (data.prod_rate_pcs != null) setProdRatePcs(data.prod_rate_pcs);
    if (data.prod_unit != null) setProdUnit(data.prod_unit as 'm3' | 'pcs');
  };

  const handleUpdateTeams = (newTeams: TeamConfig[]) => {
    setTeams(newTeams);

    const currentKey = `${params.month}_${params.year}`;
    const dbKey = (params.month !== undefined && params.year !== undefined) ? mesKey(params.month, params.year) : '';
    const shiftsWithTeams = newTeams.length > 0 ? new Set(newTeams.map(t => t.shiftType)) as Set<ShiftType> : new Set<ShiftType>();
    const updatedMesesData = { ...((params as any).meses_data ?? {}) } as Record<string, Colaborador[]>;

    if (dbKey) {
      setDadosMensais(prev => ({
        ...prev,
        [dbKey]: {
          ...(prev[dbKey] ?? criarDadosMes(diasNum)),
          teams: newTeams
        }
      }));
    }

    if (newTeams.length === 0) {
      setColaboradores([]);
      setIsManualMode(true);
      // Clear current month from meses_data
      delete updatedMesesData[currentKey];
      setParams(prev => ({ ...prev, meses_data: updatedMesesData }));
    } else {
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
              escala: Array(diasNum).fill('WORK' as DayStatus),
            });
          }
        }
      }
      const op = params.operation ?? DEFAULT_OPERATION;
      // Rebuild teamSizes matching newTeams
      const newTeamSizes: Record<ShiftType, Record<TeamLetter, number>> = {
        T1: { A: 0, B: 0, C: 0, D: 0 },
        T2: { A: 0, B: 0, C: 0, D: 0 },
        T3: { A: 0, B: 0, C: 0, D: 0 },
      };
      newTeams.forEach(t => {
        const letter = letterFromName(t.name);
        if (newTeamSizes[t.shiftType] && letter in newTeamSizes[t.shiftType]) {
          newTeamSizes[t.shiftType][letter] = t.memberCount;
        }
      });
      const updatedOp = { ...op, teamSizes: newTeamSizes };

      const genRes = generateIntelligentScale(updatedOp, newTeams, colabs, params.month ?? 0, params.year ?? 2026, undefined, params.maxConsecutiveWorkDays, params.rotationSequence);
      const kept = genRes.colaboradores.filter(c => c.team !== undefined);
      setColaboradores(kept);
      setIsManualMode(true);

      // Persist current month into meses_data
      if (kept.length > 0) {
        updatedMesesData[currentKey] = kept;
      } else {
        delete updatedMesesData[currentKey];
      }
      setParams(prev => ({ ...prev, operation: updatedOp, meses_data: updatedMesesData }));
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
      return;
    }
    const scale = generateSchedule(params).map(c => ({
      ...c,
      team: undefined,
      escala: Array(c.escala.length).fill('WORK' as DayStatus),
    }));
    const op = params.operation ?? DEFAULT_OPERATION;
    const genRes = generateIntelligentScale(op, teams, scale, params.month ?? 0, params.year ?? 2026, undefined, params.maxConsecutiveWorkDays, params.rotationSequence);
    const kept = genRes.colaboradores.filter(c => c.team !== undefined);
    setColaboradores(kept);
  };

  // Automatically regenerate scale if maxConsecutiveWorkDays or rotationSequence changes
  useEffect(() => {
    if (isInitialLoadDone && colaboradoresRef.current.length > 0 && teamsRef.current.length > 0) {
      const op = params.operation ?? DEFAULT_OPERATION;
      const result = generateIntelligentScale(
        op,
        teamsRef.current,
        colaboradoresRef.current,
        params.month ?? 0,
        params.year ?? 2026,
        undefined,
        params.maxConsecutiveWorkDays,
        params.rotationSequence
      );
      setColaboradores(result.colaboradores);
      setTeams(result.teams);

      // Regenera as escalas de TODOS os outros meses salvos no meses_data para propagar as regras de rotação
      if (params.meses_data) {
        const updatedMesesData = { ...params.meses_data };
        let hasChanges = false;

        Object.keys(updatedMesesData).forEach(key => {
          const parts = key.split('_');
          if (parts.length === 2) {
            const m = parseInt(parts[0], 10);
            const y = parseInt(parts[1], 10);

            if (m !== params.month || y !== params.year) {
              const oldColabs = updatedMesesData[key];
              if (oldColabs && oldColabs.length > 0) {
                const targetKey = mesKey(m, y);
                const monthTeams = dadosMensais[targetKey]?.teams ?? teamsRef.current;

                const monthResult = generateIntelligentScale(
                  op,
                  monthTeams,
                  oldColabs,
                  m,
                  y,
                  undefined,
                  params.maxConsecutiveWorkDays,
                  params.rotationSequence
                );

                updatedMesesData[key] = monthResult.colaboradores;
                hasChanges = true;
              }
            }
          }
        });

        if (hasChanges) {
          setParams(prev => ({
            ...prev,
            meses_data: updatedMesesData
          }));
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.maxConsecutiveWorkDays, params.rotationSequence, isInitialLoadDone, params.month, params.year, params.operation, dadosMensais]);

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
    params.setor, params.weeks, params.maxConsecutiveWorkDays, params.rotationSequence,
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
        <div className="max-w-[95%] xl:max-w-[92%] 2xl:max-w-[1680px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
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
      <main className="max-w-[95%] xl:max-w-[92%] 2xl:max-w-[1680px] mx-auto px-4 sm:px-8 py-8 space-y-8">
        
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
                  <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-850 flex-wrap gap-1">
                    {(['A', 'B', 'C', 'D', 'E', 'F'] as const).map((scen) => (
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
              <ShiftCards
                horasSemanais={params.horasSemanais}
                cenario={params.cenario}
                customT1Entrada={params.customT1Entrada}
                customT2Entrada={params.customT2Entrada}
                customT3Entrada={params.customT3Entrada}
                onParamsChange={(newParams) => handleParamsChange({ ...params, ...newParams })}
              />
            </section>

            {/* Overlap Timeline component */}
            <section className="print-no-break">
              <ShiftTimeline
                horasSemanais={params.horasSemanais}
                cenario={params.cenario}
                customT1Entrada={params.customT1Entrada}
                customT2Entrada={params.customT2Entrada}
                customT3Entrada={params.customT3Entrada}
              />
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

              {/* Timeline de sobreposições operacionais */}
              <div className="noprint">
                <ShiftTimeline
                  horasSemanais={params.horasSemanais}
                  cenario={params.cenario}
                  customT1Entrada={params.customT1Entrada}
                  customT2Entrada={params.customT2Entrada}
                  customT3Entrada={params.customT3Entrada}
                />
              </div>

              {/* Part 2: Interactive Grid */}
               <CalendarGrid key={`${params.month}_${params.year}`}
                 colaboradores={colaboradores} 
                 diasCount={diasNum} 
                 month={params.month} 
                 year={params.year} 
                 plain={true} 
                 onUpdateColaboradores={handleColaboradoresChange}
                 isManualMode={isManualMode}
                 onToggleManualMode={setIsManualMode}
                 params={params}
                 teams={teams}
                 operation={params.operation ?? DEFAULT_OPERATION}
                 onOperationChange={handleOperationChange}
                 onUpdateTeams={handleUpdateTeams}
                 onParamsChange={handleParamsChange}
                demandaDiariaM3Prop={dadosMes.demandaM3}
                demandaDiariaPcsProp={dadosMes.demandaPcs}
                onDemandaChangeM3={handleDemandaM3Change}
                onDemandaChangePcs={handleDemandaPcsChange}
                pmtM3Prop={dadosMes.pmtM3}
                pmtPcsProp={dadosMes.pmtPcs}
                onPmtM3Change={handlePmtM3Change}
                onPmtPcsChange={handlePmtPcsChange}
                prodRateM3Prop={prodRateM3}
                prodRatePcsProp={prodRatePcs}
                prodUnitProp={prodUnit}
                onProdRateChange={handleProdRateChange}
                dadosMensais={dadosMensais}
                onLoadScenario={handleLoadScenario}
                activeScenarioName={activeScenarioName}
                activeScenarioId={activeScenarioId}
                isScenarioDirty={isScenarioDirty}
                onScenarioSaved={() => setIsScenarioDirty(false)}
              />

              <ScaleValidator 
                colaboradores={colaboradores}
                horasSemanais={params.horasSemanais}
                setor={params.setor}
                maxConsecutiveWorkDays={params.maxConsecutiveWorkDays}
                month={params.month ?? 0}
                year={params.year ?? 2026}
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
