import React, { useMemo } from 'react';
import {
  X, Users, Calendar, BarChart3, CalendarRange,
  User as UserIcon, Clock,
} from 'lucide-react';
import type { Colaborador, TeamConfig, ShiftType } from '../../types';
import { teamColorOf } from '../../utils/teamColors';
import { letterFromName, teamBaseOffset, getWeekCursor } from '../../utils/escala52Engine';

interface TeamPanelProps {
  team: TeamConfig;
  colaboradores: Colaborador[];
  month: number;
  year: number;
  prodRate: number;
  onClose: () => void;
}

const SHIFT_LABEL: Record<ShiftType, string> = { T1: '1º Turno', T2: '2º Turno', T3: '3º Turno' };

export const TeamPanel: React.FC<TeamPanelProps> = ({
  team, colaboradores, month, year, prodRate, onClose,
}) => {
  const members = colaboradores.filter(c => c.turno === team.shiftType && c.team === team.name);
  const color = teamColorOf(team.colorKey);
  const letter = letterFromName(team.name);

  const totalWorkDays = members.reduce((a, c) => a + c.escala.filter(s => s === 'WORK').length, 0);
  const totalOffDays = members.reduce((a, c) => a + c.escala.filter(s => s === 'OFF').length, 0);
  const capacidade = members.reduce((a, c) => {
    const rate = c.prodRate ?? prodRate;
    return a + c.escala.filter(s => s === 'WORK').length * rate;
  }, 0);

  // Histórico / projeção: folgas nos próximos 12 meses
  const projection = useMemo(() => {
    const proj: { month: number; year: number; label: string; offPatternId: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const m = month + i;
      const y = year + Math.floor(m / 12);
      const mm = ((m % 12) + 12) % 12;
      const base = teamBaseOffset(team.shiftType, letter);
      const c = getWeekCursor(y, mm);
      const patternId = (((base + c) % 7) + 7) % 7;
      const names = ['Seg-Ter', 'Ter-Qua', 'Qua-Qui', 'Qui-Sex', 'Sex-Sáb', 'Sáb-Dom', 'Dom-Seg'];
      proj.push({ month: mm, year: y, label: names[patternId], offPatternId: patternId });
    }
    return proj;
  }, [month, year, team.shiftType, letter]);

  const pastPatterns = useMemo(() => {
    const past: { month: number; year: number; label: string }[] = [];
    for (let i = 12; i >= 1; i--) {
      const m = month - i;
      const y = year + Math.floor(m / 12);
      const mm = ((m % 12) + 12) % 12;
      const base = teamBaseOffset(team.shiftType, letter);
      const c = getWeekCursor(y, mm);
      const patternId = (((base + c) % 7) + 7) % 7;
      const names = ['Seg-Ter', 'Ter-Qua', 'Qua-Qui', 'Qui-Sex', 'Sex-Sáb', 'Sáb-Dom', 'Dom-Seg'];
      past.push({ month: mm, year: y, label: names[patternId] });
    }
    return past;
  }, [month, year, team.shiftType, letter]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 rounded-t-3xl ${color.bg}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${color.badge}`}>
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">{team.name}</h2>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md text-white ${team.shiftType === 'T1' ? 'bg-emerald-600' : team.shiftType === 'T2' ? 'bg-amber-500' : 'bg-indigo-600'}`}>
                  {team.shiftType}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{SHIFT_LABEL[team.shiftType]} · {team.memberCount} vagas · {members.length} alocados</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer">
            <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Key indicators */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/50">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3 h-3" /> Colab.
              </p>
              <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">{members.length}</p>
            </div>
            <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/50">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Dias Trab.
              </p>
              <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">{totalWorkDays}</p>
            </div>
            <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/50">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <CalendarRange className="w-3 h-3" /> Folgas
              </p>
              <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">{totalOffDays}</p>
            </div>
            <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/50">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <BarChart3 className="w-3 h-3" /> Capac.
              </p>
              <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">{Math.round(capacidade).toLocaleString('pt-BR')}</p>
            </div>
          </div>

          {/* Colaboradores list */}
          <div>
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-2">
              <UserIcon className="w-3.5 h-3.5 text-slate-400" />
              Colaboradores da {team.name}
            </h4>
            {members.length === 0 && (
              <p className="text-[11px] text-slate-400 italic py-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                Nenhum colaborador alocado nesta equipe.
              </p>
            )}
            {members.length > 0 && (
              <div className="space-y-1 max-h-56 overflow-y-auto">
                {members.map(m => {
                  const workDays = m.escala.filter(s => s === 'WORK').length;
                  const offDays = m.escala.filter(s => s === 'OFF').length;
                  const rate = m.prodRate ?? prodRate;
                  const cap = workDays * rate;
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs">
                      <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                      <span className="font-extrabold text-slate-700 dark:text-slate-300 w-24 truncate">{m.name ?? m.id}</span>
                      <span className="text-slate-400">{workDays}d trab</span>
                      <span className="text-slate-400">{offDays}d folga</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 ml-auto">{Math.round(cap).toLocaleString('pt-BR')}</span>
                      {m.restrictions && (
                        <span className="text-[8px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded-full uppercase">
                          {[
                            m.restrictions.noSaturdays && 'Sáb',
                            m.restrictions.noSundays && 'Dom',
                            (m.restrictions.ferias?.length ?? 0) > 0 && 'Férias',
                            (m.restrictions.afastamentos?.length ?? 0) > 0 && 'Afast.',
                          ].filter(Boolean).join('/') || '—'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Histórico de Rodízio (passado 12 meses) */}
          <div>
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Histórico de Rodízio (12 meses)
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {pastPatterns.map((p: { month: number; year: number; label: string }) => {
                const isWeekend = p.label === 'Sáb-Dom';
                return (
                  <span key={`${p.month}-${p.year}`} className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                    isWeekend
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}>
                    {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][p.month]}/{p.year}
                    {' '}{p.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Projeção de folgas (próximos 12 meses) */}
          <div>
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-2">
              <CalendarRange className="w-3.5 h-3.5 text-slate-400" />
              Projeção de Rodízio (próximos 12 meses)
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {projection.map((p: { month: number; year: number; label: string }) => {
                const isWeekend = p.label === 'Sáb-Dom';
                return (
                  <span key={`${p.month}-${p.year}`} className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                    isWeekend
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}>
                    {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][p.month]}/{p.year}
                    {' '}{p.label}
                  </span>
                );
              })}
            </div>
            <p className="text-[9px] text-slate-400 mt-1.5 italic">
              Baseado no rodízio global (cursor semanal). Cada ciclo cobre 7 padrões de folga. Padrão Sáb-Dom destacado em verde.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};