import React from 'react';
import { CalendarRange, Info } from 'lucide-react';
import type { DistribuicaoFolga, ShiftType } from '../../types';
import { teamColorOf } from '../../utils/teamColors';

const SHIFT_LABEL: Record<ShiftType, string> = { T1: '1º Turno', T2: '2º Turno', T3: '3º Turno' };
const SHIFT_BADGE: Record<ShiftType, string> = {
  T1: 'bg-emerald-600',
  T2: 'bg-amber-500',
  T3: 'bg-indigo-600',
};

interface DistribuicaoFolgasCardProps {
  rows: DistribuicaoFolga[];
  monthLabel?: string;
}

export const DistribuicaoFolgasCard: React.FC<DistribuicaoFolgasCardProps> = ({ rows, monthLabel }) => {
  const grouped = rows.reduce<Record<ShiftType, DistribuicaoFolga[]>>(
    (acc, r) => {
      (acc[r.shift] = acc[r.shift] || []).push(r);
      return acc;
    },
    { T1: [], T2: [], T3: [] },
  );

  const hasData = rows.length > 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm h-full">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <span className="p-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <CalendarRange className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </span>
          Distribuição das Folgas
        </h4>
        {monthLabel && (
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{monthLabel}</span>
        )}
      </div>

      {!hasData && (
        <p className="text-[11px] text-slate-400 italic py-6 text-center">
          Sem equipes configuradas. Use "Gerenciar Equipes" e "Gerar Escala" para distribuir as folgas.
        </p>
      )}

      {hasData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['T3', 'T1', 'T2'] as ShiftType[]).map(shift => {
              const shiftRows = grouped[shift];
              if (shiftRows.length === 0) return null;
              return (
                <div key={shift} className="space-y-3">
                  <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className={`text-[8px] font-black text-white px-1.5 py-0.5 rounded ${SHIFT_BADGE[shift]}`}>{shift}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{SHIFT_LABEL[shift]}</span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-y-2 gap-x-3">
                    {shiftRows.map(row => {
                      const color = teamColorOf(TEAM_COLOR_BY_LETTER[row.letter]);
                      return (
                        <React.Fragment key={row.teamId}>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${color.dot}`} />
                            <span className={`text-[10px] font-extrabold truncate ${color.text}`}>{row.teamName}</span>
                            <span className="text-[8px] text-slate-400 font-semibold">({row.memberCount})</span>
                          </div>
                          <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 text-right whitespace-nowrap">
                            {row.diasFolga} folgas
                          </div>
                          <div className="text-[9px] text-slate-400 col-start-2 text-right -mt-1 pb-1">
                            {row.sabados} sáb · {row.domingos} dom · {row.finsDeSemanaCompletos} f.s.
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-start gap-1.5 text-[9px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Info className="w-3 h-3 shrink-0 mt-0.5" />
            <span>
              Totais do mês por equipe. "F.s." = folga de Sábado+Domingo juntos. Médias por colaborador ponderam equipes de tamanhos diferentes.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const TEAM_COLOR_BY_LETTER: Record<string, 'emerald' | 'amber' | 'indigo' | 'rose'> = {
  A: 'emerald',
  B: 'amber',
  C: 'indigo',
  D: 'rose',
};
