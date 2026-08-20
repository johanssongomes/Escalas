import React, { useState, useMemo, useEffect } from 'react';
import { Search, Calendar, User, Users, Clock, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Colaborador, ScheduleParams, TeamConfig } from '../../types';
import { generateIntelligentScale, DEFAULT_OPERATION, getMonthInfo } from '../../utils/escala52Engine';
import { teamColorOf } from '../../utils/teamColors';

interface EscalaLookupProps {
  colaboradores: Colaborador[];
  params: ScheduleParams;
  teams: TeamConfig[];
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const LETTER_COLOR: Record<string, 'emerald' | 'amber' | 'indigo' | 'rose' | 'sky' | 'violet'> = {
  A: 'emerald',
  B: 'amber',
  C: 'indigo',
  D: 'rose',
  E: 'sky',
  F: 'violet',
};

export const EscalaLookup: React.FC<EscalaLookupProps> = ({ colaboradores, params, teams }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShift, setSelectedShift] = useState<string>('todos');
  const [selectedTeam, setSelectedTeam] = useState<string>('todas');
  const [selectedYear, setSelectedYear] = useState<number>(() => params.year ?? 2026);
  const [selectedColabId, setSelectedColabId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [activeMonthIndex, setActiveMonthIndex] = useState<number>(() => params.month ?? 8); // default to September (index 8)
  const [startMonth, setStartMonth] = useState<number>(0); // default to January (index 0)
  const [endMonth, setEndMonth] = useState<number>(11);    // default to December (index 11)

  // 1. Filtered collaborators list
  const filteredColabs = useMemo(() => {
    return colaboradores.filter((c) => {
      const nameMatch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        c.id.toLowerCase().includes(searchQuery.toLowerCase());
      const shiftMatch = selectedShift === 'todos' || c.turno === selectedShift;
      const teamMatch = selectedTeam === 'todas' || c.team === selectedTeam;
      return nameMatch && shiftMatch && teamMatch;
    });
  }, [colaboradores, searchQuery, selectedShift, selectedTeam]);

  // 1.5 Unique teams list for dropdown based on the selected shift
  const filteredTeamsForDropdown = useMemo(() => {
    let list = teams;
    if (selectedShift !== 'todos') {
      list = teams.filter((t) => t.shiftType === selectedShift);
    }
    const uniqueNames = Array.from(new Set(list.map((t) => t.name)));
    return uniqueNames.sort();
  }, [teams, selectedShift]);

  // Reset selected team when it's no longer present in the filtered teams list
  useEffect(() => {
    if (selectedTeam !== 'todas' && !filteredTeamsForDropdown.includes(selectedTeam)) {
      setSelectedTeam('todas');
    }
  }, [filteredTeamsForDropdown, selectedTeam]);

  // Auto-select first collaborator if none selected
  useMemo(() => {
    if (filteredColabs.length > 0 && (!selectedColabId || !filteredColabs.some(c => c.id === selectedColabId))) {
      setSelectedColabId(filteredColabs[0].id);
    }
  }, [filteredColabs, selectedColabId]);

  const selectedColab = colaboradores.find(c => c.id === selectedColabId);

  // 2. Generate schedules for all 12 months for the selected year
  const projectedYearSchedules = useMemo(() => {
    const baseColabs = colaboradores.map(c => ({
      id: c.id,
      name: c.name,
      turno: c.turno,
      team: c.team,
      escala: []
    }));

    const op = params.operation ?? DEFAULT_OPERATION;

    return Array.from({ length: 12 }, (_, m) => {
      const res = generateIntelligentScale(
        op,
        teams,
        baseColabs,
        m,
        selectedYear,
        undefined,
        params.maxConsecutiveWorkDays,
        params.rotationSequence
      );
      return res.colaboradores;
    });
  }, [colaboradores, teams, params, selectedYear]);

  // Extract selected collaborator's schedules
  const colabSchedulesByMonth = useMemo(() => {
    if (!selectedColabId) return [];
    return projectedYearSchedules.map((monthColabs) => {
      return monthColabs.find(c => c.id === selectedColabId) || null;
    });
  }, [projectedYearSchedules, selectedColabId]);

  // Stats calculation
  const stats = useMemo(() => {
    if (colabSchedulesByMonth.length === 0) return { workDays: 0, offDays: 0, weekendOffs: 0 };
    let workDays = 0;
    let offDays = 0;
    let weekendOffs = 0;

    colabSchedulesByMonth.forEach((monthSchedule, m) => {
      if (!monthSchedule) return;
      monthSchedule.escala.forEach((status, dayIdx) => {
        if (status === 'WORK') {
          workDays++;
        } else {
          offDays++;
          // Check if it is a weekend (Saturday or Sunday)
          const date = new Date(selectedYear, m, dayIdx + 1);
          const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            weekendOffs++;
          }
        }
      });
    });

    return { workDays, offDays, weekendOffs };
  }, [colabSchedulesByMonth, selectedYear]);

