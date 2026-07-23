import React from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Percent,
  TrendingDown,
  TrendingUp,
  CalendarRange,
  CalendarCheck,
  CalendarX,
  AlertOctagon,
  Award,
} from 'lucide-react';
import type { DashboardIndicators } from '../../types';

interface IndicatorsProps {
  indicators: DashboardIndicators;
}

export const Indicators: React.FC<IndicatorsProps> = ({ indicators }) => {
  const cards = [
    {
      title: 'Total de Conferentes',
      value: indicators.totalConferentes,
      subtitle: 'Colaboradores ativos',
      icon: <Users className="w-5 h-5 text-blue-600" />,
      gradient: 'from-blue-500/5 to-indigo-500/5',
      border: 'border-blue-100 dark:border-blue-900/30',
    },
    {
      title: 'Cobertura Média',
      value: `${indicators.coberturaMedia}%`,
      subtitle: 'Presença diária média',
      icon: <Percent className="w-5 h-5 text-emerald-600" />,
      gradient: 'from-emerald-500/5 to-teal-500/5',
      border: 'border-emerald-100 dark:border-emerald-900/30',
    },
    {
      title: 'Menor Cobertura',
      value: `${indicators.menorCobertura}%`,
      subtitle: 'Nível mínimo registrado',
      icon: <TrendingDown className="w-5 h-5 text-rose-600" />,
      gradient: 'from-rose-500/5 to-orange-500/5',
      border: 'border-rose-100 dark:border-rose-900/30',
    },
    {
      title: 'Maior Cobertura',
      value: `${indicators.maiorCobertura}%`,
      subtitle: 'Pico de presença',
      icon: <TrendingUp className="w-5 h-5 text-sky-600" />,
      gradient: 'from-sky-500/5 to-cyan-500/5',
      border: 'border-sky-100 dark:border-sky-900/30',
    },
    {
      title: 'Folgas no Mês',
      value: indicators.folgasNoMes,
      subtitle: 'Descansos concedidos',
      icon: <CalendarRange className="w-5 h-5 text-indigo-600" />,
      gradient: 'from-indigo-500/5 to-purple-500/5',
      border: 'border-indigo-100 dark:border-indigo-900/30',
    },
    {
      title: 'Domingos Trabalhados',
      value: indicators.domingosTrabalhados,
      subtitle: 'Acumulado no período',
      icon: <CalendarCheck className="w-5 h-5 text-amber-600" />,
      gradient: 'from-amber-500/5 to-yellow-500/5',
      border: 'border-amber-100 dark:border-amber-900/30',
    },
    {
      title: 'Domingos de Folga',
      value: indicators.domingosDeFolga,
      subtitle: 'Descansos dominicais',
      icon: <CalendarX className="w-5 h-5 text-violet-600" />,
      gradient: 'from-violet-500/5 to-fuchsia-500/5',
      border: 'border-violet-100 dark:border-violet-900/30',
    },
    {
      title: 'Dias Críticos',
      value: indicators.diasCriticos,
      subtitle: 'Cobertura < 70% ou zero escala',
      icon: <AlertOctagon className="w-5 h-5 text-red-600" />,
      gradient: 'from-red-500/5 to-rose-500/5',
      border: 'border-red-100 dark:border-red-900/30',
      valueClass: indicators.diasCriticos > 0 ? 'text-red-600 dark:text-red-400' : '',
    },
    {
      title: 'Eficiência da Escala',
      value: `${indicators.eficienciaEscala}%`,
      subtitle: 'Equilíbrio e aderência CLT',
      icon: <Award className="w-5 h-5 text-yellow-600" />,
      gradient: 'from-yellow-500/5 to-amber-500/5',
      border: 'border-yellow-100 dark:border-yellow-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-9 gap-4 mb-8">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          whileHover={{ y: -2, transition: { duration: 0.15 } }}
          className={`xl:col-span-1 p-4 rounded-2xl border ${card.border} bg-gradient-to-br ${card.gradient} bg-white dark:bg-slate-900 flex flex-col justify-between shadow-sm`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
              {card.title}
            </span>
            <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-800">
              {card.icon}
            </div>
          </div>
          <div>
            <h4 className={`text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 ${card.valueClass || ''}`}>
              {card.value}
            </h4>
            <p className="text-[10px] text-slate-400 mt-1 font-medium truncate">{card.subtitle}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
