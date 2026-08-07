import React, { useState } from 'react';
import { Scale, AlertTriangle, TrendingUp } from 'lucide-react';
import type { EquityResult } from '../../types';
import { teamColorOf } from '../../utils/teamColors';

interface EquidadeCardProps {
  data: EquityResult;
  annualData?: EquityResult;
  monthLabel?: string;
  yearLabel?: string;
}

const LETTER_COLOR: Record<string, 'emerald' | 'amber' | 'indigo' | 'rose'> = {
  A: 'emerald',
  B: 'amber',
  C: 'indigo',
  D: 'rose',
};

export const EquidadeCard: React.FC<EquidadeCardProps> = ({ data, annualData, monthLabel, yearLabel }) => {
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');

  const activeData = viewMode === 'yearly' && annualData ? annualData : data;
  const { rows, balanceGlobal, hasAlert, alerts } = activeData;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm h-full">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <span className={`p-1 rounded-lg ${hasAlert ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-indigo-50 dark:bg-indigo-900/20'}`}>
              <Scale className={`w-4 h-4 ${hasAlert ? 'text-rose-600' : 'text-indigo-600'}`} />
            </span>
            Equidade {viewMode === 'yearly' ? 'Anual' : 'Mensal'}
          </h4>
          
          {annualData && (
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg text-[9px] font-bold">
              <button
                type="button"
                onClick={() => setViewMode('monthly')}
                className={`px-2 py-0.5 rounded-md transition ${viewMode === 'monthly' ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
              >
                Mês
              </button>
              <button
                type="button"
                onClick={() => setViewMode('yearly')}
                className={`px-2 py-0.5 rounded-md transition ${viewMode === 'yearly' ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
              >
                Ano
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            {viewMode === 'yearly' ? yearLabel : monthLabel}
          </span>
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${balanceGlobal >= 90 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : balanceGlobal >= 70 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
            {balanceGlobal}% eq.
          </span>
        </div>
      </div>

      {hasAlert && alerts.length > 0 && (
        <div className="mb-3 p-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl text-[10px] font-semibold text-red-700 dark:text-red-400 space-y-1">
          {alerts.map((msg, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{msg}</span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {rows.map(row => {
          const color = teamColorOf(LETTER_COLOR[row.letter]);
          const pctColor = row.percentualEquilibrio >= 85
            ? 'text-emerald-600 dark:text-emerald-400'
            : row.percentualEquilibrio >= 60
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-red-600 dark:text-red-400';

          return (
            <div key={row.letter} className={`flex items-center gap-3 p-2 rounded-xl border transition ${row.alert ? 'border-red-200 dark:border-red-800 bg-red-50/40 dark:bg-red-950/10' : 'border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/50'}`}>
              <div className={`w-3 h-3 rounded-full shrink-0 ${color.dot}`} />
              <span className={`text-[11px] font-extrabold flex-1 ${color.text}`}>
                {row.label}
                <span className="text-[9px] text-slate-400 font-normal ml-1">({row.members} colab.)</span>
              </span>

              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                <span title="Fins de semana completos">{row.finsDeSemanaCompletos} fins</span>
                <span title="Sábados de folga">{row.sabadosOff} sáb</span>
                <span title="Domingos de folga">{row.domingosOff} dom</span>
              </div>

              {/* Equity bar */}
              <div className="flex items-center gap-1.5 w-28 justify-end">
                <div className="w-14 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      row.percentualEquilibrio >= 90 ? 'bg-emerald-500'
                      : row.percentualEquilibrio >= 70 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${row.percentualEquilibrio}%` }}
                  />
                </div>
                <span className={`text-[10px] font-black ${pctColor}`}>{row.percentualEquilibrio}%</span>
                {row.alert && (
                  <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <TrendingUp className="w-3 h-3" />
        <span>Equilíbrio global {balanceGlobal}% — quanto mais próximo de 100%, mais justa é a distribuição das folgas entre as equipes.</span>
      </div>
    </div>
  );
};