  const handlePrint = () => {
    window.print();
  };

  const renderMonthCalendar = (monthIdx: number, scaleData: DayStatus[]) => {
    const monthInfo = getMonthInfo(selectedYear, monthIdx);
    const totalDays = monthInfo.dias;
    const startOffset = monthInfo.startDayOfWeek; // 0 = Mon, 6 = Sun

    // Adjust start offset to match JS calendar (0 = Sun, 1 = Mon, ..., 6 = Sat)
    const jsStartOffset = (startOffset + 1) % 7;

    const days = Array.from({ length: totalDays }, (_, i) => i + 1);
    const blankDays = Array.from({ length: jsStartOffset }, (_, i) => i);

    // Calculate remaining slots to pad the grid to exactly 42 items (6 rows)
    const totalSlots = jsStartOffset + totalDays;
    const remainingSlots = 42 - totalSlots;
    const endBlankDays = Array.from({ length: remainingSlots > 0 ? remainingSlots : 0 }, (_, i) => i);

    const weekdaysLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const turnColors: Record<string, string> = {
      T1: 'bg-emerald-500 text-white dark:bg-emerald-600',
      T2: 'bg-amber-500 text-white dark:bg-amber-600',
      T3: 'bg-purple-500 text-white dark:bg-purple-600',
    };

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-4 shadow-xs select-none">
        <h5 className="font-bold text-xs text-slate-700 dark:text-slate-200 mb-2.5 pb-1.5 border-b border-slate-100 dark:border-slate-800/80 uppercase tracking-wider flex justify-between items-center">
          <span>{MONTH_NAMES[monthIdx]}</span>
          <span className="text-[9px] font-normal text-slate-400 normal-case">
            {scaleData.filter(s => s === 'OFF').length} Folgas
          </span>
        </h5>

        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {weekdaysLabels.map((l) => (
            <span key={l} className="text-[9px] font-black text-slate-400 uppercase">{l}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {blankDays.map((_, i) => (
            <div key={`blank-start-${i}`} className="h-6" />
          ))}

          {days.map((day) => {
            const status = scaleData[day - 1];
            const isWork = status === 'WORK';

            let statusClass = 'bg-slate-50 text-slate-400 dark:bg-slate-950/20';
            if (isWork) {
              statusClass = turnColors[selectedColab?.turno || 'T1'] || 'bg-blue-500 text-white';
            } else {
              statusClass = 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-solid border-blue-200 dark:border-blue-900/50 font-black';
            }

            return (
              <div
                key={day}
                title={isWork ? `Trabalho (${selectedColab?.turno})` : 'Folga (F)'}
                className={`h-6 text-[10px] font-bold rounded-lg flex items-center justify-center transition-all ${statusClass}`}
              >
                {isWork ? day : 'F'}
              </div>
            );
          })}

          {endBlankDays.map((_, i) => (
            <div key={`blank-end-${i}`} className="h-6" />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header section (noprint) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm noprint">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Consulta de Escala & Folgas
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Visualize as folgas do mês e a projeção anual de qualquer colaborador</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-850">
            {[2025, 2026, 2027].map((yr) => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition duration-200 cursor-pointer ${
                  selectedYear === yr
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black transition cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            Imprimir Escala
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
        
        {/* Left Side: Filter and search panel (noprint) */}
        <div className="space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm noprint">
          <h3 className="font-extrabold text-xs text-slate-700 dark:text-slate-350 uppercase tracking-widest pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
            <Search className="w-4 h-4 text-slate-400" />
            Filtros de Busca
          </h3>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Pesquisar por nome ou ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-xl pl-9 pr-4 py-2 focus:ring-1 focus:ring-blue-500 focus:outline-none font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Shift Select */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Turno</label>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-xl p-2 font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="todos">Todos os Turnos</option>
              <option value="T1">1º Turno (T1)</option>
              <option value="T2">2º Turno (T2)</option>
              <option value="T3">3º Turno (T3)</option>
            </select>
          </div>

          {/* Team Select */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Equipe</label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-xl p-2 font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="todas">Todas as Equipes</option>
              {filteredTeamsForDropdown.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Results List */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Resultados ({filteredColabs.length})
            </span>

            <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {filteredColabs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Nenhum colaborador encontrado</p>
              ) : (
                filteredColabs.map((colab) => {
                  const turnColorMap: Record<string, 'emerald' | 'amber' | 'violet'> = {
                    T1: 'emerald',
                    T2: 'amber',
                    T3: 'violet',
                  };
                  const color = teamColorOf(turnColorMap[colab.turno] || 'gray');
                  return (
                    <button
                      key={colab.id}
                      onClick={() => setSelectedColabId(colab.id)}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition text-xs font-bold border ${
                        selectedColabId === colab.id
                          ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400'
                          : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${color.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{colab.name || `Colaborador ${colab.id}`}</p>
                        <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                          {colab.turno} • {colab.team || 'Sem Equipe'}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Selected Collaborator Scale Display */}
        <div className="space-y-6">
          {!selectedColab ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
              <User className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Nenhum Colaborador Selecionado</h3>
              <p className="text-xs text-slate-400 mt-1">Busque e selecione um colaborador na barra lateral para ver suas escalas.</p>
            </div>
          ) : (
            <>
              {/* Collaborator Profile Banner */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl">
                    <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                      {selectedColab.name || `Colaborador ${selectedColab.id}`}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-bold mt-1">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {selectedColab.turno}</span>
                      <span className="h-3 w-[1px] bg-slate-200 dark:bg-slate-800" />
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {selectedColab.team || 'Sem Equipe'}</span>
                      <span className="h-3 w-[1px] bg-slate-200 dark:bg-slate-800" />
                      <span>ID: {selectedColab.id}</span>
                    </div>
                  </div>
                </div>

                {/* Micro Stats (Annual) */}
                <div className="grid grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6 w-full md:w-auto shrink-0 select-none">
                  <div className="text-center md:text-left">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trabalho (Ano)</p>
                    <p className="text-base font-black text-slate-700 dark:text-slate-200 mt-0.5">{stats.workDays} dias</p>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Folgas (Ano)</p>
                    <p className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5">{stats.offDays} dias</p>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">FDS Folga (Ano)</p>
                    <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.weekendOffs} dias</p>
                  </div>
                </div>
              </div>

              {/* View Mode Tabs (noprint) */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 pb-px noprint">
                <button
                  onClick={() => setViewMode('monthly')}
                  className={`pb-3 text-xs font-bold transition relative cursor-pointer ${
                    viewMode === 'monthly'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  Visão Mensal Detalhada
                </button>
                <button
                  onClick={() => setViewMode('yearly')}
                  className={`pb-3 text-xs font-bold transition relative cursor-pointer ${
                    viewMode === 'yearly'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  Visão Anual Projetada
                </button>
              </div>

              {/* View Mode Render */}
              {viewMode === 'monthly' ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
                  {/* Month Selector in Monthly Mode */}
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-2 border border-slate-200/50 dark:border-slate-855 rounded-2xl max-w-sm mx-auto select-none noprint">
                    <button
                      onClick={() => setActiveMonthIndex(prev => Math.max(0, prev - 1))}
                      disabled={activeMonthIndex === 0}
                      className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-350" />
                    </button>
                    <span className="text-xs font-extrabold uppercase text-slate-700 dark:text-slate-200">
                      {MONTH_NAMES[activeMonthIndex]} / {selectedYear}
                    </span>
                    <button
                      onClick={() => setActiveMonthIndex(prev => Math.min(11, prev + 1))}
                      disabled={activeMonthIndex === 11}
                      className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-350" />
                    </button>
                  </div>

                  {/* Render Month Calendar */}
                  {colabSchedulesByMonth[activeMonthIndex] ? (
                    <div className="max-w-md mx-auto">
                      {renderMonthCalendar(activeMonthIndex, colabSchedulesByMonth[activeMonthIndex]!.escala)}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-12">Sem escala disponível para este mês</p>
                  )}
                </div>
              ) : (
                /* Yearly View: Responsive grid of all 12 mini calendars with range selection */
                <div className="space-y-4">
                  {/* Selectors for Start and End Month (noprint) */}
                  <div className="flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200/50 dark:border-slate-855 rounded-2xl select-none noprint">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Mês Inicial:</span>
                      <select
                        value={startMonth}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setStartMonth(val);
                          if (val > endMonth) setEndMonth(val);
                        }}
                        className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 font-bold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        {MONTH_NAMES.map((name, i) => (
                          <option key={i} value={i}>{name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Mês Final:</span>
                      <select
                        value={endMonth}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEndMonth(val);
                          if (val < startMonth) setStartMonth(val);
                        }}
                        className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 font-bold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        {MONTH_NAMES.map((name, i) => (
                          <option key={i} value={i} disabled={i < startMonth}>{name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {colabSchedulesByMonth.map((monthSchedule, index) => {
                      if (!monthSchedule || index < startMonth || index > endMonth) return null;
                      return (
                        <div key={index} className="print-no-break">
                          {renderMonthCalendar(index, monthSchedule.escala)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
