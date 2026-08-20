import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { Settings, Users, Calendar, Sparkles, Info } from 'lucide-react';
import type { ScheduleParams } from '../../types';
import { getMonthInfo } from '../../utils/escala52Engine';
import { MonthNavigator } from './MonthNavigator';
import { ShiftCards } from './ShiftCards';
// const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const schema = zod.object({
  conferentesT1: zod.number().min(1, 'Mínimo 1').max(100, 'Máximo 100'),
  conferentesT2: zod.number().min(1, 'Mínimo 1').max(100, 'Máximo 100'),
  conferentesT3: zod.number().min(1, 'Mínimo 1').max(100, 'Máximo 100'),
  weeks: zod.number().min(1, 'Mínimo 1').max(12, 'Máximo 12'),
  dias: zod.number().min(7, 'Mínimo 7').max(84, 'Máximo 84'),
  escala: zod.literal('5x2'),
  consecutiveOffDays: zod.number().min(1, 'Mínimo 1').max(3, 'Máximo 3'),
  maxConsecutiveSundays: zod.number().min(1, 'Mínimo 1').max(5, 'Máximo 5'),
  horasSemanais: zod.union([zod.literal(40), zod.literal(42), zod.literal(44)]),
  cenario: zod.union([zod.literal('A'), zod.literal('B'), zod.literal('C'), zod.literal('D'), zod.literal('E'), zod.literal('F')]),
  setor: zod.union([zod.literal('comercio'), zod.literal('supermercado')]),
  month: zod.number().min(0).max(11).optional(),
  year: zod.number().min(2020).max(2035).optional(),
  maxConsecutiveWorkDays: zod.number().min(5).max(6).optional(),
  rotationSequence: zod.union([zod.literal('A'), zod.literal('B'), zod.literal('C')]).optional(),
  customT1Entrada: zod.string().optional(),
  customT2Entrada: zod.string().optional(),
  customT3Entrada: zod.string().optional(),
});

interface ParametersFormProps {
  initialValues: ScheduleParams;
  onChange: (values: ScheduleParams) => void;
  plain?: boolean;
}

