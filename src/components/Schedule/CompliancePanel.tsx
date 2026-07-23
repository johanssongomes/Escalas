import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Calendar, Info, Clock, Utensils, AlertTriangle, AlertCircle, Heart } from 'lucide-react';

interface CompliancePanelProps {
  horasSemanais: 40 | 42 | 44;
  setor: 'comercio' | 'supermercado';
}

export const CompliancePanel: React.FC<CompliancePanelProps> = ({ horasSemanais, setor }) => {
  // Determine daily hours
  const getJornadaDiaria = () => {
    switch (horasSemanais) {
      case 40:
        return '8h00';
      case 42:
        return '8h24';
      case 44:
        return '8h48';
    }
  };

  // Vale Alimentação values (Aditivo 2026)
  const valeUnitario = setor === 'comercio' ? 13.00 : 13.68;
  const estimativaMensal6x1 = valeUnitario * 26;
  const estimativaMensal5x2 = valeUnitario * 22;

  // DSR Sunday frequency
  const domingosTrabalhadosLimite = setor === 'comercio' ? 'Máx. 2 domingos seguidos' : 'Máx. 3 domingos seguidos';
  const frequenciaDomingoFolga = setor === 'comercio' ? '1 a cada 3 semanas (Lei 10.101/00)' : '1 a cada 4 semanas (CCT)';

  // Holiday allowance
  const feriadoAjuda = setor === 'comercio' ? 'R$ 64,73' : 'R$ 55,64';
  const feriadoCompensacao = setor === 'comercio' 
    ? 'Folga na semana subsequente ou pagamento em dobro'
    : 'Folga em até 60 dias ou pagamento em dobro';

  // Health and dental assistance monthly fee per employee
  const taxaSaude = setor === 'comercio' ? 23.75 : 14.65;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm mb-8 print-no-break">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
          <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Painel de Conformidade Trabalhista (SINCOMMAP & CLT)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Informações e restrições legais atualizadas para o setor de{' '}
            <strong className="text-blue-600 dark:text-blue-400">
              {setor === 'comercio' ? 'Comércio Varejista/Atacadista Geral' : 'Supermercados / Gêneros Alimentícios'}
            </strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Jornada e Horas Extras */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs mb-3">
              <Clock className="w-4 h-4 text-emerald-500" />
              JORNADA & HORAS EXTRAS
            </div>
            <div className="mb-2">
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{getJornadaDiaria()}</span>
              <span className="text-xs text-slate-400 ml-1.5">por dia trabalhado</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Compensação diária para atingir {horasSemanais}h semanais. 
              Extraordinárias pagas com adicional de <strong className="text-emerald-600 font-bold">70%</strong> (CCT Cláusula 15ª).
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 italic">
            Ref: Cláusula 15ª da CCT
          </div>
        </motion.div>

        {/* Card 2: Vale Alimentação */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs mb-3">
              <Utensils className="w-4 h-4 text-amber-500" />
              VALE ALIMENTAÇÃO
            </div>
            <div className="mb-2">
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                R$ {valeUnitario.toFixed(2).replace('.', ',')}
              </span>
              <span className="text-xs text-slate-400 ml-1.5">por dia útil trabalhado</span>
            </div>
            <div className="space-y-1 text-[11px] text-slate-500">
              <div className="flex justify-between">
                <span>Custo Médio 6x1 (26d):</span>
                <span className="line-through">R$ {estimativaMensal6x1.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                <span>Custo Médio 5x2 (22d):</span>
                <span className="text-amber-600 dark:text-amber-400">
                  R$ {estimativaMensal5x2.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Redução natural de ~4 vales/mês</span>
          </div>
        </motion.div>

        {/* Card 3: Escala de Domingos */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs mb-3">
              <Calendar className="w-4 h-4 text-purple-500" />
              DSR AOS DOMINGOS
            </div>
            <div className="mb-2">
              <span className="text-sm font-black text-slate-800 dark:text-slate-100 block">
                {domingosTrabalhadosLimite}
              </span>
              <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                {frequenciaDomingoFolga}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              O descanso semanal deve coincidir com o domingo no rodízio de forma obrigatória no período configurado.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
            <span>Motor aplicando limite de {setor === 'comercio' ? '2 domingos' : '3 domingos'} seguidos</span>
          </div>
        </motion.div>

        {/* Card 4: Feriados & Custeio Sindicato */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs mb-3">
              <Heart className="w-4 h-4 text-rose-500" />
              FERIADOS & ENCARGOS
            </div>
            <div className="mb-2">
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{feriadoAjuda}</span>
              <span className="text-xs text-slate-400 ml-1.5">ajuda de custo/feriado</span>
            </div>
            <div className="space-y-1 text-[11px] text-slate-500">
              <p className="leading-tight mb-2">
                Compensação: <strong className="text-slate-700 dark:text-slate-300 font-medium text-[10px]">{feriadoCompensacao}</strong>
              </p>
              <div className="flex justify-between border-t border-dashed border-slate-200 dark:border-slate-800 pt-1">
                <span>Custeio Saúde (Sind.):</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">R$ {taxaSaude.toFixed(2).replace('.', ',')}/mês</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 italic">
            Ref: Termo Aditivo 2026
          </div>
        </motion.div>
      </div>

      <div className="mt-4 p-3 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-300">
          <strong>Aviso de Transição:</strong> A jornada 5x2 reduz a fadiga operacional ao garantir 2 dias seguidos de folga. No entanto, certifique-se de formalizar o acordo de compensação de horas individual ou coletivo por escrito para resguardar juridicamente as jornadas compensatórias de {getJornadaDiaria()}h.
        </p>
      </div>
    </div>
  );
};
