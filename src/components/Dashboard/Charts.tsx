import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { CoverageDay, WeeklyCoverage, Colaborador } from '../../types';
import { BarChart3, PieChart as PieIcon, Flame, CalendarRange, Award } from 'lucide-react';

interface ChartsProps {
  dailyCoverage: CoverageDay[];
  weeklyCoverage: WeeklyCoverage[];
  colaboradores: Colaborador[];
  params: {
    conferentesT1: number;
    conferentesT2: number;
    conferentesT3: number;
  };
}

export const Charts: React.FC<ChartsProps> = ({
  dailyCoverage,
  weeklyCoverage,
  colaboradores,
  params,
}) => {
  // Chart 1: Turnos Data
  const shiftData = [
    { name: '1º Turno (T1)', value: params.conferentesT1, color: '#10b981' },
    { name: '2º Turno (T2)', value: params.conferentesT2, color: '#f97316' },
    { name: '3º Turno (T3)', value: params.conferentesT3, color: '#8b5cf6' },
  ];

  // Chart 5: Sunday work distribution count
  // Calculate how many Sundays each worker worked in the 28 days (4 Sundays total)
  const sundayWorkDist = colaboradores.reduce((acc: { [key: number]: number }, colab) => {
    let sundaysWorked = 0;
    colab.escala.forEach((status, idx) => {
      if (idx % 7 === 6 && status === 'WORK') {
        sundaysWorked++;
      }
    });
    acc[sundaysWorked] = (acc[sundaysWorked] || 0) + 1;
    return acc;
  }, {});

  const sundayChartData = Object.keys(sundayWorkDist).map((key) => ({
    name: `${key} Dom.`,
    colaboradores: sundayWorkDist[Number(key)],
  }));



  // We can group it by Week
  const weeklyChartDataGrouped = weeklyCoverage.map(w => ({
    name: w.semana,
    'Seg': w.seg,
    'Ter': w.ter,
    'Qua': w.qua,
    'Qui': w.qui,
    'Sex': w.sex,
    'Sáb': w.sab,
    'Dom': w.dom,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Gráfico 1: Conferentes por Turno */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350 flex items-center gap-2 mb-4">
          <PieIcon className="w-4 h-4 text-blue-500" />
          Distribuição de Conferentes por Turno
        </h3>
        <div className="h-64 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={shiftData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {shiftData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} colaboradores`, 'Quantidade']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico 2: Cobertura Diária */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350 flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-emerald-500" />
          Aderência & Nível de Cobertura Diária (%)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyCoverage} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCoverage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="dia" tickLine={false} />
              <YAxis domain={[0, 100]} tickLine={false} />
              <Tooltip formatter={(value) => [`${value}%`, 'Cobertura']} />
              <Area type="monotone" dataKey="coberturaPct" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCoverage)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico 3: Cobertura Semanal */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350 flex items-center gap-2 mb-4">
          <CalendarRange className="w-4 h-4 text-purple-500" />
          Volume de Presentes por Semana & Dia
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyChartDataGrouped} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="name" tickLine={false} />
              <YAxis tickLine={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Seg" fill="#60a5fa" radius={[3, 3, 0, 0]} opacity={0.85} />
              <Bar dataKey="Ter" fill="#34d399" radius={[3, 3, 0, 0]} opacity={0.85} />
              <Bar dataKey="Qua" fill="#fbbf24" radius={[3, 3, 0, 0]} opacity={0.85} />
              <Bar dataKey="Qui" fill="#f472b6" radius={[3, 3, 0, 0]} opacity={0.85} />
              <Bar dataKey="Sex" fill="#a78bfa" radius={[3, 3, 0, 0]} opacity={0.85} />
              <Bar dataKey="Sáb" fill="#818cf8" radius={[3, 3, 0, 0]} opacity={0.85} />
              <Bar dataKey="Dom" fill="#f87171" radius={[3, 3, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico 4: Folgas por Dia */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350 flex items-center gap-2 mb-4">
          <CalendarRange className="w-4 h-4 text-orange-500" />
          Quantidade de Folgas Concedidas por Dia
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyCoverage} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="dia" tickLine={false} />
              <YAxis tickLine={false} />
              <Tooltip formatter={(value) => [`${value} folgas`, 'Folgas']} />
              <Bar dataKey="folgas" fill="#f87171" radius={[3, 3, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico 5: Domingos Trabalhados por Colaborador */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350 flex items-center gap-2 mb-4">
          <Award className="w-4 h-4 text-yellow-500" />
          Frequência de Domingos Trabalhados (Escala 5x2)
        </h3>
        <div className="h-64">
          {sundayChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sundayChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" tickLine={false} />
                <YAxis tickLine={false} />
                <Tooltip formatter={(value) => [`${value} colabs`, 'Quantidade']} />
                <Bar dataKey="colaboradores" fill="#a78bfa" radius={[3, 3, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
              Sem dados de domingos.
            </div>
          )}
        </div>
      </div>

      {/* Gráfico 6: Heatmap de Cobertura Diária */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350 flex items-center gap-2 mb-4">
          <Flame className="w-4 h-4 text-red-500" />
          Heatmap da Escala: Nível de Cobertura por Dia
        </h3>
        <div className="flex flex-col justify-between h-64 pb-2">
          <div className="grid grid-cols-7 gap-2.5 max-w-md mx-auto pt-2">
            {dailyCoverage.map((day) => {
              const isCrit = day.coberturaPct < 70;
              const isWarning = day.coberturaPct >= 70 && day.coberturaPct < 80;
              let bg = 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-350 border-emerald-500/30';
              if (isCrit) {
                bg = 'bg-rose-500/20 text-rose-700 dark:bg-rose-500/30 dark:text-rose-350 border-rose-500/30';
              } else if (isWarning) {
                bg = 'bg-orange-500/15 text-orange-700 dark:bg-orange-500/25 dark:text-orange-350 border-orange-500/30';
              }

              return (
                <div
                  key={day.dia}
                  className={`aspect-square border rounded-lg flex flex-col items-center justify-center p-1 font-bold transition shadow-sm ${bg}`}
                  title={`Dia ${day.dia}: ${day.coberturaPct}% cobertura`}
                >
                  <span className="text-[9px] opacity-75">D{day.dia}</span>
                  <span className="text-xs font-black">{day.coberturaPct}%</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-slate-500 mt-2">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-rose-500/30 border border-rose-500/40"></span>
              <span>Crítico (&lt;70%)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-orange-500/20 border border-orange-500/30"></span>
              <span>Atenção (70-79%)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/10 border border-emerald-500/20"></span>
              <span>Ideal (&ge;80%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
