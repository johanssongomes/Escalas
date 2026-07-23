import React from 'react';
import type { Colaborador, ScheduleParams, DayStatus, ShiftType } from '../../types';
import { PATTERNS } from '../../utils/scheduleEngine';
import { UserPlus, Trash2, CheckCircle2, AlertTriangle, RotateCcw, UserCheck } from 'lucide-react';

interface CollaboratorSimulatorProps {
  colaboradores: Colaborador[];
  setColaboradores: React.Dispatch<React.SetStateAction<Colaborador[]>>;
  params: ScheduleParams;
  onReset: () => void;
}

export const CollaboratorSimulator: React.FC<CollaboratorSimulatorProps> = ({
  colaboradores,
  setColaboradores,
  params,
  onReset,
}) => {

  // Helper to identify a collaborator's pattern for a given week
  // A week has 7 days. We check which pattern matches the 2 off days of the collaborator's escala.
  const getPatternForWeek = (colab: Colaborador, weekIdx: number): number => {
    const startIdx = weekIdx * 7;
    const offDays: number[] = [];
    for (let i = 0; i < 7; i++) {
      if (colab.escala[startIdx + i] === 'OFF') {
        offDays.push(i);
      }
    }
    
    // Find matching pattern
    const match = PATTERNS.find(
      (p) => p.offDays.includes(offDays[0]) && p.offDays.includes(offDays[1])
    );
    return match ? match.id : 5; // Default/Fallback to Sábado-Domingo
  };

  // Update a collaborator's pattern for a specific week
  const handlePatternChange = (colabId: string, weekIdx: number, patternId: number) => {
    const nextColaboradores = colaboradores.map((colab) => {
      if (colab.id !== colabId) return colab;

      const nextEscala = [...colab.escala];
      const startIdx = weekIdx * 7;
      const pattern = PATTERNS[patternId];

      for (let i = 0; i < 7; i++) {
        const isOff = pattern.offDays.includes(i);
        nextEscala[startIdx + i] = isOff ? 'OFF' : 'WORK';
      }

      return {
        ...colab,
        escala: nextEscala,
      };
    });
    setColaboradores(nextColaboradores);
  };

  // Change collaborator shift
  const handleShiftChange = (colabId: string, turno: ShiftType) => {
    const nextColaboradores = colaboradores.map((colab) => {
      if (colab.id !== colabId) return colab;
      return { ...colab, turno };
    });
    setColaboradores(nextColaboradores);
  };

  // Add new collaborator
  const handleAddCollaborator = () => {
    const newNum = colaboradores.length + 1;
    const colabId = `COLAB-${String(newNum).padStart(3, '0')}`;
    
    // Default escala: Sat/Sun off for all 4 weeks
    const defaultEscala: DayStatus[] = [];
    for (let w = 0; w < 4; w++) {
      for (let d = 0; d < 7; d++) {
        // Saturday is index 5, Sunday is index 6
        defaultEscala.push(d === 5 || d === 6 ? 'OFF' : 'WORK');
      }
    }

    const newColab: Colaborador = {
      id: colabId,
      turno: 'T1',
      escala: defaultEscala,
    };

    setColaboradores([...colaboradores, newColab]);
  };

  // Remove collaborator
  const handleRemoveCollaborator = (colabId: string) => {
    setColaboradores(colaboradores.filter((c) => c.id !== colabId));
  };

  // Live CLT compliance validation for a single collaborator
  const checkCLTCompliance = (colab: Colaborador) => {
    // 1. Max consecutive work days (6 days limit)
    let maxConsecutiveWork = 0;
    let currentStreak = 0;
    colab.escala.forEach((status) => {
      if (status === 'WORK') {
        currentStreak++;
        if (currentStreak > maxConsecutiveWork) {
          maxConsecutiveWork = currentStreak;
        }
      } else {
        currentStreak = 0;
      }
    });

    // 2. Consecutive working Sundays
    const sundayLimit = params.setor === 'comercio' ? 2 : 3;
    let maxConsecutiveSundays = 0;
    let currentSundayStreak = 0;
    colab.escala.forEach((status, idx) => {
      const isSunday = idx % 7 === 6;
      if (isSunday) {
        if (status === 'WORK') {
          currentSundayStreak++;
          if (currentSundayStreak > maxConsecutiveSundays) {
            maxConsecutiveSundays = currentSundayStreak;
          }
        } else {
          currentSundayStreak = 0;
        }
      }
    });

    const hasStreakViolation = maxConsecutiveWork > 6;
    const hasSundayViolation = maxConsecutiveSundays > sundayLimit;

    return {
      maxConsecutiveWork,
      maxConsecutiveSundays,
      hasStreakViolation,
      hasSundayViolation,
      isValid: !hasStreakViolation && !hasSundayViolation,
    };
  };

  return (
    <div className="space-y-6">
      {/* Control panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            Painel de Simulação de Colaboradores
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Adicione funcionários, modifique turnos e configure folgas semanais customizadas com validação CLT em tempo real.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 font-black text-xs text-slate-600 dark:text-slate-400 transition cursor-pointer"
            title="Restaurar escala automatizada"
          >
            <RotateCcw className="w-4 h-4" />
            Resetar Escala
          </button>
          
          <button
            onClick={handleAddCollaborator}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 font-black text-xs text-white transition shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Adicionar Colaborador
          </button>
        </div>
      </div>

      {/* Collaborators List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm overflow-hidden">
        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <th className="p-3.5 sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                  Colaborador
                </th>
                <th className="p-3.5">
                  Turno
                </th>
                <th className="p-3.5 text-center">
                  Folga Sem. 1
                </th>
                <th className="p-3.5 text-center">
                  Folga Sem. 2
                </th>
                <th className="p-3.5 text-center">
                  Folga Sem. 3
                </th>
                <th className="p-3.5 text-center">
                  Folga Sem. 4
                </th>
                <th className="p-3.5 text-center min-w-[150px]">
                  Validação CLT
                </th>
                <th className="p-3.5 text-center">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {colaboradores.map((colab) => {
                const clt = checkCLTCompliance(colab);
                
                return (
                  <tr key={colab.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                    <td className="p-3.5 sticky left-0 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-100">
                      {colab.id}
                    </td>
                    
                    <td className="p-3.5">
                      <select
                        value={colab.turno}
                        onChange={(e) => handleShiftChange(colab.id, e.target.value as ShiftType)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="T1">1º Turno (T1)</option>
                        <option value="T2">2º Turno (T2)</option>
                        <option value="T3">3º Turno (T3)</option>
                      </select>
                    </td>

                    {/* Weekly patterns */}
                    {[0, 1, 2, 3].map((weekIdx) => {
                      const activePattern = getPatternForWeek(colab, weekIdx);
                      return (
                        <td key={weekIdx} className="p-3.5 text-center">
                          <select
                            value={activePattern}
                            onChange={(e) => handlePatternChange(colab.id, weekIdx, Number(e.target.value))}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {PATTERNS.map((pattern) => (
                              <option key={pattern.id} value={pattern.id}>
                                {pattern.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}

                    {/* CLT compliance validation badge */}
                    <td className="p-3.5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {clt.isValid ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Escala Conforme
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {clt.hasStreakViolation && (
                              <span className="flex items-center gap-1 text-[9px] font-black text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2.5 py-0.5 rounded-full" title="Mais de 6 dias consecutivos trabalhando">
                                <AlertTriangle className="w-3 h-3" />
                                Max 6 Dias Trabalho
                              </span>
                            )}
                            {clt.hasSundayViolation && (
                              <span className="flex items-center gap-1 text-[9px] font-black text-orange-600 bg-orange-50 dark:bg-orange-950/30 px-2.5 py-0.5 rounded-full" title="Mais domingos consecutivos trabalhando do que o limite do setor">
                                <AlertTriangle className="w-3 h-3" />
                                Limite Dom. Excedido
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Remove button */}
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleRemoveCollaborator(colab.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                        title="Excluir Colaborador"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
