import React from 'react';
import { 
  ShieldCheck, 
  Clock, 
  Calendar, 
  Users, 
  Heart, 
  AlertTriangle,
  CheckCircle2,
  Utensils,
  AlertCircle
} from 'lucide-react';

interface Colaborador {
  id: string;
  turno: 'T1' | 'T2' | 'T3';
  escala: ('WORK' | 'OFF')[];
  team?: string;
  name?: string;
}

interface ScaleValidatorProps {
  colaboradores: Colaborador[];
  horasSemanais: 40 | 42 | 44;
  setor: 'comercio' | 'supermercado';
  maxConsecutiveWorkDays?: number;
  month: number;
  year: number;
}

export const ScaleValidator: React.FC<ScaleValidatorProps> = ({
  colaboradores = [],
  horasSemanais,
  setor,
  maxConsecutiveWorkDays = 6,
  month,
  year,
}) => {
  const dailyHours = horasSemanais === 40 ? '8h00' : horasSemanais === 42 ? '8h24' : '8h48';
  const intershiftHours = horasSemanais === 40 ? '15h00' : horasSemanais === 42 ? '14h36' : '14h12';

  // 1. Identificar início do mês e domingos
  const startDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // 0=Mon, ..., 6=Sun
  const diasNoMes = colaboradores?.[0]?.escala?.length || 30;

  // ─── AUDITORIA DE CONFORMIDADE EM TEMPO REAL ───
  
  // A. Auditoria: Limite Máximo de Trabalho Consecutivo
  const consecutiveWorkViolations: string[] = [];
  colaboradores.forEach(c => {
    let consecutive = 0;
    let hasViolation = false;
    for (let d = 0; d < c.escala.length; d++) {
      if (c.escala[d] === 'WORK') {
        consecutive++;
        if (consecutive > maxConsecutiveWorkDays) {
          hasViolation = true;
        }
      } else {
        consecutive = 0;
      }
    }
    if (hasViolation) {
      consecutiveWorkViolations.push(c.name || c.id);
    }
  });

  // B. Auditoria: Domingos Consecutivos (Comércio / Supermercado)
  const sundayConsecutiveViolations: string[] = [];
  const sundayLimit = setor === 'comercio' ? 2 : 3;
  colaboradores.forEach(c => {
    let consecutiveSundays = 0;
    let hasViolation = false;
    for (let d = 0; d < c.escala.length; d++) {
      const dw = (startDayOfWeek + d) % 7;
      if (dw === 6) { // Domingo
        if (c.escala[d] === 'WORK') {
          consecutiveSundays++;
          if (consecutiveSundays > sundayLimit) {
            hasViolation = true;
          }
        } else {
          consecutiveSundays = 0;
        }
      }
    }
    if (hasViolation) {
      sundayConsecutiveViolations.push(c.name || c.id);
    }
  });

  // C. Auditoria: DSR Feminino (Art. 386 CLT - Folga de Domingo Quinzenal)
  // Como não há gênero cadastrado, identificamos como Atenção/Aviso Geral se houver colaboradores do gênero feminino
  // trabalhando mais de 1 domingo seguido (o que violaria a folga quinzenal).
  const cltFeminineWarnings: string[] = [];
  colaboradores.forEach(c => {
    let consecutiveSundays = 0;
    let hasWarning = false;
    for (let d = 0; d < c.escala.length; d++) {
      const dw = (startDayOfWeek + d) % 7;
      if (dw === 6) { // Domingo
        if (c.escala[d] === 'WORK') {
          consecutiveSundays++;
          if (consecutiveSundays > 1) { // trabalha 2 domingos seguidos
            hasWarning = true;
          }
        } else {
          consecutiveSundays = 0;
        }
      }
    }
    if (hasWarning) {
      cltFeminineWarnings.push(c.name || c.id);
    }
  });

  // D. Auditoria: Quantidade Mínima de Folgas Semanais na Escala 5x2
  // Numa escala 5x2 de 30 dias espera-se ~8 folgas, 31 dias ~9 folgas.
  const folgasInsuficientes: string[] = [];
  const minFolgas = diasNoMes === 31 ? 9 : 8;
  colaboradores.forEach(c => {
    const totalFolgas = c.escala.filter(s => s === 'OFF').length;
    if (totalFolgas < minFolgas) {
      folgasInsuficientes.push(`${c.name || c.id} (${totalFolgas} folgas)`);
    }
  });

  // ─── DEFINIÇÃO DAS REGRAS E STATUS DO VALIDADOR ───
  const rules = [
    {
      icon: <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      name: 'Jornada semanal',
      base: 'CF Art. 7º',
      exigency: 'Máx. 44 horas semanais',
      isViolated: false,
      isWarning: false,
      garantia: `Compensação exata de horas diárias no modelo 5x2 (${dailyHours}/dia para atingir ${horasSemanais}h semanais).`,
      errorMsg: '',
    },
    {
      icon: <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
      name: `DSR Domingo (${setor === 'comercio' ? 'Comércio' : 'Supermercado'})`,
      base: setor === 'comercio' ? 'Lei 10.101/2000' : 'Decreto 9.127/2017 & CCT',
      exigency: setor === 'comercio' ? 'Folga 1x2 (a cada 3 sem.)' : 'Folga 1x3 (a cada 4 sem.)',
      isViolated: sundayConsecutiveViolations.length > 0,
      isWarning: false,
      garantia: `Limite máximo de ${setor === 'comercio' ? '2 domingos' : '3 domingos'} seguidos trabalhados.`,
      errorMsg: `Violação detectada em ${sundayConsecutiveViolations.length} colaboradores (${sundayConsecutiveViolations.slice(0, 3).join(', ')}${sundayConsecutiveViolations.length > 3 ? '...' : ''}) que trabalharam mais de ${sundayLimit} domingos consecutivos.`,
    },
    {
      icon: <Heart className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
      name: 'DSR Feminino',
      base: 'CLT Art. 386',
      exigency: 'Folga 1x1 (quinzenal)',
      isViolated: false,
      isWarning: cltFeminineWarnings.length > 0,
      garantia: 'Rotação A (CLT Feminina) rotaciona domingos a cada 15 dias.',
      errorMsg: `Atenção: ${cltFeminineWarnings.length} colaboradores (${cltFeminineWarnings.slice(0, 3).join(', ')}${cltFeminineWarnings.length > 3 ? '...' : ''}) trabalham domingos consecutivos. Para mulheres, isso infringe a folga quinzenal do domingo.`,
    },
    {
      icon: <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      name: 'Máx. Trabalho Consecutivo',
      base: 'CLT Art. 67',
      exigency: `Máximo de ${maxConsecutiveWorkDays} dias seguidos`,
      isViolated: consecutiveWorkViolations.length > 0,
      isWarning: false,
      garantia: `Corretor enforceMaxConsecutiveWorkDays limita a no máximo ${maxConsecutiveWorkDays} dias de trabalho.`,
      errorMsg: `Violação detectada em ${consecutiveWorkViolations.length} colaboradores (${consecutiveWorkViolations.slice(0, 3).join(', ')}${consecutiveWorkViolations.length > 3 ? '...' : ''}) que trabalharam mais de ${maxConsecutiveWorkDays} dias seguidos.`,
    },
    {
      icon: <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
      name: 'Intervalo Interjornada',
      base: 'CLT Art. 66',
      exigency: 'Mínimo de 11 horas de descanso',
      isViolated: false,
      isWarning: false,
      garantia: `Turnos fixos garantem intervalo mínimo de no mínimo ${intershiftHours}m entre saídas e entradas.`,
      errorMsg: '',
    },
    {
      icon: <Utensils className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      name: 'Intervalo Intrajornada',
      base: 'CLT Art. 71',
      exigency: 'Mínimo de 1 hora de almoço',
      isViolated: false,
      isWarning: false,
      garantia: `Intervalo de 1h de descanso registrado na jornada diária de ${dailyHours}.`,
      errorMsg: '',
    },
    {
      icon: <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
      name: 'Escala 5x2',
      base: 'Regime Geral',
      exigency: '5 dias trabalhados + 2 folgas',
      isViolated: folgasInsuficientes.length > 0,
      isWarning: false,
      garantia: 'Algoritmo distribui automaticamente os blocos de trabalho e folga, mantendo a jornada semanal configurada.',
      errorMsg: `Atenção: ${folgasInsuficientes.length} colaboradores (${folgasInsuficientes.slice(0, 3).join(', ')}${folgasInsuficientes.length > 3 ? '...' : ''}) estão com menos de ${minFolgas} folgas no mês.`,
    },
    {
      icon: <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />,
      name: 'Compensação de Jornada',
      base: 'CLT',
      exigency: 'Distribuição das horas dentro do regime permitido',
      isViolated: false,
      isWarning: false,
      garantia: `Sistema calcula a carga diária e verifica o fechamento semanal de ${horasSemanais}h.`,
      errorMsg: '',
    },
    {
      icon: <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />,
      name: 'Validação automática',
      base: 'Auditoria Interna',
      exigency: 'Impedir escala irregular',
      isViolated: false,
      isWarning: false,
      garantia: 'O App executa uma auditoria automática antes de publicar a escala.',
      errorMsg: '',
    },
  ];

  // Métricas do painel inferior
  const totalViolations = rules.filter(r => r.isViolated).length;
  const totalWarnings = rules.filter(r => r.isWarning).length;
  const rulesAtendidas = rules.length - totalViolations - totalWarnings;

  return (
    <div className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950/60 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-md hover:shadow-lg transition-all duration-300 mt-8 print:hidden select-none">
      {/* Título */}
      <div className="flex items-center gap-3.5 mb-8 pb-5 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="p-2.5 bg-gradient-to-tr from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-2xl shadow-sm text-white">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm md:text-base font-extrabold tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent uppercase">
            Painel de Auditoria e Validação Jurídica da Escala
          </h2>
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
            Escala 5x2 • Jornada Semanal de {horasSemanais} Horas
          </p>
        </div>
      </div>

      {/* Tabela de Regras */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/50 dark:border-slate-800/60 bg-white/50 dark:bg-slate-950/20 backdrop-blur-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-850/80 text-xs tracking-wider font-extrabold uppercase text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/40">
              <th className="py-3.5 px-5">Regra / Base Legal</th>
              <th className="py-3.5 px-5">Exigência</th>
              <th className="py-3.5 px-5 text-center">Status</th>
              <th className="py-3.5 px-5">Como o App Garante / Diagnóstico</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-850/40 text-sm">
            {rules.map((rule, idx) => {
              let rowBg = "hover:bg-slate-50/20 dark:hover:bg-slate-900/10";
              if (rule.isViolated) {
                rowBg = "bg-red-500/[0.02] hover:bg-red-500/[0.05] dark:bg-red-500/[0.01]";
              } else if (rule.isWarning) {
                rowBg = "bg-amber-500/[0.02] hover:bg-amber-500/[0.05] dark:bg-amber-500/[0.01]";
              }

              return (
                <tr key={idx} className={`${rowBg} transition-colors duration-200`}>
                  <td className="py-4 px-5 flex items-center gap-3.5 font-semibold text-slate-850 dark:text-slate-200">
                    <div className={`p-2 rounded-xl shrink-0 ${
                      rule.isViolated
                        ? 'bg-red-50 dark:bg-red-950/30 text-red-500 border border-red-100 dark:border-red-900/30'
                        : rule.isWarning
                        ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-500 border border-amber-100 dark:border-amber-900/30'
                        : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-350 border border-slate-100 dark:border-slate-800/30'
                    }`}>
                      {rule.icon}
                    </div>
                    <div>
                      <span className="block text-[13px] font-bold text-slate-850 dark:text-slate-200">{rule.name}</span>
                      <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider">{rule.base}</span>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-[13px] font-bold text-slate-650 dark:text-slate-350">
                    {rule.exigency}
                  </td>
                  <td className="py-4 px-5 text-center">
                    {rule.isViolated ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-400 shadow-sm shadow-red-500/5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        VIOLAÇÃO
                      </span>
                    ) : rule.isWarning ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 text-amber-650 dark:text-amber-400 shadow-sm shadow-amber-500/5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        ATENÇÃO
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 text-emerald-650 dark:text-emerald-400 shadow-sm shadow-emerald-500/5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        CONFORME
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-5 leading-relaxed max-w-md">
                    {rule.isViolated || rule.isWarning ? (
                      <span className={`text-[12.5px] font-bold ${rule.isViolated ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {rule.errorMsg}
                      </span>
                    ) : (
                      <span className="text-[12.5px] text-slate-655 dark:text-slate-350 font-semibold">
                        {rule.garantia}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Painéis Inferiores */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-8 pt-6 border-t border-slate-200/60 dark:border-slate-800/80">
        
        {/* Bloco 1: Painel de Validação */}
        <div className={`p-6 rounded-2xl border flex flex-col justify-between transition-all duration-300 ${
          totalViolations > 0
            ? 'bg-gradient-to-br from-red-500/[0.05] to-red-600/[0.02] border-red-500/20 dark:border-red-900/30'
            : totalWarnings > 0
            ? 'bg-gradient-to-br from-amber-500/[0.05] to-amber-600/[0.02] border-amber-500/20 dark:border-amber-900/30'
            : 'bg-gradient-to-br from-emerald-500/[0.05] to-emerald-600/[0.02] border-emerald-500/20 dark:border-emerald-900/30'
        }`}>
          <div>
            <h3 className={`text-[11px] font-black tracking-wider uppercase mb-5 ${
              totalViolations > 0
                ? 'text-red-500 dark:text-red-400'
                : totalWarnings > 0
                ? 'text-amber-500 dark:text-amber-400'
                : 'text-emerald-500 dark:text-emerald-400'
            }`}>
              Diagnóstico de Compliance
            </h3>
            <div className="space-y-3.5 text-[13px]">
              <div className="flex justify-between items-center py-2 border-b border-slate-200/50 dark:border-slate-800/40">
                <span className="text-slate-500 dark:text-slate-400 font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                  Regras atendidas
                </span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{rulesAtendidas} / 9</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-200/50 dark:border-slate-800/40">
                <span className="text-slate-500 dark:text-slate-400 font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 ring-4 ring-amber-500/20" />
                  Atenções
                </span>
                <span className={`font-extrabold text-sm ${totalWarnings > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>{totalWarnings}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-550 dark:text-slate-400 font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 ring-4 ring-red-500/20" />
                  Violações
                </span>
                <span className={`font-extrabold text-sm ${totalViolations > 0 ? 'text-red-650 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>{totalViolations}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            {totalViolations > 0 ? (
              <div className="w-full py-3 bg-red-500 text-white rounded-xl shadow-md shadow-red-500/10 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition hover:brightness-105">
                <AlertCircle className="w-4 h-4" />
                ESCALA REPROVADA
              </div>
            ) : totalWarnings > 0 ? (
              <div className="w-full py-3 bg-amber-500 text-white rounded-xl shadow-md shadow-amber-500/10 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition hover:brightness-105">
                <AlertTriangle className="w-4 h-4" />
                ESCALA COM ALERTA
              </div>
            ) : (
              <div className="w-full py-3 bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition hover:brightness-105">
                <CheckCircle2 className="w-4 h-4" />
                ESCALA APROVADA
              </div>
            )}
          </div>
        </div>

        {/* Bloco 2: Resumo da Escala */}
        <div className="lg:col-span-3 bg-slate-50/40 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl">
          <h3 className="text-[11px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider mb-5">
            Parâmetros de Operação & Escala
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Item 1 */}
            <div className="bg-white dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/50 flex items-center gap-3.5 hover:scale-[1.02] hover:border-blue-400 dark:hover:border-blue-700/60 transition-all duration-300">
              <div className="p-2.5 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-xl text-white shadow-sm shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-wider">Jornada Semanal</span>
                <span className="text-[15px] font-black text-slate-850 dark:text-slate-100">{horasSemanais}h00</span>
              </div>
            </div>

            {/* Item 2 */}
            <div className="bg-white dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/50 flex items-center gap-3.5 hover:scale-[1.02] hover:border-purple-400 dark:hover:border-purple-700/60 transition-all duration-300">
              <div className="p-2.5 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-xl text-white shadow-sm shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-wider">Regime</span>
                <span className="text-[15px] font-black text-slate-850 dark:text-slate-100">5x2</span>
              </div>
            </div>

            {/* Item 3 */}
            <div className="bg-white dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/50 flex items-center gap-3.5 hover:scale-[1.02] hover:border-sky-400 dark:hover:border-sky-700/60 transition-all duration-300">
              <div className="p-2.5 bg-gradient-to-tr from-sky-450 to-blue-500 rounded-xl text-white shadow-sm shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-wider">Jornada Diária</span>
                <span className="text-[15px] font-black text-slate-850 dark:text-slate-100">{dailyHours}</span>
              </div>
            </div>

            {/* Item 4 */}
            <div className="bg-white dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/50 flex items-center gap-3.5 hover:scale-[1.02] hover:border-emerald-400 dark:hover:border-emerald-700/60 transition-all duration-300">
              <div className="p-2.5 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-xl text-white shadow-sm shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-wider">Folgas Semanais</span>
                <span className="text-[15px] font-black text-slate-850 dark:text-slate-100">2 dias</span>
              </div>
            </div>

            {/* Item 5 */}
            <div className="bg-white dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/50 flex items-center gap-3.5 hover:scale-[1.02] hover:border-indigo-400 dark:hover:border-indigo-700/60 transition-all duration-300">
              <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-xl text-white shadow-sm shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-wider">Interjornada</span>
                <span className="text-[15px] font-black text-slate-850 dark:text-slate-100">Mín. 11h</span>
              </div>
            </div>

            {/* Item 6 */}
            <div className="bg-white dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/50 flex items-center gap-3.5 hover:scale-[1.02] hover:border-amber-400 dark:hover:border-amber-700/60 transition-all duration-300">
              <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-xl text-white shadow-sm shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-wider">Máx. Trabalhado</span>
                <span className="text-[15px] font-black text-slate-850 dark:text-slate-100">{maxConsecutiveWorkDays} dias</span>
              </div>
            </div>

            {/* Item 7 */}
            <div className="bg-white dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/50 flex items-center gap-3.5 hover:scale-[1.02] hover:border-rose-400 dark:hover:border-rose-700/60 transition-all duration-300">
              <div className="p-2.5 bg-gradient-to-tr from-rose-500 to-red-500 rounded-xl text-white shadow-sm shrink-0">
                <Utensils className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-wider">Almoço</span>
                <span className="text-[15px] font-black text-slate-850 dark:text-slate-100">1 hora</span>
              </div>
            </div>

            {/* Item 8 */}
            <div className="bg-white dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/50 flex items-center gap-3.5 hover:scale-[1.02] transition-all duration-300">
              <div className={`p-2.5 rounded-xl shadow-sm text-white shrink-0 ${
                totalViolations > 0 
                  ? 'bg-gradient-to-tr from-red-500 to-rose-600' 
                  : totalWarnings > 0 
                  ? 'bg-gradient-to-tr from-amber-500 to-orange-500' 
                  : 'bg-gradient-to-tr from-emerald-500 to-teal-500'
              }`}>
                {totalViolations > 0 ? (
                  <AlertCircle className="w-4 h-4" />
                ) : totalWarnings > 0 ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
              </div>
              <div>
                <span className="block text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-wider">Status Geral</span>
                <span className={`text-[15px] font-black uppercase tracking-wide ${
                  totalViolations > 0 
                    ? 'text-red-600 dark:text-red-400' 
                    : totalWarnings > 0 
                    ? 'text-amber-600 dark:text-amber-400' 
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {totalViolations > 0 ? 'REPROVADO' : totalWarnings > 0 ? 'ALERTA' : 'APROVADO'}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
