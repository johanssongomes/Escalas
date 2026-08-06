import React, { useState } from 'react';
import type { OperationConfig, ShiftType, TeamLetter, TeamConfig, Colaborador } from '../../types';
import { Sparkles, ChevronDown, ChevronRight, RefreshCw, Layers, ChevronsUpDown, Settings2, Filter } from 'lucide-react';
import { ScenarioManager } from './ScenarioManager';
import { letterFromName } from '../../utils/escala52Engine';

interface OperationConfigPanelProps {
  operation: OperationConfig;
  onChange: (op: OperationConfig) => void;
  onGerarEscala: () => void;
  disabled?: boolean;

  // Grid Controls props
  viewMode: 'grouped' | 'consolidated';
  setViewMode: (mode: 'grouped' | 'consolidated') => void;
  collapsedGroups: string[];
  expandAll: () => void;
  collapseAll: () => void;
  sortedGroupsLength: number;
  selectedShifts: string[];
  toggleShift: (shift: string) => void;
  selectAll: () => void;
  selectNone: () => void;
  setShowTeamManager: (val: boolean) => void;

  // ScenarioManager props
  teams: TeamConfig[];
  params: any;
  colaboradores: Colaborador[];
  dadosMensais: any;
  prodRateM3: number;
  prodRatePcs: number;
  prodUnit: 'm3' | 'pcs';
  activeScenarioName?: string;
  activeScenarioId?: number;
  isScenarioDirty?: boolean;
  onScenarioSaved?: () => void;
  onLoadScenario?: (data: any) => void;
}

const SHIFT_LETTERS: readonly TeamLetter[] = ['A', 'B', 'C', 'D'];
const SHIFT_COLOR: Record<ShiftType, string> = {
  T1: 'bg-emerald-600 text-white',
  T2: 'bg-amber-500 text-white',
  T3: 'bg-indigo-600 text-white',
};
const SHIFT_LABEL: Record<ShiftType, string> = { T1: 'T1', T2: 'T2', T3: 'T3' };

