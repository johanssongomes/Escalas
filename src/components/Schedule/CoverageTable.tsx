import React, { useState } from 'react';
import type { CoverageDay, WeeklyCoverage } from '../../types';
import { BarChart3, CalendarDays, TrendingUp } from 'lucide-react';

interface CoverageTableProps {
  dailyCoverage: CoverageDay[];
  weeklyCoverage: WeeklyCoverage[];
}

export const CoverageTable: React.FC<CoverageTableProps> = ({
  dailyCoverage,
  weeklyCoverage,
}) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

  const formatCell = (val: number) => {
    return val === -1 ? '—' : `${val} colabs`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Análise de Cobertura de Equipe
        </h2>

        {/* Tab Selector */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-950 rounded-xl">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition duration-200 cursor-pointer ${
              activeTab === 'daily'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Cobertura Diária
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition duration-200 cursor-pointer ${
              activeTab === 'weekly'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Cobertura Semanal
          </button>
        </div>
      </div>

      {activeTab === 'daily' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                <th className="p-3">Dia</th>
                <th className="p-3 text-center">1º Turno (T1)</th>
                <th className="p-3 text-center">2º Turno (T2)</th>
                <th className="p-3 text-center">3º Turno (T3)</th>
                <th className="p-3 text-center">Total Presentes</th>
                <th className="p-3 text-center">Folgas do Dia</th>
                <th className="p-3 text-center">Nível de Cobertura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
              {dailyCoverage.map((day) => {
                const isCritical = day.coberturaPct < 70 || day.t1 === 0 || day.t2 === 0 || day.t3 === 0;
                
                return (
                  <tr
                    key={day.dia}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-850/50 ${
                      isCritical
                        ? 'bg-rose-50/20 dark:bg-rose-950/10 text-rose-800 dark:text-rose-450'
                        : ''
                    }`}
                  >
                    <td className="p-3 font-bold text-slate-700 dark:text-slate-300">
                      Dia {day.dia}
                      {isCritical && (
                        <span className="ml-1.5 inline-block text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 px-1.5 py-0.5 rounded font-medium">
                          Crítico
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">{day.t1}</td>
                    <td className="p-3 text-center font-semibold text-orange-600 dark:text-orange-400">{day.t2}</td>
                    <td className="p-3 text-center font-semibold text-purple-600 dark:text-purple-400">{day.t3}</td>
                    <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-200">{day.total}</td>
                    <td className="p-3 text-center font-medium text-slate-500">{day.folgas}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              day.coberturaPct >= 80
                                ? 'bg-emerald-500'
                                : day.coberturaPct >= 70
                                  ? 'bg-blue-500'
                                  : 'bg-rose-500'
                            }`}
                            style={{ width: `${day.coberturaPct}%` }}
                          />
                        </div>
                        <span className="font-extrabold text-[11px] w-8 text-right">
                          {day.coberturaPct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                <th className="p-3">Semana</th>
                <th className="p-3 text-center">Segunda</th>
                <th className="p-3 text-center">Terça</th>
                <th className="p-3 text-center">Quarta</th>
                <th className="p-3 text-center">Quinta</th>
                <th className="p-3 text-center">Sexta</th>
                <th className="p-3 text-center bg-blue-50/50 dark:bg-blue-950/20">Sábado</th>
                <th className="p-3 text-center bg-purple-50/50 dark:bg-purple-950/20">Domingo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
              {weeklyCoverage.map((week) => (
                <tr key={week.semana} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                  <td className="p-3 font-bold text-slate-700 dark:text-slate-300">{week.semana}</td>
                  <td className="p-3 text-center font-semibold">{formatCell(week.seg)}</td>
                  <td className="p-3 text-center font-semibold">{formatCell(week.ter)}</td>
                  <td className="p-3 text-center font-semibold">{formatCell(week.qua)}</td>
                  <td className="p-3 text-center font-semibold">{formatCell(week.qui)}</td>
                  <td className="p-3 text-center font-semibold">{formatCell(week.sex)}</td>
                  <td className="p-3 text-center font-bold bg-blue-50/30 dark:bg-blue-950/10 text-blue-700 dark:text-blue-400">{formatCell(week.sab)}</td>
                  <td className="p-3 text-center font-bold bg-purple-50/30 dark:bg-purple-950/10 text-purple-700 dark:text-purple-400">{formatCell(week.dom)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
