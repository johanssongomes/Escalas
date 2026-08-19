import React from 'react';
import { Clock, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { getScenarioDetails } from '../../utils/scenarioConfig';

interface ShiftTimelineProps {
  horasSemanais: 40 | 42 | 44;
  cenario: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  customT1Entrada?: string;
  customT2Entrada?: string;
  customT3Entrada?: string;
}

export const ShiftTimeline: React.FC<ShiftTimelineProps> = ({
  horasSemanais,
  cenario,
  customT1Entrada,
  customT2Entrada,
  customT3Entrada,
}) => {
  const details = getScenarioDetails(horasSemanais, cenario, customT1Entrada, customT2Entrada, customT3Entrada);

  const timeToMins = (t: string): number => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const h = horasSemanais;
  const dur1 = Math.round((h / 5 + 1) * 60);
  const dur2 = Math.round((h / 5 + 1) * 60);
  const dur3 = Math.round((h / 5) * 60);

  const T1_start = timeToMins(details.t1.entrada);
  const T1_end = T1_start + dur1;

  let T2_start = timeToMins(details.t2.entrada);
  if (T2_start < T1_start) {
    T2_start += 24 * 60;
  }
  const T2_end = T2_start + dur2;

  let T3_start = timeToMins(details.t3.entrada);
  while (T3_start < T2_start) {
    T3_start += 24 * 60;
  }
  const T3_end = T3_start + dur3;

  const T1_next_start = T1_start + 24 * 60;

  // Percentages for timeline track (normalized to 24h)
  const t1Start = (T1_start / 1440) * 100 % 100;
  const t1End = (T1_end / 1440) * 100;
  const t2Start = (T2_start / 1440) * 100 % 100;
  const t2End = (T2_end / 1440) * 100;
  const t3Start = (T3_start / 1440) * 100 % 100;
  const t3End = (T3_end / 1440) * 100;

  // Helper to render shift bars that may wrap around midnight (width or end crosses 100%)
  const renderShiftBar = (
    label: string,
    entrada: string,
    saida: string,
    startPct: number,
    endPct: number,
    bgClass: string
  ) => {
    const endPctNorm = endPct % 100;
    const wraps = endPct > 100 || endPctNorm < startPct;

    if (wraps) {
      const seg1Width = 100 - startPct;
      const seg2Width = endPctNorm;
      return (
        <>
          {/* Segment 1: startPct to 100% */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${seg1Width}%` }}
            transition={{ duration: 0.8 }}
            className={`absolute h-full rounded-l-full bg-gradient-to-r ${bgClass} flex items-center justify-between px-3 text-[9px] font-extrabold text-white shadow-sm`}
            style={{ left: `${startPct}%` }}
          >
            <span>{entrada}</span>
            <span>{label}</span>
            <span>24:00</span>
          </motion.div>
          {/* Segment 2: 00:00 to endPctNorm */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${seg2Width}%` }}
            transition={{ duration: 0.8 }}
            className={`absolute h-full rounded-r-full bg-gradient-to-r ${bgClass} flex items-center justify-between px-3 text-[9px] font-extrabold text-white shadow-sm`}
            style={{ left: '0%' }}
          >
            <span>00:00</span>
            <span>{label}</span>
            <span>{saida}</span>
          </motion.div>
        </>
      );
    } else {
      return (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${endPct - startPct}%` }}
          transition={{ duration: 0.8 }}
          className={`absolute h-full rounded-full bg-gradient-to-r ${bgClass} flex items-center justify-between px-3 text-[9px] font-extrabold text-white shadow-sm`}
          style={{ left: `${startPct}%` }}
        >
          <span>{entrada}</span>
          <span>{label}</span>
          <span>{saida}</span>
        </motion.div>
      );
    }
  };

  // Overlaps calculation
  const hasOverlap1 = T1_end > T2_start;
  const overlap1Center = hasOverlap1 ? (((T2_start + Math.min(T1_end, T2_end)) / 2) / 1440 * 100) % 100 : 0;

  const hasOverlap2 = T2_end > T3_start;
  const overlap2Center = hasOverlap2 ? (((T3_start + Math.min(T2_end, T3_end)) / 2) / 1440 * 100) % 100 : 0;

  const hasOverlap3 = T3_end > T1_next_start;
  const overlap3Center = hasOverlap3 ? (((T1_next_start + T3_end) / 2) / 1440 * 100) % 100 : 0;

  const hasGap3 = T3_end < T1_next_start && details.gap !== '0 min' && !details.gap.includes('sob.');
  const gapCenter = hasGap3 ? (((T3_end + T1_next_start) / 2) / 1440 * 100) % 100 : 0;

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
              {renderShiftBar('1º Turno', details.t1.entrada, details.t1.saida, t1Start, t1End, 'from-emerald-400 to-emerald-500')}
            </div>
          </div>

          {/* Turno 2 (T2) */}
          <div className="relative h-6 flex items-center">
            <span className="absolute left-0 text-[10px] font-bold text-slate-400 w-16">T2 Vespertino</span>
            <div className="w-full pl-20 relative h-full">
              {renderShiftBar('2º Turno', details.t2.entrada, details.t2.saida, t2Start, t2End, 'from-orange-400 to-orange-500')}
            </div>
          </div>

          {/* Turno 3 (T3) */}
          <div className="relative h-6 flex items-center">
            <span className="absolute left-0 text-[10px] font-bold text-slate-400 w-16">T3 Noturno</span>
            <div className="w-full pl-20 relative h-full">
              {renderShiftBar('3º Turno', details.t3.entrada, details.t3.saida, t3Start, t3End, 'from-purple-400 to-purple-500')}
            </div>
          </div>
        </div>

        {/* Highlights / Overlaps annotation track */}
        <div className="relative h-12 mt-4 pl-20">
          {/* Overlap T1-T2 */}
          {hasOverlap1 && (() => {
            return (
              <div
                className="absolute top-0 h-8 border border-dashed border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-400/5 text-center flex flex-col items-center justify-center rounded shadow-sm px-2"
                style={{ left: `${overlap1Center}%`, transform: 'translateX(-50%)', minWidth: '140px' }}
              >
                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">Sobreposição T1/T2</span>
                <span className="text-[8px] text-slate-500 dark:text-slate-400 whitespace-nowrap font-bold">{details.t2.entrada} - {details.t1.saida} ({details.overlap1})</span>
              </div>
            );
          })()}

          {/* Overlap T2-T3 */}
          {hasOverlap2 && (() => {
            return (
              <div
                className="absolute top-0 h-8 border border-dashed border-orange-500/40 bg-orange-500/5 dark:bg-orange-400/5 text-center flex flex-col items-center justify-center rounded shadow-sm px-2"
                style={{ left: `${overlap2Center}%`, transform: 'translateX(-50%)', minWidth: '140px' }}
              >
                <span className="text-[9px] font-black text-orange-600 dark:text-orange-400 whitespace-nowrap">Sobreposição T2/T3</span>
                <span className="text-[8px] text-slate-500 dark:text-slate-400 whitespace-nowrap font-bold">{details.t3.entrada} - {details.t2.saida} ({details.overlap2})</span>
              </div>
            );
          })()}

          {/* Gap T3-T1 */}
          {hasGap3 && (() => {
            return (
              <div
                className="absolute top-0 h-8 border border-dashed border-purple-500/40 bg-purple-500/5 dark:bg-purple-400/5 text-center flex flex-col items-center justify-center rounded shadow-sm px-2"
                style={{ left: `${gapCenter}%`, transform: 'translateX(-50%)', minWidth: '120px' }}
              >
                <span className="text-[9px] font-black text-purple-600 dark:text-purple-400 whitespace-nowrap">Janela Sem Turno</span>
                <span className="text-[8px] text-slate-500 dark:text-slate-400 whitespace-nowrap font-bold">{details.gap}</span>
              </div>
            );
          })()}

          {/* Overlap T3-T1 (for scenarios like D or custom where T1 starts before T3 ends) */}
          {hasOverlap3 && (() => {
            return (
              <div
                className="absolute top-0 h-8 border border-dashed border-indigo-500/40 bg-indigo-500/5 dark:bg-indigo-400/5 text-center flex flex-col items-center justify-center rounded shadow-sm px-2"
                style={{ left: `${overlap3Center}%`, transform: 'translateX(-50%)', minWidth: '140px' }}
              >
                <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">Sobreposição T3/T1</span>
                <span className="text-[8px] text-slate-500 dark:text-slate-400 whitespace-nowrap font-bold">{details.t1.entrada} - {details.t3.saida} ({details.gap.replace(' sob.', '')})</span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Scale Information Box (Dynamic) */}
      {(() => {
        const isOverlapT3T1 = details.gap.includes('sob.');
        const gapTime = details.gap.replace(' sob.', '');
        
        let t3t1Text = "";
        if (isOverlapT3T1) {
          t3t1Text = `Há também uma sobreposição operacional de ${gapTime} entre o T3 e o T1 (das ${details.t1.entrada} às ${details.t3.saida}), garantindo cobertura contínua e transição suave na entrada do turno matutino.`;
        } else if (gapTime !== '0 min' && gapTime !== '0') {
          t3t1Text = `O gap de ${gapTime} entre o T3 e o T1 (das ${details.t3.saida} às ${details.t1.entrada}) representa a janela técnica de limpeza e transição de turnos matutina.`;
        } else {
          t3t1Text = `A transição entre o T3 e o T1 ocorre de forma contínua às ${details.t1.entrada}, sem intervalo ou sobreposição entre os turnos.`;
        }

        return (
          <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900/60 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-start text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2 font-semibold text-blue-600 dark:text-blue-400 mt-0.5 shrink-0">
              <Info className="w-4 h-4" />
              <span>Informação de Escala:</span>
            </div>
            <p className="leading-relaxed flex-1">
              As sobreposições de turnos (T1/T2 e T2/T3) fornecem <strong>capacidade operacional redobrada</strong> de <strong>{details.overlap1}</strong> e <strong>{details.overlap2}</strong>, respectivamente, durante os horários críticos de pico (transição de equipe, recebimento vespertino, expedição de lotes e finalização de carregamento noturno). {t3t1Text}
            </p>
          </div>
        );
      })()}
    </div>
  );
};
