import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { Colaborador, ScheduleParams } from '../../types';
import { Calculator, TrendingUp, CheckCircle2, TrendingDown } from 'lucide-react';

interface ProductivitySimulatorProps {
  colaboradores: Colaborador[];
  params: ScheduleParams;
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export const ProductivitySimulator: React.FC<ProductivitySimulatorProps> = ({
  colaboradores,
  params,
}) => {
  const [prodRate, setProdRate] = useState<number>(25);

  const diasCount = params.dias;

  // Calculate daily active headcount per shift
  const dailyStats = useMemo(() => {
    const stats = Array.from({ length: diasCount }).map((_, d) => {
      let t1Active = 0;
      let t2Active = 0;
      let t3Active = 0;

      colaboradores.forEach((colab) => {
        if (colab.escala[d] === 'WORK') {
          if (colab.turno === 'T1') t1Active++;
          else if (colab.turno === 'T2') t2Active++;
          else if (colab.turno === 'T3') t3Active++;
        }
      });

      const baseT1 = params.conferentesT1;
      const baseT2 = params.conferentesT2;
      const baseT3 = params.conferentesT3;

      const baseHC = baseT1 + baseT2 + baseT3;
      const activeHC = t1Active + t2Active + t3Active;

      const baseCap = baseHC * prodRate;
      const activeCap = activeHC * prodRate;

      return {
        dia: d + 1,
        weekday: WEEKDAYS[d % 7],
        semana: Math.floor(d / 7) + 1,
        t1: { base: baseT1, active: t1Active, baseCap: baseT1 * prodRate, activeCap: t1Active * prodRate },
        t2: { base: baseT2, active: t2Active, baseCap: baseT2 * prodRate, activeCap: t2Active * prodRate },
        t3: { base: baseT3, active: t3Active, baseCap: baseT3 * prodRate, activeCap: t3Active * prodRate },
        total: { base: baseHC, active: activeHC, baseCap, activeCap },
      };
    });

    return stats;
  }, [colaboradores, params, prodRate, diasCount]);

  // Aggregate totals
  const aggregates = useMemo(() => {
    let totalBaseCap = 0;
    let totalActiveCap = 0;
    let totalBaseHC = 0;
    let totalActiveHC = 0;

    dailyStats.forEach((day) => {
      totalBaseCap += day.total.baseCap;
      totalActiveCap += day.total.activeCap;
      totalBaseHC += day.total.base;
      totalActiveHC += day.total.active;
    });

    const capLoss = totalBaseCap > 0 ? ((totalBaseCap - totalActiveCap) / totalBaseCap) * 100 : 0;

    return {
      totalBaseCap,
      totalActiveCap,
      totalBaseHC,
      totalActiveHC,
      capLoss: Math.round(capLoss * 10) / 10,
      avgDailyCap: Math.round(totalActiveCap / (diasCount || 1)),
    };
  }, [dailyStats, diasCount]);

  // Group stats by week for sub-totals
  const weeklyAggregates = useMemo(() => {
    const weeks: { [key: number]: typeof dailyStats } = {};
    dailyStats.forEach((day) => {
      if (!weeks[day.semana]) weeks[day.semana] = [];
      weeks[day.semana].push(day);
    });

    return Object.keys(weeks).map((wKey) => {
      const wDays = weeks[Number(wKey)];
      const wT1Base = wDays[0]?.t1.base || 0;
      const wT2Base = wDays[0]?.t2.base || 0;
      const wT3Base = wDays[0]?.t3.base || 0;

      const t1Active = wDays.reduce((sum, d) => sum + d.t1.active, 0);
      const t2Active = wDays.reduce((sum, d) => sum + d.t2.active, 0);
      const t3Active = wDays.reduce((sum, d) => sum + d.t3.active, 0);

      const baseT1Cap = wT1Base * prodRate * wDays.length;
      const activeT1Cap = wDays.reduce((sum, d) => sum + d.t1.activeCap, 0);

      const baseT2Cap = wT2Base * prodRate * wDays.length;
      const activeT2Cap = wDays.reduce((sum, d) => sum + d.t2.activeCap, 0);

      const baseT3Cap = wT3Base * prodRate * wDays.length;
      const activeT3Cap = wDays.reduce((sum, d) => sum + d.t3.activeCap, 0);

      return {
        semana: Number(wKey),
        t1: { base: wT1Base, activeSum: t1Active, baseCap: baseT1Cap, activeCap: activeT1Cap },
        t2: { base: wT2Base, activeSum: t2Active, baseCap: baseT2Cap, activeCap: activeT2Cap },
        t3: { base: wT3Base, activeSum: t3Active, baseCap: baseT3Cap, activeCap: activeT3Cap },
        total: {
          baseCap: baseT1Cap + baseT2Cap + baseT3Cap,
          activeCap: activeT1Cap + activeT2Cap + activeT3Cap,
        },
      };
    });
  }, [dailyStats, prodRate]);

  // Overall totals across the 28 days for each shift
  const overallShiftTotals = useMemo(() => {
    const t1BaseCap = params.conferentesT1 * prodRate * diasCount;
    const t1ActiveCap = dailyStats.reduce((sum, d) => sum + d.t1.activeCap, 0);

    const t2BaseCap = params.conferentesT2 * prodRate * diasCount;
    const t2ActiveCap = dailyStats.reduce((sum, d) => sum + d.t2.activeCap, 0);

    const t3BaseCap = params.conferentesT3 * prodRate * diasCount;
    const t3ActiveCap = dailyStats.reduce((sum, d) => sum + d.t3.activeCap, 0);

    return {
      t1: { baseCap: t1BaseCap, activeCap: t1ActiveCap },
      t2: { baseCap: t2BaseCap, activeCap: t2ActiveCap },
      t3: { baseCap: t3BaseCap, activeCap: t3ActiveCap },
      total: { baseCap: t1BaseCap + t2BaseCap + t3BaseCap, activeCap: t1ActiveCap + t2ActiveCap + t3ActiveCap },
    };
  }, [dailyStats, params, prodRate, diasCount]);

  return (
    <div className="space-y-6">
      {/* Configuration & KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Control Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350 flex items-center gap-2 mb-2">
              <Calculator className="w-4 h-4 text-blue-600" />
              Meta de Produtividade
            </h3>
            <p className="text-xs text-slate-400 mb-4">Ajuste o volume processado por conferente por dia</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={prodRate}
              onChange={(e) => setProdRate(Math.max(1, Number(e.target.value)))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <span className="text-sm font-black text-slate-500 dark:text-slate-400">m³/dia</span>
          </div>
        </div>

        {/* KPI 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Capacidade Teórica</span>
          <div className="my-2">
            <span className="text-3xl font-black text-slate-800 dark:text-slate-100">
              {aggregates.totalBaseCap.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-400 ml-1">m³</span>
          </div>
          <span className="text-[10px] text-slate-400">Sem considerar folgas da escala</span>
        </div>

        {/* KPI 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Capacidade com Folgas</span>
          <div className="my-2">
            <span className="text-3xl font-black text-blue-600 dark:text-blue-400">
              {aggregates.totalActiveCap.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-400 ml-1">m³</span>
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Capacidade real de atendimento
          </span>
        </div>

        {/* KPI 3 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Perda de Capacidade</span>
          <div className="my-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-orange-500">
              -{aggregates.capLoss}%
            </span>
            <TrendingDown className="w-4 h-4 text-orange-500" />
          </div>
          <span className="text-[10px] text-slate-400">Redução operacional devido à escala 5x2</span>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Impacto da Escala 5x2 na Capacidade Produtiva (m³)
          </h2>
          <span className="text-xs font-bold text-slate-400">Média Diária Real: {aggregates.avgDailyCap.toLocaleString()} m³</span>
        </div>

        <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse text-[10px] table-fixed">
            <thead>
              {/* Week header row */}
              <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-150 dark:border-slate-800">
                <th className="p-1.5 sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-350 w-[85px] min-w-[85px]">
                  Turno / Indicador
                </th>
                
                {/* 4 Weeks headers */}
                {Array.from({ length: 4 }).map((_, wIdx) => (
                  <React.Fragment key={wIdx}>
                    {Array.from({ length: 7 }).map((_, dIdx) => {
                      const dayNumber = wIdx * 7 + dIdx;
                      const weekday = WEEKDAYS[dayNumber % 7];
                      const isSun = (dayNumber % 7) === 6;
                      
                      return (
                        <th
                          key={dayNumber}
                          className={`p-1 text-center border-r border-slate-150 dark:border-slate-850 font-bold ${
                            isSun ? 'bg-purple-100/20 text-purple-700 dark:bg-purple-950/15' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <div className="text-[7.5px] uppercase font-semibold">{weekday[0]}</div>
                          <div className="text-[10px] font-extrabold">{String(dayNumber + 1).padStart(2, '0')}</div>
                        </th>
                      );
                    })}
                    {/* Weekly Total Column Header */}
                    <th className="p-1 text-center border-r border-slate-200 dark:border-slate-800 font-bold bg-slate-100/50 dark:bg-slate-950/80 text-blue-600 dark:text-blue-400 w-[42px] min-w-[42px]">
                      Sem {wIdx + 1}
                    </th>
                  </React.Fragment>
                ))}

                {/* Overall Month Total Column Header */}
                <th className="p-1.5 text-center font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 w-[55px] min-w-[55px]">
                  Total
                </th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* T3 SHIFT (3º Turno) */}
              <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10">
                <td className="p-1.5 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-purple-650 dark:text-purple-400">
                  Time C HC
                </td>
                {Array.from({ length: 4 }).map((_, wIdx) => (
                  <React.Fragment key={wIdx}>
                    {Array.from({ length: 7 }).map((_, dIdx) => {
                      const d = wIdx * 7 + dIdx;
                      return (
                        <td key={d} className="p-1 text-center border-r border-slate-100 dark:border-slate-850 font-bold text-slate-400">
                          {params.conferentesT3}
                        </td>
                      );
                    })}
                    <td className="p-1 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 font-bold text-slate-400">
                      -
                    </td>
                  </React.Fragment>
                ))}
                <td className="p-1.5 text-center bg-blue-50/30 dark:bg-blue-950/10 font-bold text-slate-400">
                  -
                </td>
              </tr>
              <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10 bg-slate-50/10 dark:bg-slate-950/5">
                <td className="p-1.5 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-500 dark:text-slate-450 pl-2">
                  Time C Ativos
                </td>
                {Array.from({ length: 4 }).map((_, wIdx) => (
                  <React.Fragment key={wIdx}>
                    {Array.from({ length: 7 }).map((_, dIdx) => {
                      const d = wIdx * 7 + dIdx;
                      const day = dailyStats[d];
                      return (
                        <td key={d} className="p-1 text-center border-r border-slate-100 dark:border-slate-850 font-black text-purple-600 dark:text-purple-400">
                          {day.t3.active}
                        </td>
                      );
                    })}
                    <td className="p-1 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 font-black text-purple-600 dark:text-purple-400">
                      {weeklyAggregates[wIdx].t3.activeSum}
                    </td>
                  </React.Fragment>
                ))}
                <td className="p-1.5 text-center bg-blue-50/30 dark:bg-blue-950/10 font-black text-purple-600 dark:text-purple-400">
                  {dailyStats.reduce((sum, d) => sum + d.t3.active, 0)}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10">
                <td className="p-1.5 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-400 pl-2">
                  Time C Cap. Base
                </td>
                {Array.from({ length: 4 }).map((_, wIdx) => (
                  <React.Fragment key={wIdx}>
                    {Array.from({ length: 7 }).map((_, dIdx) => {
                      const d = wIdx * 7 + dIdx;
                      const day = dailyStats[d];
                      return (
                        <td key={d} className="p-1 text-center border-r border-slate-100 dark:border-slate-850 text-slate-400">
                          {day.t3.baseCap}
                        </td>
                      );
                    })}
                    <td className="p-1 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-450 font-semibold">
                      {weeklyAggregates[wIdx].t3.baseCap}
                    </td>
                  </React.Fragment>
                ))}
                <td className="p-1.5 text-center bg-blue-50/30 dark:bg-blue-950/10 font-bold text-slate-450">
                  {overallShiftTotals.t3.baseCap}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10 border-b-2 border-slate-200 dark:border-slate-800 bg-blue-50/10 dark:bg-blue-950/10">
                <td className="p-1.5 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-200 pl-2">
                  Time C Cap. Real
                </td>
                {Array.from({ length: 4 }).map((_, wIdx) => (
                  <React.Fragment key={wIdx}>
                    {Array.from({ length: 7 }).map((_, dIdx) => {
                      const d = wIdx * 7 + dIdx;
                      const day = dailyStats[d];
                      return (
                        <td key={d} className="p-1 text-center border-r border-slate-100 dark:border-slate-850 font-black text-slate-800 dark:text-slate-200">
                          {day.t3.activeCap}
                        </td>
                      );
                    })}
                    <td className="p-1 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950/60 font-black text-blue-650 dark:text-blue-400">
                      {weeklyAggregates[wIdx].t3.activeCap}
                    </td>
                  </React.Fragment>
                ))}
                <td className="p-1.5 text-center bg-blue-100/30 dark:bg-blue-900/30 font-black text-blue-650 dark:text-blue-400">
                  {overallShiftTotals.t3.activeCap}
                </td>
              </tr>

              {/* T1 SHIFT (1º Turno) */}
              <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10">
                <td className="p-1.5 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-emerald-650 dark:text-emerald-400">
                  Time A HC
                </td>
                {Array.from({ length: 4 }).map((_, wIdx) => (
                  <React.Fragment key={wIdx}>
                    {Array.from({ length: 7 }).map((_, dIdx) => {
                      const d = wIdx * 7 + dIdx;
                      return (
                        <td key={d} className="p-1 text-center border-r border-slate-100 dark:border-slate-850 font-bold text-slate-400">
                          {params.conferentesT1}
                        </td>
                      );
                    })}
                    <td className="p-1 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 font-bold text-slate-400">
                      -
                    </td>
                  </React.Fragment>
                ))}
                <td className="p-1.5 text-center bg-blue-50/30 dark:bg-blue-950/10 font-bold text-slate-400">
                  -
                </td>
              </tr>
              <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10 bg-slate-50/10 dark:bg-slate-950/5">
                <td className="p-1.5 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-500 dark:text-slate-450 pl-2">
                  Time A Ativos
                </td>
                {Array.from({ length: 4 }).map((_, wIdx) => (
                  <React.Fragment key={wIdx}>
                    {Array.from({ length: 7 }).map((_, dIdx) => {
                      const d = wIdx * 7 + dIdx;
                      const day = dailyStats[d];
                      return (
                        <td key={d} className="p-1 text-center border-r border-slate-100 dark:border-slate-850 font-black text-emerald-600 dark:text-emerald-400">
                          {day.t1.active}
                        </td>
                      );
                    })}
                    <td className="p-1 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 font-black text-emerald-600 dark:text-emerald-400">
                      {weeklyAggregates[wIdx].t1.activeSum}
                    </td>
                  </React.Fragment>
                ))}
                <td className="p-1.5 text-center bg-blue-50/30 dark:bg-blue-950/10 font-black text-emerald-600 dark:text-emerald-400">
                  {dailyStats.reduce((sum, d) => sum + d.t1.active, 0)}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10">
                <td className="p-1.5 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-400 pl-2">
                  Time A Cap. Base
                </td>
                {Array.from({ length: 4 }).map((_, wIdx) => (
                  <React.Fragment key={wIdx}>
                    {Array.from({ length: 7 }).map((_, dIdx) => {
                      const d = wIdx * 7 + dIdx;
                      const day = dailyStats[d];
                      return (
                        <td key={d} className="p-1 text-center border-r border-slate-100 dark:border-slate-850 text-slate-400">
                          {day.t1.baseCap}
                        </td>
                      );
                    })}
                    <td className="p-1 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-455 font-semibold">
                      {weeklyAggregates[wIdx].t1.baseCap}
                    </td>
                  </React.Fragment>
                ))}
                <td className="p-1.5 text-center bg-blue-50/30 dark:bg-blue-950/10 font-bold text-slate-455">
                  {overallShiftTotals.t1.baseCap}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10 border-b-2 border-slate-200 dark:border-slate-800 bg-blue-50/10 dark:bg-blue-950/10">
                <td className="p-1.5 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-200 pl-2">
                  Time A Cap. Real
                </td>
                {Array.from({ length: 4 }).map((_, wIdx) => (
                  <React.Fragment key={wIdx}>
                    {Array.from({ length: 7 }).map((_, dIdx) => {
                      const d = wIdx * 7 + dIdx;
                      const day = dailyStats[d];
                      return (
                        <td key={d} className="p-1 text-center border-r border-slate-100 dark:border-slate-850 font-black text-slate-800 dark:text-slate-200">
                          {day.t1.activeCap}
                        </td>
                      );
                    })}
                    <td className="p-1 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950/60 font-black text-blue-650 dark:text-blue-400">
                      {weeklyAggregates[wIdx].t1.activeCap}
                    </td>
                  </React.Fragment>
                ))}
                <td className="p-1.5 text-center bg-blue-100/30 dark:bg-blue-900/30 font-black text-blue-650 dark:text-blue-400">
                  {overallShiftTotals.t1.activeCap}
                </td>
              </tr>

              {/* T2 SHIFT (2º Turno) */}
              <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10">
                <td className="p-1.5 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-orange-650 dark:text-orange-400">
                  Time B HC
                </td>
                {Array.from({ length: 4 }).map((_, wIdx) => (
                  <React.Fragment key={wIdx}>
                    {Array.from({ length: 7 }).map((_, dIdx) => {
                      const d = wIdx * 7 + dIdx;
                      return (
                        <td key={d} className="p-1 text-center border-r border-slate-100 dark:border-slate-850 font-bold text-slate-400">
                          {params.conferentesT2}
                        </td>
                      );
                    })}
                    <td className="p-1 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 font-bold text-slate-400">
                      -
                    </td>
                  </React.Fragment>
                ))}
                <td className="p-1.5 text-center bg-blue-50/30 dark:bg-blue-950/10 font-bold text-slate-400">
                  -
                </td>
              </tr>
              <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10 bg-slate-50/10 dark:bg-slate-950/5">
                <td className="p-1.5 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-500 dark:text-slate-450 pl-2">
                  Time B Ativos
                </td>
                {Array.from({ length: 4 }).map((_, wIdx) => (
                  <React.Fragment key={wIdx}>
                    {Array.from({ length: 7 }).map((_, dIdx) => {
                      const d = wIdx * 7 + dIdx;
                      const day = dailyStats[d];
                      return (
                        <td key={d} className="p-1 text-center border-r border-slate-100 dark:border-slate-850 font-black text-orange-600 dark:text-orange-400">
                          {day.t2.active}
                        </td>
                      );
                    })}
                    <td className="p-1 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 font-black text-orange-600 dark:text-orange-400">
                      {weeklyAggregates[wIdx].t2.activeSum}
                    </td>
                  </React.Fragment>
                ))}
                <td className="p-1.5 text-center bg-blue-50/30 dark:bg-blue-950/10 font-black text-orange-600 dark:text-orange-400">
                  {dailyStats.reduce((sum, d) => sum + d.t2.active, 0)}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10">
                <td className="p-1.5 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-400 pl-2">
                  Time B Cap. Base
                </td>
                {Array.from({ length: 4 }).map((_, wIdx) => (
                  <React.Fragment key={wIdx}>
                    {Array.from({ length: 7 }).map((_, dIdx) => {
                      const d = wIdx * 7 + dIdx;
                      const day = dailyStats[d];
                      return (
                        <td key={d} className="p-1 text-center border-r border-slate-150 dark:border-slate-850 text-slate-400">
                          {day.t2.baseCap}
                        </td>
                      );
                    })}
                    <td className="p-1 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-455 font-semibold">
                      {weeklyAggregates[wIdx].t2.baseCap}
                    </td>
                  </React.Fragment>
                ))}
                <td className="p-1.5 text-center bg-blue-50/30 dark:bg-blue-950/10 font-bold text-slate-455">
                  {overallShiftTotals.t2.baseCap}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10 border-b-2 border-slate-200 dark:border-slate-800 bg-blue-50/10 dark:bg-blue-950/10">
                <td className="p-1.5 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-200 pl-2">
                  Time B Cap. Real
                </td>
                {Array.from({ length: 4 }).map((_, wIdx) => (
                  <React.Fragment key={wIdx}>
                    {Array.from({ length: 7 }).map((_, dIdx) => {
                      const d = wIdx * 7 + dIdx;
                      const day = dailyStats[d];
                      return (
                        <td key={d} className="p-1 text-center border-r border-slate-100 dark:border-slate-850 font-black text-slate-800 dark:text-slate-200">
                          {day.t2.activeCap}
                        </td>
                      );
                    })}
                    <td className="p-1 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950/60 font-black text-blue-650 dark:text-blue-400">
                      {weeklyAggregates[wIdx].t2.activeCap}
                    </td>
                  </React.Fragment>
                ))}
                <td className="p-1.5 text-center bg-blue-100/30 dark:bg-blue-900/30 font-black text-blue-650 dark:text-blue-400">
                  {overallShiftTotals.t2.activeCap}
                </td>
              </tr>

              {/* TOTAL ROW (HC TT) */}
              <tr className="bg-slate-100/50 dark:bg-slate-950/30 font-black text-slate-800 dark:text-slate-200 border-t-2 border-slate-300 dark:border-slate-800">
                <td className="p-1.5 sticky left-0 z-20 bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                  HC TT
                </td>
                {Array.from({ length: 4 }).map((_, wIdx) => (
                  <React.Fragment key={wIdx}>
                    {Array.from({ length: 7 }).map((_, dIdx) => {
                      const d = wIdx * 7 + dIdx;
                      const day = dailyStats[d];
                      return (
                        <td key={d} className="p-1 text-center border-r border-slate-100 dark:border-slate-850">
                          {day.total.base}
                        </td>
                      );
                    })}
                    <td className="p-1 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-150/40 dark:bg-slate-950/80">
                      -
                    </td>
                  </React.Fragment>
                ))}
                <td className="p-1.5 text-center bg-blue-100/40 dark:bg-blue-900/20">
                  -
                </td>
              </tr>
              <tr className="bg-slate-100/50 dark:bg-slate-950/30 font-black text-blue-600 dark:text-blue-400">
                <td className="p-1.5 sticky left-0 z-20 bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 pl-2">
                  Ativos TT
                </td>
                {Array.from({ length: 4 }).map((_, wIdx) => (
                  <React.Fragment key={wIdx}>
                    {Array.from({ length: 7 }).map((_, dIdx) => {
                      const d = wIdx * 7 + dIdx;
                      const day = dailyStats[d];
                      return (
                        <td key={d} className="p-1 text-center border-r border-slate-100 dark:border-slate-850">
                          {day.total.active}
                        </td>
                      );
                    })}
                    <td className="p-1 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-150/40 dark:bg-slate-950/80">
                      {weeklyAggregates[wIdx].t1.activeSum + weeklyAggregates[wIdx].t2.activeSum + weeklyAggregates[wIdx].t3.activeSum}
                    </td>
                  </React.Fragment>
                ))}
                <td className="p-1.5 text-center bg-blue-100/40 dark:bg-blue-900/20">
                  {dailyStats.reduce((sum, d) => sum + d.total.active, 0)}
                </td>
              </tr>
              <tr className="bg-slate-100/50 dark:bg-slate-950/30 font-black text-slate-500 dark:text-slate-400">
                <td className="p-1.5 sticky left-0 z-20 bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                  Cap. TT
                </td>
                {Array.from({ length: 4 }).map((_, wIdx) => (
                  <React.Fragment key={wIdx}>
                    {Array.from({ length: 7 }).map((_, dIdx) => {
                      const d = wIdx * 7 + dIdx;
                      const day = dailyStats[d];
                      return (
                        <td key={d} className="p-1 text-center border-r border-slate-100 dark:border-slate-850">
                          {day.total.baseCap}
                        </td>
                      );
                    })}
                    <td className="p-1 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-150/40 dark:bg-slate-950/80">
                      {weeklyAggregates[wIdx].total.baseCap}
                    </td>
                  </React.Fragment>
                ))}
                <td className="p-1.5 text-center bg-blue-100/40 dark:bg-blue-900/20">
                  {overallShiftTotals.total.baseCap}
                </td>
              </tr>
              <tr className="bg-blue-500 text-white font-black">
                <td className="p-1.5 sticky left-0 z-20 bg-blue-600 border-r border-blue-700">
                  Nova Cap TT
                </td>
                {Array.from({ length: 4 }).map((_, wIdx) => (
                  <React.Fragment key={wIdx}>
                    {Array.from({ length: 7 }).map((_, dIdx) => {
                      const d = wIdx * 7 + dIdx;
                      const day = dailyStats[d];
                      return (
                        <td key={d} className="p-1 text-center border-r border-blue-600">
                          {day.total.activeCap}
                        </td>
                      );
                    })}
                    <td className="p-1 text-center border-r border-blue-700 bg-blue-600">
                      {weeklyAggregates[wIdx].total.activeCap}
                    </td>
                  </React.Fragment>
                ))}
                <td className="p-1.5 text-center bg-blue-700 font-extrabold">
                  {overallShiftTotals.total.activeCap}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Chart comparison */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350 flex items-center gap-2 mb-4">
          Comparativo diário: Capacidade Planejada vs Realizada (m³)
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={dailyStats.map((d) => ({
                name: `Dia ${d.dia}`,
                'Planejada (Base)': d.total.baseCap,
                'Realizada (com Folgas)': d.total.activeCap,
              }))}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="name" tickLine={false} style={{ fontSize: '10px' }} />
              <YAxis tickLine={false} style={{ fontSize: '10px' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
              <Area
                type="monotone"
                dataKey="Planejada (Base)"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#colorBase)"
              />
              <Area
                type="monotone"
                dataKey="Realizada (com Folgas)"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorActive)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
