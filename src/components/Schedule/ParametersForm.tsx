import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { Settings, Users, Calendar, Sparkles } from 'lucide-react';
import type { ScheduleParams } from '../../types';
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

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
  cenario: zod.union([zod.literal('A'), zod.literal('B'), zod.literal('C'), zod.literal('D')]),
  setor: zod.union([zod.literal('comercio'), zod.literal('supermercado')]),
  month: zod.number().min(0).max(11).optional(),
  year: zod.number().min(2020).max(2035).optional(),
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
    formState: {},
  } = useForm<ScheduleParams>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  // Keep form in sync when parent initialValues change
  useEffect(() => {
    setValue('horasSemanais', initialValues.horasSemanais);
    setValue('cenario', initialValues.cenario);
    setValue('setor', initialValues.setor);
    if (initialValues.month !== undefined) setValue('month', initialValues.month);
    if (initialValues.year !== undefined) setValue('year', initialValues.year);
  }, [initialValues.horasSemanais, initialValues.cenario, initialValues.setor, initialValues.month, initialValues.year, setValue]);

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
        const calculatedDays = new Date(currentYear, currentMonth + 1, 0).getDate();
        const calculatedWeeks = Math.ceil(calculatedDays / 7);
        setValue('dias', calculatedDays);
        setValue('weeks', calculatedWeeks);
        setPrevWeeks(calculatedWeeks);
        setPrevDias(calculatedDays);
      } else if (currentMonth === -1) {
        setValue('dias', 28);
        setValue('weeks', 4);
        setPrevWeeks(4);
        setPrevDias(28);
      }
      setPrevMonth(currentMonth);
      setPrevYear(currentYear);
    } else if (currentWeeks !== prevWeeks) {
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
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Mês de Referência</label>
                <select
                  className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 font-bold"
                  {...register('month', { valueAsNumber: true })}
                >
                  <option value={-1}>Personalizado</option>
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx} value={idx}>{name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Ano</label>
                <select
                  className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 font-bold"
                  {...register('year', { valueAsNumber: true })}
                >
                  {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Semanas</label>
              <select
                className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 font-bold"
                {...register('weeks', { valueAsNumber: true })}
              >
                <option value={2}>2 semanas</option>
                <option value={4}>4 semanas</option>
                <option value={5}>5 semanas</option>
                <option value={6}>6 semanas</option>
                <option value={8}>8 semanas</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Dias Totais</label>
              <input
                type="number"
                min={7}
                max={84}
                className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-bold focus:ring-2 focus:ring-blue-500"
                {...register('dias', { valueAsNumber: true })}
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
  );

  if (plain) {
    return (
      <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-extrabold flex items-center gap-2 text-slate-800 dark:text-slate-250">
            <Settings className="w-4 h-4 text-blue-500" />
            Configurações e Parâmetros da Escala
          </h3>
          <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
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