export const OperationConfigPanel: React.FC<OperationConfigPanelProps> = ({
  operation,
  onChange,
  onGerarEscala,
  disabled,
  viewMode,
  setViewMode,
  collapsedGroups,
  expandAll,
  collapseAll,
  sortedGroupsLength,
  selectedShifts,
  toggleShift,
  selectAll,
  selectNone,
  setShowTeamManager,
  teams,
  params,
  colaboradores,
  dadosMensais,
  prodRateM3,
  prodRatePcs,
  prodUnit,
  activeScenarioName,
  activeScenarioId,
  isScenarioDirty,
  onScenarioSaved,
  onLoadScenario,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [generating, setGenerating] = useState(false);

  const updateShift = (shift: ShiftType, partial: Partial<{ memberCount: number; target: number }>) => {
    onChange({
      ...operation,
      shifts: { ...operation.shifts, [shift]: { ...operation.shifts[shift], ...partial } },
    });
  };


  const updateProdRate = (val: number) => {
    onChange({ ...operation, prodRate: val });
  };

  const updateUnit = (unit: 'm3' | 'pcs') => {
    onChange({ ...operation, unit });
  };

  const handleGerar = () => {
    setGenerating(true);
    setTimeout(() => setGenerating(false), 600);
    onGerarEscala();
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm overflow-hidden">
      <div
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between mb-2 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <span className="p-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </span>
          <h4 className="text-xs font-black text-slate-700 dark:text-slate-200">
            Configuração da Operação (WFM 5x2)
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleGerar(); }}
            disabled={disabled || generating}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer shadow-md disabled:opacity-50"
            title="Distribuir todas as folgas do mês respeitando metas e restrições"
          >
            {generating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Gerar Escala
          </button>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="space-y-4 pt-2">
          {/* Integrated Grid Controls Toolbar (linked to expansion state) */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex flex-wrap items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 px-2 py-0.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <span className="text-[9px] font-black text-slate-500 flex items-center gap-0.5 uppercase tracking-wider">
                  <Layers className="w-3 h-3 text-slate-400" />
                  Exibição:
                </span>
                <div className="flex bg-slate-200/60 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-250 dark:border-slate-800">
                  <button
                    onClick={() => setViewMode('grouped')}
                    className={`px-2.5 py-0.5 rounded text-[8.5px] font-black transition duration-200 cursor-pointer ${
                      viewMode === 'grouped'
                        ? 'bg-slate-650 text-white shadow-sm dark:bg-slate-800'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    Equipes
                  </button>
                  <button
                    onClick={() => setViewMode('consolidated')}
                    className={`px-2.5 py-0.5 rounded text-[8.5px] font-black transition duration-200 cursor-pointer ${
                      viewMode === 'consolidated'
                        ? 'bg-slate-650 text-white shadow-sm dark:bg-slate-800'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    Geral
                  </button>
                </div>
              </div>

              {/* Collapse/Expand Control (Only in Grouped) */}
              {viewMode === 'grouped' && (
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 px-2 py-0.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[9px] font-black text-slate-500 flex items-center gap-0.5 uppercase tracking-wider">
                    <ChevronsUpDown className="w-3 h-3 text-slate-400" />
                    Grupos:
                  </span>
                  <div className="flex bg-slate-200/60 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-250 dark:border-slate-800">
                    <button
                      onClick={expandAll}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-black transition cursor-pointer ${
                        collapsedGroups.length === 0
                          ? 'bg-slate-400 text-white dark:bg-slate-850'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                      }`}
                    >
                      Exp
                    </button>
                    <button
                      onClick={collapseAll}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-black transition cursor-pointer ${
                        collapsedGroups.length === sortedGroupsLength
                          ? 'bg-slate-400 text-white dark:bg-slate-850'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                      }`}
                    >
                      Rec
                    </button>
                  </div>
                </div>
              )}

              {/* Shift Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black text-slate-500 flex items-center gap-0.5 uppercase tracking-wider">
                  <Filter className="w-3 h-3 text-slate-400" />
                  Filtro:
                </span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-905 p-0.5 rounded-xl border border-slate-200/50 dark:border-slate-850">
                  <button
                    onClick={() => {
                      if (selectedShifts.length === 3) selectNone();
                      else selectAll();
                    }}
                    className="px-2 py-0.5 rounded text-[8px] font-black transition duration-200 cursor-pointer text-slate-500 hover:text-slate-800 dark:text-slate-400"
                  >
                    {selectedShifts.length === 3 ? 'Nenhum' : 'Todos'}
                  </button>
                  <div className="h-3 w-[1px] bg-slate-350 dark:bg-slate-700 mx-0.5" />
                  {['T3', 'T1', 'T2'].map((shift) => {
                    const isActive = selectedShifts.includes(shift);
                    const label = shift === 'T1' ? 'T1' : shift === 'T2' ? 'T2' : 'T3';
                    return (
                      <button
                        key={shift}
                        onClick={() => toggleShift(shift)}
                        className={`px-2 py-0.5 rounded text-[8px] font-black transition duration-200 cursor-pointer ${
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

            <div className="flex items-center gap-2">
              {/* Gerenciar Equipes Button */}
              <button
                onClick={() => setShowTeamManager(true)}
                className="flex items-center gap-1 px-3 py-1 rounded-xl text-[10px] font-black bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer shadow-sm"
                title="Criar, excluir e distribuir colaboradores entre equipes"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Gerenciar Equipes
              </button>

              <ScenarioManager
                teams={teams}
                params={params}
                colaboradores={colaboradores}
                dados_mensais={dadosMensais}
                prod_rate_m3={prodRateM3}
                prod_rate_pcs={prodRatePcs}
                prod_unit={prodUnit}
                activeScenarioName={activeScenarioName}
                activeScenarioId={activeScenarioId}
                isScenarioDirty={isScenarioDirty}
                onScenarioSaved={onScenarioSaved}
                onLoadScenario={onLoadScenario}
              />
            </div>
          </div>

          {/* Turnos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['T3', 'T1', 'T2'] as ShiftType[]).map(shift => {
              const s = operation.shifts[shift];
              const totalColabs = teams.filter(t => t.shiftType === shift).reduce((sum, t) => sum + t.memberCount, 0);
              return (
                <div key={shift} className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${SHIFT_COLOR[shift]}`}>{SHIFT_LABEL[shift]}</span>
                    <span className="text-[9px] font-bold text-slate-400">{totalColabs} colab.</span>
                  </div>
                  
                  <div className="flex flex-col gap-0.5 pb-1">
                    <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider">Colab.</span>
                    <div className="text-xs font-black text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-1 px-2.5 w-fit shadow-sm">
                      {totalColabs}
                    </div>
                  </div>

                  {/* Equipes do turno */}
                  <div className="text-[9px] space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-500">Equipes:</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {(() => {
                        const activeLetters = teams
                          .filter(t => t.shiftType === shift)
                          .map(t => letterFromName(t.name));
                        const allLetters = Array.from(new Set([...SHIFT_LETTERS, ...activeLetters]));
                        return allLetters.map(letter => {
                          const size = teams.find(t => t.shiftType === shift && letterFromName(t.name) === letter)?.memberCount ?? 0;
                          return (
                            <div key={letter} className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 px-1.5 py-0.5 border border-slate-200 dark:border-slate-800 rounded font-bold text-[9px] text-slate-700 dark:text-slate-350 shadow-sm">
                              <span className="font-extrabold text-slate-500">{letter}:</span>
                              <span className="font-black text-slate-800 dark:text-slate-100">{size}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[9px] text-slate-400 italic">
            Domingo operação fechada (demanda zerada). Rodízio 5x2 com 2 folgas consecutivas — uma delas fim de semana completo (Sáb+Dom). Equipes alternam entre Seg/Ter, Qua/Qui, Qui/Sex, Sáb/Dom. Obtém justiça ao longo do ano via cursor semanal global.
          </p>
        </div>
      )}
    </div>
  );
};