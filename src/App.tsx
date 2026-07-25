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
import { supabase } from './utils/supabaseClient';

function App() {
  const [dbLoading, setDbLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'saving' | 'error'>('synced');
  const [isInitialLoadDone, setIsInitialLoadDone] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      return saved !== null ? saved === 'true' : false;
    }
    return false;
  });
  const [params, setParams] = useState<ScheduleParams>(() => {
    const today = new Date();
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('scheduleParams');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.month === undefined) parsed.month = today.getMonth();
          if (parsed.year === undefined) parsed.year = today.getFullYear();
          return parsed;
        } catch (e) {
          console.error("Failed to parse scheduleParams from localStorage", e);
        }
      }
    }
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

  useEffect(() => {
    localStorage.setItem('scheduleParams', JSON.stringify(params));
  }, [params]);

  const [colaboradores, setColaboradores] = useState<Colaborador[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('escala_colaboradores_auto');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return [];
  });

  const [activeTab, setActiveTab] = useState<'painel' | 'planejador'>('planejador');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [teams, setTeams] = useState<TeamConfig[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('escala_teams_config');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('escala_teams_config', JSON.stringify(teams));
  }, [teams]);

  // Auto-save colaboradores whenever they change in manual mode
  useEffect(() => {
    localStorage.setItem('escala_colaboradores_auto', JSON.stringify(colaboradores));
  }, [colaboradores]);

  const [demandaDiariaM3, setDemandaDiariaM3] = useState<{ [key: string]: number[] }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('demandaDiaria_m3') || localStorage.getItem('demandaDiaria');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return { T1: Array(28).fill(0), T2: Array(28).fill(0), T3: Array(28).fill(0) };
  });

  const [demandaDiariaPcs, setDemandaDiariaPcs] = useState<{ [key: string]: number[] }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('demandaDiaria_pcs');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return { T1: Array(28).fill(0), T2: Array(28).fill(0), T3: Array(28).fill(0) };
  });

  // State wrappers to automatically set the dirty flag on user edits
  const handleParamsChange = (newParams: ScheduleParams | ((prev: ScheduleParams) => ScheduleParams)) => {
    const resolved = typeof newParams === 'function' ? newParams(params) : newParams;

    // Detect month/year change and persist/load colaboradores in the SAME render
    if (isInitialLoadDone && resolved.month !== undefined && resolved.month >= 0 &&
        (resolved.month !== params.month || resolved.year !== params.year)) {
      // Save current month's colaboradores before leaving it
      if (colaboradores.length > 0 && params.month !== undefined && params.month >= 0 && params.year !== undefined) {
        localStorage.setItem(
          `escala_saved_${params.month}_${params.year}`,
          JSON.stringify(colaboradores)
        );
      }
      // Compute correct days for the target month (dias in resolved may still be stale)
      const targetDias = (resolved.year !== undefined)
        ? new Date(resolved.year, resolved.month + 1, 0).getDate()
        : resolved.dias ?? 30;

      const savedKey = `escala_saved_${resolved.month}_${resolved.year}`;
      const saved = localStorage.getItem(savedKey);
      if (saved) {
        try {
          setColaboradores(JSON.parse(saved));
          setIsManualMode(true);
        } catch {}
      } else {
        const scale = generateSchedule({ ...resolved, dias: targetDias }).map(c => ({
          ...c,
          team: undefined,
          escala: Array(targetDias).fill('WORK' as DayStatus),
        }));
        setColaboradores(scale);
        setIsManualMode(false);
      }
    }

    setParams(resolved);
    setIsDirty(true);
  };

  const handleColaboradoresChange = (newColabs: Colaborador[]) => {
    setColaboradores(newColabs);
    setIsDirty(true);
  };

  const handleDemandaM3Change = (newDemanda: { [key: string]: number[] }) => {
    setDemandaDiariaM3(newDemanda);
    setIsDirty(true);
  };

  const handleDemandaPcsChange = (newDemanda: { [key: string]: number[] }) => {
    setDemandaDiariaPcs(newDemanda);
    setIsDirty(true);
  };

  // Load from Supabase on init
  useEffect(() => {
    const client = supabase;
    if (!client) {
      console.warn("Supabase não configurado. Rodando em modo local.");
      setDbLoading(false);
      return;
    }
    const activeClient = client;
    async function loadData() {
      try {
        const { data, error } = await activeClient.from('escala_config').select('*').eq('id', 1).single();
        if (error) {
          console.error("Erro ao carregar dados do Supabase:", error);
        } else if (data) {
          let loadedColabs: Colaborador[] = [];
          let loadedTeams: TeamConfig[] = [];

          if (data.teams && Array.isArray(data.teams)) {
            loadedTeams = data.teams;
            setTeams(loadedTeams);
            localStorage.setItem('escala_teams_config', JSON.stringify(loadedTeams));
          }

          if (data.colaboradores && Array.isArray(data.colaboradores)) {
            loadedColabs = data.colaboradores;

            if (loadedColabs.length > 0) {
              // Check if the DB has corrupted data: colabs exist but none have a team assigned
              const hasTeamData = loadedColabs.some(c => c.team !== undefined && c.team !== null);
              const hasEscalaData = loadedColabs.some(c => c.escala && c.escala.some(d => d !== 'WORK'));

              if (!hasTeamData && !hasEscalaData && loadedTeams.length > 0 && data.params) {
                // Auto-recover: DB has wiped state — re-apply teams now
                console.warn("DB tem dados zerados — reaplicando equipes automaticamente...");
                const sDay = (data.params.month !== undefined && data.params.year !== undefined)
                  ? (new Date(data.params.year, data.params.month, 1).getDay() + 6) % 7
                  : 0;
                const dias = (data.params.month !== undefined && data.params.year !== undefined)
                  ? new Date(data.params.year, data.params.month + 1, 0).getDate()
                  : (data.params.dias ?? 28);

                // We can't call applyTeamsToColaboradores here (it's defined later in the component)
                // so we inline a minimal version for recovery
                const recovered = [...loadedColabs];
                const shifts = ['T1', 'T2', 'T3'] as const;
                for (const shift of shifts) {
                  const shiftColabs = recovered.filter(c => c.turno === shift);
                  const shiftTeams = loadedTeams.filter(t => t.shiftType === shift);
                  let cursor = 0;
                  for (const team of shiftTeams) {
                    for (let i = 0; i < team.memberCount && cursor < shiftColabs.length; i++) {
                      const colab = shiftColabs[cursor];
                      const pat = team.offPattern;
                      const escala = Array.from({ length: dias }, (_, d) => {
                        const dw = (sDay + d) % 7;
                        if (Array.isArray(pat)) return (dw === pat[0] || dw === pat[1]) ? 'OFF' : 'WORK';
                        const isOff = pat === 4 ? (dw === 4 || dw === 5) : pat === 5 ? (dw === 5 || dw === 6) : (dw === 6 || dw === 0);
                        return isOff ? 'OFF' : 'WORK';
                      }) as DayStatus[];
                      const idx = recovered.findIndex(c => c.id === colab.id);
                      if (idx !== -1) recovered[idx] = { ...recovered[idx], team: team.name, escala };
                      cursor++;
                    }
                  }
                }
                loadedColabs = recovered;
                // Save the recovered state back to Supabase immediately
                try {
                  await activeClient.from('escala_config').upsert({
                    id: 1,
                    colaboradores: recovered,
                    teams: loadedTeams,
                    params: data.params,
                    demanda_m3: data.demanda_m3,
                    demanda_pcs: data.demanda_pcs,
                    updated_at: new Date().toISOString(),
                  });
                  console.log("Estado recuperado e salvo no banco com sucesso.");
                } catch (saveErr) {
                  console.error("Erro ao salvar estado recuperado:", saveErr);
                }
              }
            }

            setColaboradores(loadedColabs);
            localStorage.setItem('escala_colaboradores_auto', JSON.stringify(loadedColabs));
            setIsManualMode(true);
          }

          if (data.params && typeof data.params === 'object' && Object.keys(data.params).length > 0) {
            setParams(data.params);
            localStorage.setItem('scheduleParams', JSON.stringify(data.params));
            // Restore all months' colaboradores from meses_data if available
            const mesesData = (data.params as any).meses_data as Record<string, Colaborador[]> | undefined;
            if (mesesData) {
              for (const [key, colabs] of Object.entries(mesesData)) {
                localStorage.setItem(`escala_saved_${key}`, JSON.stringify(colabs));
              }
              // If current view's month has data in meses, use it
              const viewKey = `${data.params.month}_${data.params.year}`;
              if (mesesData[viewKey] && (!data.colaboradores || !Array.isArray(data.colaboradores) || data.colaboradores.length === 0)) {
                setColaboradores(mesesData[viewKey]);
                localStorage.setItem('escala_colaboradores_auto', JSON.stringify(mesesData[viewKey]));
                setIsManualMode(true);
              }
            }
          }
          if (data.demanda_m3) {
            setDemandaDiariaM3(data.demanda_m3);
            localStorage.setItem('demandaDiaria_m3', JSON.stringify(data.demanda_m3));
          }
          if (data.demanda_pcs) {
            setDemandaDiariaPcs(data.demanda_pcs);
            localStorage.setItem('demandaDiaria_pcs', JSON.stringify(data.demanda_pcs));
          }
        }
      } catch (err) {
        console.error("Falha de conexão com o banco de dados:", err);
      } finally {
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
      }, 800);
      return () => clearTimeout(t);
    }
  }, [dbLoading]);

  // Debounced Auto-save to Supabase — only fires when user makes an explicit change
  useEffect(() => {
    const client = supabase;
    if (!isInitialLoadDone || !client || !isDirty) return;

    setSyncStatus('pending');

    const delayDebounce = setTimeout(async () => {
      setSyncStatus('saving');
      // Build meses_data from all localStorage saved months + current
      const mesesData: Record<string, Colaborador[]> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('escala_saved_')) {
          const saved = localStorage.getItem(key);
          if (saved) {
            try { mesesData[key.replace('escala_saved_', '')] = JSON.parse(saved); } catch {}
          }
        }
      }
      const currentKey = `${params.month}_${params.year}`;
      if (colaboradores.length > 0 || mesesData[currentKey]) {
        mesesData[currentKey] = colaboradores;
      }

      try {
        const { error } = await client
          .from('escala_config')
          .upsert({
            id: 1,
            colaboradores,
            teams,
            params: { ...params, meses_data: mesesData },
            demanda_m3: demandaDiariaM3,
            demanda_pcs: demandaDiariaPcs,
            updated_at: new Date().toISOString(),
          });
        if (error) {
          console.error("Erro ao salvar no banco:", error);
          setSyncStatus('error');
        } else {
          setSyncStatus('synced');
          setIsDirty(false);
        }
      } catch (err) {
        console.error("Erro ao salvar no banco:", err);
        setSyncStatus('error');
      }
    }, 1500);

    return () => clearTimeout(delayDebounce);
  // NOTE: colaboradores/teams/params are NOT in the dep array — we only want this to fire when isDirty flips true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, isInitialLoadDone]);

  // Refs to avoid tearing down the realtime channel on every state change
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const colaboradoresRef = useRef(colaboradores);
  colaboradoresRef.current = colaboradores;
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  const syncStatusRef = useRef(syncStatus);
  syncStatusRef.current = syncStatus;

  // Real-time listener for changes from other users
  useEffect(() => {
    const client = supabase;
    if (!isInitialLoadDone || !client) return;

    const channel = client
      .channel('escala_realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'escala_config' },
        (payload) => {
          console.log("Recebido update via Realtime:", payload.new);
          const newDoc = payload.new as any;
          if (newDoc && newDoc.id === 1) {
            // Use refs to read latest state without closing over stale values
            const currentIsDirty = isDirtyRef.current;
            const currentSyncStatus = syncStatusRef.current;
            const currentColabs = colaboradoresRef.current;
            const currentParams = paramsRef.current;

            if (!currentIsDirty && currentSyncStatus !== 'saving') {
              // Save current colaboradores to their month key before accepting updates
              if (currentColabs.length > 0 && currentParams.month !== undefined && currentParams.year !== undefined) {
                localStorage.setItem(
                  `escala_saved_${currentParams.month}_${currentParams.year}`,
                  JSON.stringify(currentColabs)
                );
              }

              // Always update teams (global config)
              if (newDoc.teams) {
                setTeams(newDoc.teams);
                localStorage.setItem('escala_teams_config', JSON.stringify(newDoc.teams));
              }

              // Use meses_data (all months) if available — this is the global sync approach
              const mesesData = newDoc.params?.meses_data as Record<string, Colaborador[]> | undefined;
              if (mesesData) {
                // Restore every month into localStorage
                for (const [key, colabs] of Object.entries(mesesData)) {
                  localStorage.setItem(`escala_saved_${key}`, JSON.stringify(colabs));
                }
                // Set current view's colaboradores from meses_data
                const viewKey = `${currentParams.month}_${currentParams.year}`;
                if (mesesData[viewKey]) {
                  setColaboradores(mesesData[viewKey]);
                  localStorage.setItem('escala_colaboradores_auto', JSON.stringify(mesesData[viewKey]));
                }
              } else {
                // Legacy fallback: single-month colaboradores
                const remoteMonth = newDoc.params?.month;
                const remoteYear = newDoc.params?.year;
                if (newDoc.colaboradores && remoteMonth !== undefined && remoteYear !== undefined) {
                  localStorage.setItem(
                    `escala_saved_${remoteMonth}_${remoteYear}`,
                    JSON.stringify(newDoc.colaboradores)
                  );
                }
                if (remoteMonth === currentParams.month && remoteYear === currentParams.year && newDoc.colaboradores) {
                  setColaboradores(newDoc.colaboradores);
                  localStorage.setItem('escala_colaboradores_auto', JSON.stringify(newDoc.colaboradores));
                }
              }

              // Update params but preserve our month/year so we don't jump views
              if (newDoc.params) {
                const { month, year, meses_data, ...restParams } = newDoc.params;
                setParams(prev => ({ ...prev, ...restParams, meses_data: mesesData ?? prev.meses_data }));
                const saved = localStorage.getItem('scheduleParams');
                if (saved) {
                  try {
                    const parsed = JSON.parse(saved);
                    Object.assign(parsed, restParams);
                    if (mesesData) parsed.meses_data = mesesData;
                    localStorage.setItem('scheduleParams', JSON.stringify(parsed));
                  } catch {}
                }
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [isInitialLoadDone]);

  // Distribute collaborators to teams based on the configured memberCount
  const applyTeamsToColaboradores = (colabs: Colaborador[], newTeams: TeamConfig[], startDay: number, dias: number): Colaborador[] => {
    const result = [...colabs];
    const shifts = ['T1', 'T2', 'T3'] as const;

    for (const shift of shifts) {
      // Find all collaborators in this shift
      const shiftColabs = result.filter(c => c.turno === shift);
      // Find all teams created for this shift
      const shiftTeams = newTeams.filter(t => t.shiftType === shift);

      let cursor = 0;
      // Loop through each team and assign the corresponding number of collaborators
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

          // Find this collaborator in the main list and update them
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

      // For any remaining collaborators who didn't fit into any team, they go to the waiting area
      while (cursor < shiftColabs.length) {
        const colab = shiftColabs[cursor];
        const colabIdx = result.findIndex(c => c.id === colab.id);
        if (colabIdx !== -1) {
          result[colabIdx] = {
            ...result[colabIdx],
            team: undefined,
            escala: Array(dias).fill('WORK' as DayStatus) // Clear/gray escala in active days
          };
        }
        cursor++;
      }
    }

    return result;
  };

  const saveToDatabase = async (
    colabs: Colaborador[],
    tms: TeamConfig[],
    pms: ScheduleParams,
    demM3: typeof demandaDiariaM3,
    demPcs: typeof demandaDiariaPcs
  ) => {
    const client = supabase;
    if (!client) return;
    setSyncStatus('saving');

    // Build meses_data from all localStorage saved months + current
    const mesesData: Record<string, Colaborador[]> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('escala_saved_')) {
        const saved = localStorage.getItem(key);
        if (saved) {
          try { mesesData[key.replace('escala_saved_', '')] = JSON.parse(saved); } catch {}
        }
      }
    }
    const currentKey = `${pms.month}_${pms.year}`;
    if (colabs.length > 0 || mesesData[currentKey]) {
      mesesData[currentKey] = colabs;
    }

    try {
      const { error } = await client
        .from('escala_config')
        .upsert({
          id: 1,
          colaboradores: colabs,
          teams: tms,
          params: { ...pms, meses_data: mesesData },
          demanda_m3: demM3,
          demanda_pcs: demPcs,
          updated_at: new Date().toISOString(),
        });
      if (error) {
        console.error("Erro ao salvar no banco:", error);
        setSyncStatus('error');
      } else {
        setSyncStatus('synced');
        setIsDirty(false);
      }
    } catch (err) {
      console.error("Erro ao salvar no banco:", err);
      setSyncStatus('error');
    }
  };

  const handleUpdateTeams = (newTeams: TeamConfig[]) => {
    setTeams(newTeams);
    if (newTeams.length === 0) {
      setColaboradores([]);
      setIsManualMode(true);
      setIsDirty(false);
      saveToDatabase([], newTeams, params, demandaDiariaM3, demandaDiariaPcs);
    } else {
      const startDay = (params.month !== undefined && params.year !== undefined)
        ? (new Date(params.year, params.month, 1).getDay() + 6) % 7
        : 0;
      const dias = (params.month !== undefined && params.year !== undefined)
        ? new Date(params.year, params.month + 1, 0).getDate()
        : params.dias;

      const shiftsWithTeams = new Set(newTeams.map(t => t.shiftType));
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
      setIsDirty(false);
      saveToDatabase(kept, newTeams, params, demandaDiariaM3, demandaDiariaPcs);
    }

    // Propagate team changes to ALL saved months in localStorage
    const currentKey = `escala_saved_${params.month}_${params.year}`;
    const shiftsWithTeams = newTeams.length > 0 ? new Set(newTeams.map(t => t.shiftType)) as Set<ShiftType> : new Set<ShiftType>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('escala_saved_') || key === currentKey) continue;

      const saved = localStorage.getItem(key);
      if (!saved) continue;
      try {
        const parts = key.split('_');
        const m = parseInt(parts[2]);
        const y = parseInt(parts[3]);
        if (isNaN(m) || isNaN(y)) continue;

        if (newTeams.length === 0) {
          localStorage.setItem(key, JSON.stringify([]));
        } else {
          const savedStartDay = (new Date(y, m, 1).getDay() + 6) % 7;
          const savedDias = new Date(y, m + 1, 0).getDate();
          let monthColabs = (JSON.parse(saved) as Colaborador[]).filter(c => shiftsWithTeams.has(c.turno));

          for (const shift of shiftsWithTeams) {
            const shiftTeams = newTeams.filter(t => t.shiftType === shift);
            const totalNeeded = shiftTeams.reduce((sum, t) => sum + t.memberCount, 0);
            const existing = monthColabs.filter(c => c.turno === shift).length;
            const missing = totalNeeded - existing;

            if (missing > 0) {
              for (let j = 0; j < missing; j++) {
                monthColabs.push({
                  id: `${shift}-${String(existing + j + 1).padStart(3, '0')}`,
                  turno: shift,
                  escala: Array(savedDias).fill('WORK' as DayStatus),
                });
              }
            }
          }

          const updated = applyTeamsToColaboradores(monthColabs, newTeams, savedStartDay, savedDias);
          localStorage.setItem(key, JSON.stringify(updated.filter(c => c.team !== undefined)));
        }
      } catch {}
    }
  };

  const [isManualMode, setIsManualMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('escala_colaboradores_auto');
    }
    return false;
  });


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
    const scale = generateSchedule(params).map(c => ({
      ...c,
      team: undefined,
      escala: Array(c.escala.length).fill('WORK' as DayStatus),
    }));
    setColaboradores(scale);
    setIsDirty(true);
  };

  // Run on initial mount or parameters change (only if not in manual mode)
  useEffect(() => {
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
          <p className="font-bold text-sm tracking-wide">Carregando dados da nuvem (Supabase)...</p>
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
            {/* Cloud Sync Status (Auto-save) */}
            <div className="flex items-center gap-2 bg-white/10 border border-white/20 p-2.5 px-4 rounded-xl backdrop-blur-md text-xs">
              <span className="font-bold uppercase tracking-wider text-[9.5px]">
                {syncStatus === 'synced' && <span className="text-emerald-400">● Sincronizado</span>}
                {syncStatus === 'pending' && <span className="text-amber-400">● Salvando automaticamente...</span>}
                {syncStatus === 'saving' && <span className="text-blue-300 animate-pulse">● Salvando na Nuvem...</span>}
                {syncStatus === 'error' && <span className="text-rose-400">● Erro ao salvar</span>}
              </span>
            </div>

            {/* Manual Save Button */}
            <button
              onClick={() => {
                setIsDirty(false);
                saveToDatabase(colaboradores, teams, params, demandaDiariaM3, demandaDiariaPcs);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-750 text-white transition cursor-pointer shadow-md hover:shadow-lg"
              title="Salvar dados na nuvem imediatamente"
            >
              Salvar na Nuvem
            </button>

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
                      Calendário de Planejamento & Parâmetros (28 Dias)
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
              <CalendarGrid 
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
                onUpdateTeams={handleUpdateTeams}
                demandaDiariaM3Prop={demandaDiariaM3}
                demandaDiariaPcsProp={demandaDiariaPcs}
                onDemandaChangeM3={handleDemandaM3Change}
                onDemandaChangePcs={handleDemandaPcsChange}
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
