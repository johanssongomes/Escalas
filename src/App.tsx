import { useState, useEffect } from 'react';
import { ShiftCards } from './components/Schedule/ShiftCards';
import { ParametersForm } from './components/Schedule/ParametersForm';
import { CompliancePanel } from './components/Schedule/CompliancePanel';
import { CalendarGrid } from './components/Schedule/CalendarGrid';
import { CoverageTable } from './components/Schedule/CoverageTable';
import { ExportActions } from './components/Schedule/ExportActions';
import { Indicators } from './components/Dashboard/Indicators';
import { Charts } from './components/Dashboard/Charts';
import { ShiftTimeline } from './components/Dashboard/ShiftTimeline';
import { generateSchedule } from './utils/scheduleEngine';
import { calculateDailyCoverage, calculateWeeklyCoverage } from './utils/coverageEngine';
import { calculateIndicators } from './utils/dashboardEngine';
import type { ScheduleParams, Colaborador, TeamConfig, DayStatus } from './types';
import { ShieldCheck, Truck, Moon, Sun, BarChart3, Calendar, Users } from 'lucide-react';
import { ProductivitySimulator } from './components/Dashboard/ProductivitySimulator';
import { CollaboratorSimulator } from './components/Dashboard/CollaboratorSimulator';

function App() {
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
  const [activeTab, setActiveTab] = useState<'escala' | 'produtividade' | 'colaboradores'>('escala');

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
    if (colaboradores.length > 0) {
      localStorage.setItem('escala_colaboradores_auto', JSON.stringify(colaboradores));
    }
  }, [colaboradores]);

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

          // Generate pattern for this team
          const escala = Array.from({ length: dias }, (_, d) => {
            const dw = (startDay + d) % 7;
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

  const handleUpdateTeams = (newTeams: TeamConfig[]) => {
    setTeams(newTeams);
    const startDay = (params.month !== undefined && params.year !== undefined)
      ? (new Date(params.year, params.month, 1).getDay() + 6) % 7
      : 0;
    const dias = (params.month !== undefined && params.year !== undefined)
      ? new Date(params.year, params.month + 1, 0).getDate()
      : params.dias;
    const updated = applyTeamsToColaboradores(colaboradores, newTeams, startDay, dias);
    setColaboradores(updated);
    setIsManualMode(true);
  };

  const [isManualMode, setIsManualMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('escala_colaboradores_auto');
    }
    return false;
  });


  const [prevMonthYear, setPrevMonthYear] = useState<{ month?: number; year?: number }>({
    month: params.month,
    year: params.year
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
  };

  // Run on initial mount or parameters change (only if not in manual mode)
  useEffect(() => {
    if (!isManualMode) {
      handleRecalculate();
    }
  }, [params, isManualMode]);

  // Save schedule per month/year so changes persist when navigating between months
  useEffect(() => {
    if (params.month !== prevMonthYear.month || params.year !== prevMonthYear.year) {
      if (colaboradores.length > 0 && prevMonthYear.month !== undefined && prevMonthYear.year !== undefined) {
        localStorage.setItem(
          `escala_saved_${prevMonthYear.month}_${prevMonthYear.year}`,
          JSON.stringify(colaboradores)
        );
      }
      const savedKey = `escala_saved_${params.month}_${params.year}`;
      const saved = localStorage.getItem(savedKey);
      if (saved) {
        try {
          setColaboradores(JSON.parse(saved));
          setIsManualMode(true);
          setPrevMonthYear({ month: params.month, year: params.year });
          return;
        } catch {}
      }
      setIsManualMode(false);
      handleRecalculate();
      setPrevMonthYear({ month: params.month, year: params.year });
    }
  }, [params.month, params.year]);



  const dailyCoverage = calculateDailyCoverage(colaboradores, params.dias);
  const weeklyCoverage = calculateWeeklyCoverage(dailyCoverage);
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

          <div className="flex items-center gap-4">
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
            onClick={() => setActiveTab('escala')}
            className={`pb-3 text-sm font-bold transition relative flex items-center gap-2 cursor-pointer ${
              activeTab === 'escala'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Calendário & Escala
          </button>
          <button
            onClick={() => setActiveTab('produtividade')}
            className={`pb-3 text-sm font-bold transition relative flex items-center gap-2 cursor-pointer ${
              activeTab === 'produtividade'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Simulador de Produtividade
          </button>
          <button
            onClick={() => setActiveTab('colaboradores')}
            className={`pb-3 text-sm font-bold transition relative flex items-center gap-2 cursor-pointer ${
              activeTab === 'colaboradores'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Simulador de Colaboradores
          </button>
        </div>

        {activeTab === 'escala' ? (
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
                        onClick={() => setParams({ ...params, horasSemanais: hours as 40 | 42 | 44 })}
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
                        onClick={() => setParams({ ...params, cenario: scen })}
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

            {/* Unified Planning & Scale Card (Module 2, 4 & 9) */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm mb-8 space-y-6 print-break-after">
              <div className="flex items-center gap-2 mb-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                <Calendar className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                    Calendário de Planejamento & Parâmetros (28 Dias)
                  </h3>
                  <p className="text-[11px] text-slate-400">Ajuste as metas de Hc, regras da CLT e veja o impacto imediatamente na escala</p>
                </div>
              </div>

              {/* Part 1: Parameters Form */}
              <div className="noprint">
                <ParametersForm
                  initialValues={params}
                  onChange={setParams}
                  plain={true}
                />
              </div>

              {/* Divider */}
              <div className="border-t border-slate-200 dark:border-slate-800/80 my-4 noprint"></div>

              {/* Part 2: Interactive Grid */}
              <CalendarGrid 
                colaboradores={colaboradores} 
                diasCount={params.dias} 
                month={params.month} 
                year={params.year} 
                plain={true} 
                onUpdateColaboradores={setColaboradores}
                isManualMode={isManualMode}
                onToggleManualMode={setIsManualMode}
                params={params}
                teams={teams}
                onUpdateTeams={handleUpdateTeams}
              />
            </section>

            {/* Module 5 & 6: Coverage Tables */}
            <section className="print-no-break">
              <CoverageTable dailyCoverage={dailyCoverage} weeklyCoverage={weeklyCoverage} />
            </section>
          </>
        ) : activeTab === 'produtividade' ? (
          <ProductivitySimulator colaboradores={colaboradores} params={params} />
        ) : (
          <CollaboratorSimulator
            colaboradores={colaboradores}
            setColaboradores={setColaboradores}
            params={params}
            onReset={handleRecalculate}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400 mt-12 noprint">
        <p>© 2026 Magalog Distribuição. Todos os direitos reservados. Em conformidade com a Consolidação das Leis do Trabalho (CLT).</p>
      </footer>
    </div>
  );
}

export default App;
