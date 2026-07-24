import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import type { ScheduleParams } from '../../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyRules: (rules: Partial<ScheduleParams>) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onApplyRules }) => {
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle');
  const [progressText, setProgressText] = useState('');
  const [extractedRules, setExtractedRules] = useState<{
    setor: 'comercio' | 'supermercado';
    maxConsecutiveSundays: number;
    horasSemanais: 40 | 42 | 44;
    extraHoursPct: number;
    valeAlimentacao: string;
    sourceName: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.pdf')) {
      setStatus('error');
      setProgressText('Formato inválido. Por favor, envie apenas arquivos em formato PDF.');
      return;
    }

    setStatus('scanning');
    
    // Simulate AI scanning and parsing CCT/CLT
    const steps = [
      'Estruturando PDF e mapeando metadados...',
      'Analisando Cláusula Décima Quinta (Horas Extras) e Cláusula Oitava...',
      'Extraindo Cláusula Quinquagésima (Trabalho aos Domingos - Supermercados)...',
      'Identificando regras do Sindicato SINCOMMAP (Maracanaú, Maranguape e Pacatuba)...',
      'Cruzando limites da CLT com as normas da Convenção Coletiva...'
    ];

    let currentStep = 0;
    setProgressText(steps[0]);

    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setProgressText(steps[currentStep]);
      } else {
        clearInterval(interval);
        
        // Define rules based on the uploaded file name
        const fileNameLower = file.name.toLowerCase();
        if (fileNameLower.includes('supermercado') || fileNameLower.includes('cct') || fileNameLower.includes('sincommap')) {
          setExtractedRules({
            setor: 'supermercado',
            maxConsecutiveSundays: 3, // CCT allows 1 Sunday off in 4 weeks -> max 3 consecutive sundays working
            horasSemanais: 44, // standard week limits
            extraHoursPct: 70, // CCT SINCOMMAP states 70% extra hours
            valeAlimentacao: 'R$ 13,00 / R$ 13,68 por dia',
            sourceName: 'CCT SINCOMMAP 2025/2026 (Supermercados)'
          });
        } else {
          // Default CLT values
          setExtractedRules({
            setor: 'comercio',
            maxConsecutiveSundays: 2, // General commerce allows 1 Sunday off in 3 weeks -> max 2 consecutive working sundays
            horasSemanais: 44,
            extraHoursPct: 50, // standard CLT is 50%
            valeAlimentacao: 'Não especificado (Conforme CLT)',
            sourceName: file.name
          });
        }
        setStatus('done');
      }
    }, 900);
  };

  const handleApply = () => {
    if (extractedRules) {
      onApplyRules({
        setor: extractedRules.setor,
        maxConsecutiveSundays: extractedRules.maxConsecutiveSundays,
        horasSemanais: extractedRules.horasSemanais
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
              Importar Leis & Normas Trabalhistas
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {status === 'idle' && (
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/10' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 hover:bg-slate-50/30'
              }`}
            >
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl mb-4">
                <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                Arraste e solte o PDF da Convenção Coletiva (CCT) ou CLT
              </h4>
              <p className="text-xs text-slate-400 mb-4 max-w-xs leading-normal">
                O sistema fará a leitura automática de jornada, folgas de domingos e adicionais de trabalho.
              </p>
              
              <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm hover:shadow cursor-pointer">
                Selecionar Arquivo PDF
                <input 
                  type="file" 
                  accept=".pdf" 
                  className="hidden" 
                  onChange={handleChange} 
                />
              </label>
            </div>
          )}

          {status === 'scanning' && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin mb-4" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                Analisando Legislação Trabalhista...
              </h4>
              <p className="text-xs text-slate-400 animate-pulse max-w-sm">
                {progressText}
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-2xl mb-3">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
              </div>
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                Erro ao Processar Arquivo
              </h4>
              <p className="text-xs text-rose-500 max-w-xs mb-4">
                {progressText}
              </p>
              <button 
                onClick={() => setStatus('idle')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition"
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {status === 'done' && extractedRules && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/60 rounded-2xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                    Leitura concluída com sucesso!
                  </h4>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-0.5">
                    Fonte identificada: <span className="font-bold">{extractedRules.sourceName}</span>
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 border-b border-slate-150 dark:border-slate-800 pb-1.5">
                  Regras Extraídas Comparativas
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-medium">Setor de Atuação</span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                      {extractedRules.setor === 'supermercado' ? 'Supermercados' : 'Comércio Geral'}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-400 font-medium">Frequência de Domingos (Folgas)</span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                      {extractedRules.maxConsecutiveSundays === 3 ? 'Folga 1x3 (A cada 4 domingos)' : 'Folga 1x2 (A cada 3 domingos)'}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-400 font-medium">Carga Horária Máxima</span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                      {extractedRules.horasSemanais} horas semanais
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-400 font-medium">Adicional Hora Extra</span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                      {extractedRules.extraHoursPct}% (Convenção Coletiva)
                    </span>
                  </div>

                  <div className="col-span-2">
                    <span className="block text-[10px] text-slate-400 font-medium">Vale Alimentação Estipulado</span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                      {extractedRules.valeAlimentacao}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => setStatus('idle')}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 transition cursor-pointer"
                >
                  Carregar Outro
                </button>
                <button 
                  onClick={handleApply}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
                >
                  Aplicar Regras e Recalcular
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
