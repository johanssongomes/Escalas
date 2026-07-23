import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Sunset, Moon, Info, Clock, ShieldAlert } from 'lucide-react';
import type { ShiftDefinition } from '../../types';

import { getScenarioDetails } from '../../utils/scenarioConfig';

const ShiftIcon = ({ id }: { id: string }) => {
  switch (id) {
    case 'T1':
      return <Sun className="w-6 h-6 text-emerald-500" />;
    case 'T2':
      return <Sunset className="w-6 h-6 text-orange-500" />;
    case 'T3':
      return <Moon className="w-6 h-6 text-purple-500" />;
    default:
      return <Clock className="w-6 h-6" />;
  }
};

interface ShiftCardsProps {
  horasSemanais: 40 | 42 | 44;
  cenario: 'A' | 'B' | 'C' | 'D';
}

export const ShiftCards: React.FC<ShiftCardsProps> = ({ horasSemanais, cenario }) => {
  const details = getScenarioDetails(horasSemanais, cenario);

  const dynamicShifts: ShiftDefinition[] = [
    {
      id: 'T1',
      name: '1º Turno (T1)',
      entrada: details.t1.entrada,
      saida: details.t1.saida,
      permanencia: details.t1.permanencia,
      jornada: details.t1.jornada,
      cor: 'border-emerald-500 bg-emerald-50/30 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400',
      observacao: 'Foco em recebimento e expedição matutina.',
    },
    {
      id: 'T2',
      name: '2º Turno (T2)',
      entrada: details.t2.entrada,
      saida: details.t2.saida,
      permanencia: details.t2.permanencia,
      jornada: details.t2.jornada,
      cor: 'border-orange-500 bg-orange-50/30 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400',
      observacao: 'Pico de expedição vespertina/noturna.',
    },
    {
      id: 'T3',
      name: '3º Turno (T3)',
      entrada: details.t3.entrada,
      saida: details.t3.saida,
      permanencia: details.t3.permanencia,
      jornada: details.t3.jornada,
      cor: 'border-purple-500 bg-purple-50/30 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400',
      observacao: 'Aplica Hora Noturna Reduzida (52m30s).',
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
      {dynamicShifts.map((shift, index) => (
        <motion.div
          key={shift.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className={`relative p-5 rounded-2xl border border-solid shadow-sm backdrop-blur-md flex flex-col justify-between ${shift.cor}`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg tracking-tight">{shift.name}</h3>
              <div className="p-2 rounded-full bg-white/80 dark:bg-slate-800/80 shadow-sm">
                <ShiftIcon id={shift.id} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs opacity-75 font-medium">Entrada</p>
                <p className="text-xl font-bold tracking-tight">{shift.entrada}</p>
              </div>
              <div>
                <p className="text-xs opacity-75 font-medium">Saída</p>
                <p className="text-xl font-bold tracking-tight">{shift.saida}</p>
              </div>
            </div>

            <div className="border-t border-dashed border-current/20 pt-3 mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span>Permanência no CD:</span>
                <span className="font-semibold">{shift.permanencia}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Jornada Efetiva:</span>
                <span className="font-semibold">{shift.jornada}</span>
              </div>
            </div>
          </div>

          {shift.observacao && (
            <div className="mt-4 pt-3 border-t border-solid border-current/10 text-xs italic flex items-start gap-2">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{shift.observacao}</span>
            </div>
          )}
        </motion.div>
      ))}

      {/* CLT Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className="p-5 rounded-2xl border border-solid border-blue-200 bg-blue-50/40 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-300 shadow-sm backdrop-blur-md flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-blue-500" />
              Hora Noturna CLT
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full">
              Art. 73
            </span>
          </div>

          <p className="text-xs leading-relaxed mb-3">
            Segundo a CLT, a hora de trabalho noturno (das <strong>22h às 5h</strong>) é computada como <strong>52 minutos e 30 segundos</strong> (redução ficta de 12,5%).
          </p>

          <p className="text-xs leading-relaxed">
            Dessa forma, 7 horas de relógio equivalem exatamente a 8 horas trabalhadas, sendo obrigatório o pagamento do <strong>Adicional Noturno</strong>.
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-blue-200/50 dark:border-blue-900/50 text-[11px] font-medium flex justify-between">
          <span>Adicional Mínimo:</span>
          <span className="font-bold">20% urbano</span>
        </div>
      </motion.div>
    </div>
  );
};