export const ParametersForm: React.FC<ParametersFormProps> = ({
  initialValues,
  onChange,
  plain = false,
}) => {
  const {
    register,
    watch,
    setValue,
    getValues,
    formState: {},
  } = useForm<ScheduleParams>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    setValue('conferentesT1', initialValues.conferentesT1);
    setValue('conferentesT2', initialValues.conferentesT2);
    setValue('conferentesT3', initialValues.conferentesT3);
    setValue('horasSemanais', initialValues.horasSemanais);
    setValue('cenario', initialValues.cenario);
    setValue('setor', initialValues.setor);
    if (initialValues.month !== undefined) setValue('month', initialValues.month);
    if (initialValues.year !== undefined) setValue('year', initialValues.year);
    setValue('maxConsecutiveWorkDays', initialValues.maxConsecutiveWorkDays ?? 6);
    setValue('rotationSequence', initialValues.rotationSequence ?? 'A');
    setValue('customT1Entrada', initialValues.customT1Entrada);
    setValue('customT2Entrada', initialValues.customT2Entrada);
    setValue('customT3Entrada', initialValues.customT3Entrada);

    if (initialValues.month !== undefined && initialValues.month !== -1 && initialValues.year !== undefined) {
      const calculatedDays = getMonthInfo(initialValues.year, initialValues.month).dias;
      const calculatedWeeks = Math.ceil(calculatedDays / 7);
      setValue('dias', calculatedDays);
      setValue('weeks', calculatedWeeks);
    } else {
      setValue('weeks', initialValues.weeks);
      setValue('dias', initialValues.dias);
    }
  }, [
    initialValues.conferentesT1, initialValues.conferentesT2, initialValues.conferentesT3,
    initialValues.weeks, initialValues.dias,
    initialValues.horasSemanais, initialValues.cenario, initialValues.setor,
    initialValues.month, initialValues.year, initialValues.maxConsecutiveWorkDays, initialValues.rotationSequence, setValue
  ]);

  // Watch all values to trigger automatic recalculation
  const watchedValues = watch();

  // Track previous values to detect changes
  const [prevMonth, setPrevMonth] = useState<number | undefined>(initialValues.month);
  const [prevYear, setPrevYear] = useState<number | undefined>(initialValues.year);
  const [prevWeeks, setPrevWeeks] = useState<number | undefined>(initialValues.weeks);
  const [prevDias, setPrevDias] = useState<number | undefined>(initialValues.dias);

  useEffect(() => {
    const currentMonth = watchedValues.month;
    const currentYear = watchedValues.year;
    const currentWeeks = watchedValues.weeks;
    const currentDias = watchedValues.dias;

    // Detect what changed
    if (currentMonth !== prevMonth || currentYear !== prevYear) {
      if (currentMonth !== undefined && currentMonth !== -1 && currentYear !== undefined) {
        const calculatedDays = getMonthInfo(currentYear, currentMonth).dias;
        const calculatedWeeks = Math.ceil(calculatedDays / 7);
        setValue('dias', calculatedDays);
        setValue('weeks', calculatedWeeks);
        setPrevWeeks(calculatedWeeks);
        setPrevDias(calculatedDays);
        onChange({ ...watchedValues, dias: calculatedDays, weeks: calculatedWeeks } as ScheduleParams);
      } else if (currentMonth === -1) {
        setValue('dias', 28);
        setValue('weeks', 4);
        setPrevWeeks(4);
        setPrevDias(28);
        onChange({ ...watchedValues, dias: 28, weeks: 4 } as ScheduleParams);
      }
      setPrevMonth(currentMonth);
      setPrevYear(currentYear);
      return;
    }
    if (currentWeeks !== prevWeeks) {
      if (currentWeeks !== undefined) {
        const calculatedDays = currentWeeks * 7;
        setValue('dias', calculatedDays);
        setPrevDias(calculatedDays);
      }
      setPrevWeeks(currentWeeks);
    } else if (currentDias !== prevDias) {
      if (currentDias !== undefined) {
        const calculatedWeeks = Math.ceil(currentDias / 7);
        setValue('weeks', calculatedWeeks);
        setPrevWeeks(calculatedWeeks);
      }
      setPrevDias(currentDias);
    }

    // Auto-adjust max Sundays based on sector limits
    if (watchedValues.setor === 'comercio' && (watchedValues.maxConsecutiveSundays || 0) > 2) {
      setValue('maxConsecutiveSundays', 2);
    } else if (watchedValues.setor === 'supermercado' && (watchedValues.maxConsecutiveSundays || 0) > 3) {
      setValue('maxConsecutiveSundays', 3);
    }

    // Call parent onChange
    onChange(watchedValues as ScheduleParams);
  }, [JSON.stringify(watchedValues)]);

  const renderFormContent = () => (
    <form className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Lado Esquerdo (2 colunas) contendo Conferentes, Período e Jornada */}
        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Section: Workers Count */}
            <div className="space-y-3 p-3 bg-slate-50/70 dark:bg-slate-950/20 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <h3 className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-305">
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                Equipe (Conferentes)
              </h3>
              
              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-[11px] mb-0.5 font-semibold">
                    <span className="text-emerald-700 dark:text-emerald-400">1º Turno (T1)</span>
                    <span className="text-slate-550 dark:text-slate-400 font-bold">{watchedValues.conferentesT1} colabs</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    className="w-full h-1 bg-emerald-200 dark:bg-emerald-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    {...register('conferentesT1', { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-0.5 font-semibold">
                    <span className="text-orange-700 dark:text-orange-400">2º Turno (T2)</span>
                    <span className="text-slate-550 dark:text-slate-400 font-bold">{watchedValues.conferentesT2} colabs</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    className="w-full h-1 bg-orange-200 dark:bg-orange-950 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    {...register('conferentesT2', { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-0.5 font-semibold">
                    <span className="text-purple-700 dark:text-purple-400">3º Turno (T3)</span>
                    <span className="text-slate-550 dark:text-slate-400 font-bold">{watchedValues.conferentesT3} colabs</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    className="w-full h-1 bg-purple-200 dark:bg-purple-950 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    {...register('conferentesT3', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>

            {/* Section: Period Constraints */}
            <div className="space-y-3 p-3 bg-slate-50/70 dark:bg-slate-950/20 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-305">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  Período & Regras
                </h3>
                <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  Escala 5x2 | 2 Folgas
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Mês de Referência</label>
                  <MonthNavigator
                    month={watchedValues.month}
                    year={watchedValues.year}
                    onChangeMonthYear={(newM, newY, calculatedDays, calculatedWeeks) => {
                      setValue('month', newM);
                      setValue('year', newY);
                      setValue('dias', calculatedDays);
                      setValue('weeks', calculatedWeeks);
                      onChange({
                        ...watchedValues,
                        month: newM,
                        year: newY,
                        dias: calculatedDays,
                        weeks: calculatedWeeks,
                      } as ScheduleParams);
                    }}
                    variant="form"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Semanas</label>
                  <select
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 focus:ring-1 focus:ring-blue-500 font-bold disabled:opacity-60 disabled:bg-slate-50 dark:disabled:bg-slate-950/40 disabled:cursor-not-allowed"
                    {...register('weeks', { valueAsNumber: true })}
                    disabled={watchedValues.month !== -1}
                  >
                    <option value={2}>2 semanas</option>
                    <option value={4}>4 semanas</option>
                    <option value={5}>5 semanas</option>
                    <option value={6}>6 semanas</option>
                    <option value={8}>8 semanas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Dias Totais</label>
                  <input
                    type="number"
                    min={7}
                    max={84}
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 font-bold focus:ring-1 focus:ring-blue-500 disabled:opacity-60 disabled:bg-slate-50 dark:disabled:bg-slate-950/40 disabled:cursor-not-allowed"
                    {...register('dias', { valueAsNumber: true })}
                    disabled={watchedValues.month !== -1}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Carga Horária Semanal</label>
                  <select
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 focus:ring-1 focus:ring-blue-500 font-bold"
                    {...register('horasSemanais', { valueAsNumber: true })}
                  >
                    <option value={40}>40 horas (8h/dia)</option>
                    <option value={42}>42 horas (8h24/dia - Padrão)</option>
                    <option value={44}>44 horas (8h48/dia)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Jornada & Cenários de Turnos */}
          <div className="space-y-4 p-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100 dark:border-slate-850 flex flex-col justify-between">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              {/* Carga Horária */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-200">1. Jornada Semanal</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Defina a carga horária base</p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-850">
                  {([40, 42, 44] as const).map((hours) => (
                    <button
                      key={hours}
                      type="button"
                      onClick={() => setValue('horasSemanais', hours)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black transition duration-200 cursor-pointer ${
                        watchedValues.horasSemanais === hours
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      {hours} Horas
                    </button>
                  ))}
                </div>
              </div>

              {/* Cenário de Sobreposição */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-3 md:pt-0 md:pl-4">
                <div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-200">2. Cenário de Turnos</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Altere as sobreposições operacionais</p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-850">
                  {(['A', 'B', 'C', 'D', 'E', 'F'] as const).map((scen) => (
                    <button
                      key={scen}
                      type="button"
                      onClick={() => {
                        setValue('cenario', scen);
                        onChange(getValues());
                      }}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black transition duration-200 cursor-pointer ${
                        watchedValues.cenario === scen
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      Cenário {scen}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cards de jornada por turno */}
            <ShiftCards
              horasSemanais={watchedValues.horasSemanais || 42}
              cenario={watchedValues.cenario || 'A'}
              customT1Entrada={watchedValues.customT1Entrada}
              customT2Entrada={watchedValues.customT2Entrada}
              customT3Entrada={watchedValues.customT3Entrada}
              onParamsChange={(newParams) => {
                Object.entries(newParams).forEach(([k, v]) => {
                  setValue(k as any, v);
                });
                onChange(getValues());
              }}
            />
          </div>
        </div>

        {/* Section: Advanced Rules (Lado Direito - 1 coluna) */}
        <div className="space-y-3 p-3 bg-slate-50/70 dark:bg-slate-950/20 rounded-xl border border-slate-100 dark:border-slate-800/80">
          <h3 className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-305">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            Configurações da CLT & CCT
          </h3>

          <div className="space-y-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Setor de Atuação</label>
              <select
                className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 focus:ring-1 focus:ring-blue-500 font-bold"
                {...register('setor')}
              >
                <option value="comercio">Comércio Geral (Folga 1x3)</option>
                <option value="supermercado">Supermercados (Folga 1x4)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Domingos Máximos Consecutivos</label>
              <select
                className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 focus:ring-1 focus:ring-blue-500 font-bold"
                {...register('maxConsecutiveSundays', { valueAsNumber: true })}
              >
                <option value={1}>1 domingo</option>
                <option value={2}>2 domingos{watchedValues.setor === 'comercio' && ' (Limite Comércio)'}</option>
                {watchedValues.setor === 'supermercado' && (
                  <option value={3}>3 domingos (Limite Supermercados)</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Máximo de Dias Trabalhados Consecutivos</label>
              <select
                className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 focus:ring-1 focus:ring-blue-500 font-bold"
                {...register('maxConsecutiveWorkDays', { valueAsNumber: true })}
              >
                <option value={5}>5 dias (Foco Ergonomia - Gera folgas extras e fins de semana de 3 dias no T2)</option>
                <option value={6}>6 dias (Limite CLT - Garante escala 5x2 perfeita de 104 folgas/ano no T2 - Recomendado)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Ciclo de Rotação de Equipes</label>
              <select
                className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 focus:ring-1 focus:ring-blue-500 font-bold"
                {...register('rotationSequence')}
              >
                <option value="A">Rotação A (100% CLT Feminina - Folga Domingo 1x1)</option>
                <option value="B">Rotação B (Operação Contínua - Folga Domingo 1x2)</option>
                <option value="C">Rotação C (Redução Custo FDS)</option>
              </select>
            </div>

            {(() => {
              const maxWorkDays = watchedValues.maxConsecutiveWorkDays ?? 6;
              const rotation = watchedValues.rotationSequence ?? 'A';
              
              const exp = rotation === 'C'
                ? {
                    title: 'Rotação C (Redução Custo FDS)',
                    badge: 'Redução de Custo',
                    color: 'green' as const,
                    desc: `SÁBADO: T1 trabalha • T2 folga • T3 folga. DOMINGO: T1 folga • T2 trabalha • T3 trabalha. Menos turnos simultâneos no fim de semana reduz custo com fretado e alimentação. Dias úteis seguem rotação A.`,
                  }
                : rotation === 'B'
                ? (maxWorkDays === 5
                  ? {
                      title: 'Rotação B + Limite de 5 Dias',
                      badge: 'Operação Contínua',
                      color: 'blue' as const,
                      desc: 'Nesta rotação, a sequência natural de trabalho nunca passa de 5 dias seguidos (Folga Dom/Seg → Sáb/Dom → Qui/Sex → Ter/Qua). A escala permanece natural e otimizada.'
                    }
                  : {
                      title: 'Rotação B + Limite de 6 Dias',
                      badge: 'Operação Contínua',
                      color: 'blue' as const,
                      desc: 'Como a Rotação B já possui no máximo 5 dias de trabalho consecutivos por natureza, o limite de 6 dias não gera nenhuma alteração prática ou quebra na escala.'
                    }
                )
                : (maxWorkDays === 5
                  ? {
                      title: 'Rotação A + Limite de 5 Dias',
                      badge: '100% CLT Feminina',
                      color: 'amber' as const,
                      desc: 'A transição Qui/Sex → Sáb/Dom geraria 7 dias de trabalho seguidos. Com limite de 5 dias, o sistema quebra essa sequência inserindo folgas intermediárias.'
                    }
                  : {
                      title: 'Rotação A + Limite de 6 Dias',
                      badge: '100% CLT Feminina',
                      color: 'amber' as const,
                      desc: 'Evita os 7 dias de trabalho consecutivos na transição Qui/Sex → Sáb/Dom. O sistema insere um limite de 6 dias, gerando um final de semana longo de 3 dias.'
                    }
                );

              return (
                <div className="mt-3 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                    <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>{exp.title}</span>
                    <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                      exp.color === 'blue'
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                        : exp.color === 'green'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                    }`}>
                      {exp.badge}
                    </span>
                  </div>
                  {rotation === 'C' ? (
                    <div className="space-y-1.5 mt-1">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="rounded-md p-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                          <p className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-0.5">Sábado</p>
                          <p className="text-[9px] font-bold text-slate-600 dark:text-slate-300">✅ T1 trabalha <span className="text-[8px] text-slate-400">(manhã)</span></p>
                          <p className="text-[9px] font-bold text-slate-600 dark:text-slate-300">❌ T2 folga</p>
                          <p className="text-[9px] font-bold text-slate-600 dark:text-slate-300">✅ T3 trabalha <span className="text-[8px] text-slate-400">(entrada Sex)</span></p>
                        </div>
                        <div className="rounded-md p-1.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900">
                          <p className="text-[9px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wide mb-0.5">Domingo</p>
                          <p className="text-[9px] font-bold text-slate-600 dark:text-slate-300">❌ T1 folga</p>
                          <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400">🔄 T2 <span className="text-[8px]">rodízio equipes</span></p>
                          <p className="text-[9px] font-bold text-slate-600 dark:text-slate-300">❌ T3 folga <span className="text-[8px] text-slate-400">(não trabalha Sáb→Dom)</span></p>
                        </div>
                      </div>
                      {/* T2 Sunday rotation detail */}
                      <div className="rounded-md p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 space-y-1">
                        <p className="text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wide">T2 — Rodízio Domingo por Equipe</p>
                        <div className="grid grid-cols-2 gap-1">
                          <div>
                            <p className="text-[8.5px] font-black text-slate-600 dark:text-slate-300">Semana PAR</p>
                            <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400">✅ Eqs A + C trabalham</p>
                            <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400">❌ Eqs B + D folgam</p>
                          </div>
                          <div>
                            <p className="text-[8.5px] font-black text-slate-600 dark:text-slate-300">Semana ÍMPAR</p>
                            <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400">❌ Eqs A + C folgam</p>
                            <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400">✅ Eqs B + D trabalham</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-[8.5px] text-slate-400 dark:text-slate-500 italic leading-relaxed">
                        T3: entrada sexta = turno contado no Sábado. Folga Domingo (não trabalha Sáb→Dom). T2: cada equipe folga ~50% dos domingos.
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      {exp.desc}
                    </p>
                  )}
                </div>
              );
            })()}
        </div>
      </div>
    </div>
  </form>
  );

  if (plain) {
    return (
      <div className="p-3 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-850">
        <div className="flex items-center justify-between mb-3 pb-1.5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-xs font-black flex items-center gap-1.5 text-slate-800 dark:text-slate-205">
            <Settings className="w-3.5 h-3.5 text-blue-500" />
            Configurações e Parâmetros da Escala
          </h3>
          <span className="text-[8.5px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            Simulação Ativa
          </span>
        </div>
        {renderFormContent()}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm mb-8">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <Settings className="w-5 h-5 text-blue-600" />
          Parâmetros da Escala & Simulação
        </h2>
        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          Simulação Ativa
        </span>
      </div>

    <form className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Section: Workers Count */}
          <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-900/60">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Users className="w-4 h-4 text-emerald-500" />
              Equipe (Conferentes)
            </h3>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-emerald-700 dark:text-emerald-400">1º Turno (T1)</span>
                  <span className="text-slate-500">{watchedValues.conferentesT1} colabs</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  className="w-full h-1.5 bg-emerald-200 dark:bg-emerald-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  {...register('conferentesT1', { valueAsNumber: true })}
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-orange-700 dark:text-orange-400">2º Turno (T2)</span>
                  <span className="text-slate-500">{watchedValues.conferentesT2} colabs</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  className="w-full h-1.5 bg-orange-200 dark:bg-orange-950 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  {...register('conferentesT2', { valueAsNumber: true })}
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-purple-700 dark:text-purple-400">3º Turno (T3)</span>
                  <span className="text-slate-500">{watchedValues.conferentesT3} colabs</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  className="w-full h-1.5 bg-purple-200 dark:bg-purple-950 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  {...register('conferentesT3', { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          {/* Section: Period Constraints */}
          <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-900/60">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-blue-500" />
              Período & Regras
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Semanas</label>
                <select
                  className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                  {...register('weeks', { valueAsNumber: true })}
                >
                  <option value={2}>2 semanas</option>
                  <option value={4}>4 semanas</option>
                  <option value={6}>6 semanas</option>
                  <option value={8}>8 semanas</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Dias Totais</label>
                <input
                  type="text"
                  disabled
                  value={`${watchedValues.dias} dias`}
                  className="w-full text-sm bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-semibold text-center text-slate-600 dark:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Escala</label>
                <input
                  type="text"
                  disabled
                  value="5x2"
                  className="w-full text-sm bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-semibold text-center text-slate-600 dark:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Folgas Consecutivas</label>
                <input
                  type="text"
                  disabled
                  value="2 folgas"
                  className="w-full text-sm bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-semibold text-center text-slate-600 dark:text-slate-400"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Carga Horária Semanal</label>
                <select
                  className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 font-bold"
                  {...register('horasSemanais', { valueAsNumber: true })}
                >
                  <option value={40}>40 horas (8h/dia)</option>
                  <option value={42}>42 horas (8h24/dia - Padrão)</option>
                  <option value={44}>44 horas (8h48/dia)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Advanced Rules */}
          <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-900/60 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-3">
                <Sparkles className="w-4 h-4 text-orange-500" />
                Configurações da CLT & CCT
              </h3>

              <div className="mb-3">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Setor de Atuação</label>
                <select
                  className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 font-bold"
                  {...register('setor')}
                >
                  <option value="comercio">Comércio Geral (Folga 1x3)</option>
                  <option value="supermercado">Supermercados (Folga 1x4)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Domingos Máximos Consecutivos
                </label>
                <select
                  className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                  {...register('maxConsecutiveSundays', { valueAsNumber: true })}
                >
                  <option value={1}>1 domingo</option>
                  <option value={2}>2 domingos{watchedValues.setor === 'comercio' && ' (Limite Comércio)'}</option>
                  {watchedValues.setor === 'supermercado' && (
                    <option value={3}>3 domingos (Limite Supermercados)</option>
                  )}
                </select>
              </div>
            </div>

          </div>
        </div>
      </form>
    </div>
  );
};
