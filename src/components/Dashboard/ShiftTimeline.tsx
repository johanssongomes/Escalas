import React from 'react';
import { Clock, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { getScenarioDetails } from '../../utils/scenarioConfig';

interface ShiftTimelineProps {
  horasSemanais: 40 | 42 | 44;
  cenario: 'A' | 'B' | 'C' | 'D';
}

export const ShiftTimeline: React.FC<ShiftTimelineProps> = ({ horasSemanais, cenario }) => {
  const details = getScenarioDetails(horasSemanais, cenario);

  // We represent the 24 hours as percentages (0 to 100)
  const timeToPct = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return ((h * 60 + m) / (24 * 60)) * 100;
  };

  const t1Start = timeToPct(details.t1.entrada);
  const t1End = timeToPct(details.t1.saida);
  const t2Start = timeToPct(details.t2.entrada);
  const t2End = timeToPct(details.t2.saida);
  const t3Start = timeToPct(details.t3.entrada);
  const t3End = timeToPct(details.t3.saida); // T3 wraps around midnight

  // Overlaps calculation
  // Overlap 1 (T1 & T2): T2 starts at t2Start, T1 ends at t1End
  const overlap1Start = t2Start;
  const overlap1End = t1End;

  // Overlap 2 (T2 & T3): T3 starts at 22:00, T2 ends at t2End
  const overlap2Start = t3Start;
  const overlap2End = t2End;

  // Gap T3 -> T1: T3 ends at t3End, T1 starts at t1Start
  const gapStart = t3End;
  const gapEnd = t1Start;

  // Generate 24 hours labels
  const hours = Array.from({ length: 25 }, (_, i) => i);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm mb-8">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <Clock className="w-5 h-5 text-blue-600" />
          Cronograma Operacional & Cobertura 24 Horas
        </h2>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-850 px-2.5 py-1 rounded-full text-slate-500">
          Visão de Turnos & Sobreposições (Cenário {cenario})
        </span>
      </div>

      {/* Interactive Timeline Container */}
      <div className="relative mt-8 mb-6 px-4">
        {/* Hours grid marker */}
        <div className="relative h-6 flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-2 select-none">
          {hours.map((h) => {
            // Show labels every 2 hours to keep it clean
            const showLabel = h % 2 === 0;
            return (
              <div
                key={h}
                className="absolute flex flex-col items-center"
                style={{ left: `${(h / 24) * 100}%`, transform: 'translateX(-50%)' }}
              >
                <span>{showLabel ? `${String(h).padStart(2, '0')}:00` : ''}</span>
                <span className="h-1.5 w-[1px] bg-slate-200 dark:bg-slate-800 mt-1"></span>
              </div>
            );
          })}
        </div>

        {/* The Timeline Track */}
        <div className="relative h-44 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-900/60 p-4 flex flex-col justify-around overflow-hidden">
          
          {/* Grid line helper */}
          <div className="absolute inset-0 flex justify-between pointer-events-none px-4">
            {hours.map((h) => (
              <div
                key={h}
                className="h-full w-[1px] bg-slate-200/40 dark:bg-slate-800/10"
                style={{ marginLeft: h === 0 ? '0' : 'auto' }}
              />
            ))}
          </div>

          {/* Turno 1 (T1) */}
          <div className="relative h-6 flex items-center">
            <span className="absolute left-0 text-[10px] font-bold text-slate-400 w-16">T1 Matutino</span>
            <div className="w-full pl-20 relative h-full">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${t1End - t1Start}%` }}
                transition={{ duration: 0.8 }}
                className="absolute h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 flex items-center justify-between px-3 text-[9px] font-extrabold text-white shadow-sm"
                style={{ left: `${t1Start}%` }}
              >
                <span>{details.t1.entrada}</span>
                <span>1º Turno</span>
                <span>{details.t1.saida}</span>
              </motion.div>
            </div>
          </div>

          {/* Turno 2 (T2) */}
          <div className="relative h-6 flex items-center">
            <span className="absolute left-0 text-[10px] font-bold text-slate-400 w-16">T2 Vespertino</span>
            <div className="w-full pl-20 relative h-full">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${t2End - t2Start}%` }}
                transition={{ duration: 0.8 }}
                className="absolute h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 flex items-center justify-between px-3 text-[9px] font-extrabold text-white shadow-sm"
                style={{ left: `${t2Start}%` }}
              >
                <span>{details.t2.entrada}</span>
                <span>2º Turno</span>
                <span>{details.t2.saida}</span>
              </motion.div>
            </div>
          </div>

          {/* Turno 3 (T3) */}
          <div className="relative h-6 flex items-center">
            <span className="absolute left-0 text-[10px] font-bold text-slate-400 w-16">T3 Noturno</span>
            <div className="w-full pl-20 relative h-full">
              {/* Segment 1: 22:00 to 24:00 */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${100 - t3Start}%` }}
                transition={{ duration: 0.8 }}
                className="absolute h-full rounded-l-full bg-gradient-to-r from-purple-400 to-purple-500 flex items-center justify-between px-3 text-[9px] font-extrabold text-white shadow-sm"
                style={{ left: `${t3Start}%` }}
              >
                <span>{details.t3.entrada}</span>
                <span>3º Turno</span>
                <span>24:00</span>
              </motion.div>
              {/* Segment 2: 00:00 to morning */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${t3End}%` }}
                transition={{ duration: 0.8 }}
                className="absolute h-full rounded-r-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-between px-3 text-[9px] font-extrabold text-white shadow-sm"
                style={{ left: '0%' }}
              >
                <span>00:00</span>
                <span>3º Turno</span>
                <span>{details.t3.saida}</span>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Highlights / Overlaps annotation track */}
        <div className="relative h-12 mt-4 pl-20">
          {/* Overlap T1-T2 */}
          {overlap1End > overlap1Start && (
            <div
              className="absolute top-0 h-8 border-l border-r border-dashed border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-400/5 text-center flex flex-col items-center justify-center rounded"
              style={{ left: `${overlap1Start}%`, width: `${overlap1End - overlap1Start}%` }}
            >
              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">Sobreposição T1/T2</span>
              <span className="text-[8px] text-slate-500">{details.t2.entrada} - {details.t1.saida} ({details.overlap1})</span>
            </div>
          )}

          {/* Overlap T2-T3 */}
          {overlap2End > overlap2Start && (
            <div
              className="absolute top-0 h-8 border-l border-r border-dashed border-orange-500/40 bg-orange-500/5 dark:bg-orange-400/5 text-center flex flex-col items-center justify-center rounded"
              style={{ left: `${overlap2Start}%`, width: `${overlap2End - overlap2Start}%` }}
            >
              <span className="text-[9px] font-black text-orange-600 dark:text-orange-400">Sobreposição T2/T3</span>
              <span className="text-[8px] text-slate-500">{details.t3.entrada} - {details.t2.saida} ({details.overlap2})</span>
            </div>
          )}

          {/* Gap T3-T1 */}
          {gapEnd > gapStart && details.gap !== '0 min' && (
            <div
              className="absolute top-0 h-8 border-l border-r border-dashed border-purple-500/40 bg-purple-500/5 dark:bg-purple-400/5 text-center flex flex-col items-center justify-center rounded"
              style={{ left: `${gapStart}%`, width: `${gapEnd - gapStart}%` }}
            >
              <span className="text-[8px] font-black text-purple-600 dark:text-purple-400">Janela</span>
              <span className="text-[8px] text-slate-500">{details.gap}</span>
            </div>
          )}

          {/* Overlap T3-T1 (for scenarios like D where T1 starts before T3 ends) */}
          {t3End > t1Start && (
            <div
              className="absolute top-0 h-8 border-l border-r border-dashed border-indigo-500/40 bg-indigo-500/5 dark:bg-indigo-400/5 text-center flex flex-col items-center justify-center rounded"
              style={{ left: `${t1Start}%`, width: `${t3End - t1Start}%` }}
            >
              <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400">Sobreposição T3/T1</span>
              <span className="text-[8px] text-slate-500">{details.t1.entrada} - {details.t3.saida} ({details.gap.replace(' sob.', '')})</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900/60 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-start text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2 font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>Informação de Escala:</span>
        </div>
        <p className="leading-relaxed flex-1">
          As sobreposições de turnos (T1/T2 e T2/T3) fornecem <strong>capacidade operacional redobrada</strong> durante os horários críticos de pico (transição de equipe, recebimento vespertino, expedição de lotes e finalização de carregamento noturno). O gap de 6 minutos entre T3 e T1 representa a janela técnica de limpeza e transição de turnos matutina.
        </p>
      </div>
    </div>
  );
};
