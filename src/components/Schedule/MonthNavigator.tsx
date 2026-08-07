import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { getMonthInfo } from '../../utils/escala52Engine';

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface MonthNavigatorProps {
  month?: number; // 0-11
  year?: number;  // e.g. 2026
  onChangeMonthYear: (newMonth: number, newYear: number, dias: number, weeks: number) => void;
  variant?: 'grid' | 'form';
  className?: string;
}

export const MonthNavigator: React.FC<MonthNavigatorProps> = ({
  month,
  year,
  onChangeMonthYear,
  variant = 'grid',
  className = '',
}) => {
  const currentMonth = month !== undefined && month >= 0 && month <= 11 ? month : new Date().getMonth();
  const currentYear = year !== undefined && year >= 2020 && year <= 2035 ? year : new Date().getFullYear();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let prevM = currentMonth - 1;
    let prevY = currentYear;
    if (prevM < 0) {
      prevM = 11;
      prevY = currentYear - 1;
    }
    const dias = getMonthInfo(prevY, prevM).dias;
    const weeks = Math.ceil(dias / 7);
    onChangeMonthYear(prevM, prevY, dias, weeks);
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let nextM = currentMonth + 1;
    let nextY = currentYear;
    if (nextM > 11) {
      nextM = 0;
      nextY = currentYear + 1;
    }
    const dias = getMonthInfo(nextY, nextM).dias;
    const weeks = Math.ceil(dias / 7);
    onChangeMonthYear(nextM, nextY, dias, weeks);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [yStr, mStr] = e.target.value.split('-');
    const newY = parseInt(yStr, 10);
    const newM = parseInt(mStr, 10);
    if (!isNaN(newY) && !isNaN(newM)) {
      const dias = getMonthInfo(newY, newM).dias;
      const weeks = Math.ceil(dias / 7);
      onChangeMonthYear(newM, newY, dias, weeks);
    }
  };

  // Range of years for dropdown
  const startYear = Math.min(2025, currentYear - 1);
  const endYear = Math.max(2030, currentYear + 2);
  const yearsList: number[] = [];
  for (let y = startYear; y <= endYear; y++) {
    yearsList.push(y);
  }

  if (variant === 'grid') {
    return (
      <div className={`flex items-center justify-between gap-0.5 bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/80 shadow-xs select-none ${className}`}>
        <button
          type="button"
          onClick={handlePrevMonth}
          title="Mês anterior"
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer shrink-0"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div className="relative flex items-center justify-center min-w-0 flex-1">
          <select
            value={`${currentYear}-${currentMonth}`}
            onChange={handleSelectChange}
            className="w-full bg-transparent text-[10px] font-black text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer text-center truncate px-0.5 py-0.5 appearance-none"
            title="Selecionar Mês/Ano"
          >
            {yearsList.map(y =>
              MONTH_NAMES.map((name, mIdx) => (
                <option key={`${y}-${mIdx}`} value={`${y}-${mIdx}`} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold">
                  {name.slice(0, 3)}/{y}
                </option>
              ))
            )}
          </select>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          title="Próximo mês"
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer shrink-0"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-xs select-none ${className}`}>
      <button
        type="button"
        onClick={handlePrevMonth}
        title="Mês anterior"
        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition cursor-pointer flex items-center gap-1 text-xs shrink-0"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        <span className="hidden sm:inline text-[10px]">Anterior</span>
      </button>

      <div className="flex items-center gap-1 min-w-0 flex-1 justify-center">
        <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0 hidden sm:block" />
        <select
          value={`${currentYear}-${currentMonth}`}
          onChange={handleSelectChange}
          className="bg-transparent text-xs font-black text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer py-1 px-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-center truncate"
        >
          {yearsList.map(y =>
            MONTH_NAMES.map((name, mIdx) => (
              <option key={`${y}-${mIdx}`} value={`${y}-${mIdx}`} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold">
                {name} / {y}
              </option>
            ))
          )}
        </select>
      </div>

      <button
        type="button"
        onClick={handleNextMonth}
        title="Próximo mês"
        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition cursor-pointer flex items-center gap-1 text-xs shrink-0"
      >
        <span className="hidden sm:inline text-[10px]">Próximo</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
