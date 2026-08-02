import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Clipboard, Download } from 'lucide-react';

interface ImportPmtModalProps {
  isOpen: boolean;
  onClose: () => void;
  diasCount: number;
  onApplyPmt: (pmtM3: number[], pmtPcs: number[]) => void;
}

export const ImportPmtModal: React.FC<ImportPmtModalProps> = ({
  isOpen,
  onClose,
  diasCount,
  onApplyPmt,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [status, setStatus] = useState<'idle' | 'preview' | 'error'>('idle');
  const [errorText, setErrorText] = useState('');
  const [parsedData, setParsedData] = useState<{ day: number; m3: number; pcs: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const parsePastedOrCsv = (text: string) => {
    try {
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length === 0) {
        throw new Error('Nenhum dado encontrado no texto/arquivo fornecido.');
      }

      // Detect delimiter: tab, semicolon, or comma
      let delimiter = '\t';
      const firstLine = lines[0];
      if (firstLine.includes(';')) delimiter = ';';
      else if (firstLine.includes(',')) delimiter = ',';

      const results: { m3: number; pcs: number }[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const cols = line.split(delimiter).map(c => c.trim());

        // Skip headers by checking if cols don't contain any parseable numbers
        const numbers = cols.map(c => {
          // Replace thousands separator (pt-BR dot) and decimal comma if needed
          let clean = c.replace(/\./g, '').replace(/,/g, '.');
          return Number(clean);
        });

        const isHeader = cols.some(c => {
          const val = c.toLowerCase();
          return val.includes('dia') || val.includes('m³') || val.includes('m3') || val.includes('pcs') || val.includes('pçs') || val.includes('peça') || val.includes('volume') || val.includes('pmt');
        }) || numbers.every(n => isNaN(n));

        if (isHeader) {
          continue; // skip this row
        }

        // Try to identify columns
        let m3Val = 0;
        let pcsVal = 0;

        const validNumbers = numbers.filter(n => !isNaN(n));
        if (validNumbers.length >= 2) {
          m3Val = validNumbers[0];
          pcsVal = validNumbers[1];
        } else if (validNumbers.length === 1) {
          m3Val = validNumbers[0];
          pcsVal = validNumbers[0]; // fallback
        }

        results.push({ m3: m3Val, pcs: pcsVal });
      }

      if (results.length === 0) {
        throw new Error('Não foi possível identificar dados numéricos na planilha.');
      }

      // Map to exact days
      const daysMapped = Array.from({ length: diasCount }, (_, index) => {
        const item = results[index] || { m3: 0, pcs: 0 };
        return {
          day: index + 1,
          m3: Math.round(item.m3),
          pcs: Math.round(item.pcs)
        };
      });

      setParsedData(daysMapped);
      setStatus('preview');
    } catch (err: any) {
      setStatus('error');
      setErrorText(err.message || 'Erro ao processar dados.');
    }
  };

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setStatus('error');
      setErrorText('Por favor, envie apenas arquivos CSV ou TXT.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parsePastedOrCsv(text);
    };
    reader.readAsText(file);
  };

  const handlePasteSubmit = () => {
    parsePastedOrCsv(pasteText);
  };

  const downloadTemplate = () => {
    const headers = 'Volume_m3;Pecas_pcs\n';
    const exampleRows = Array.from({ length: diasCount }, () => {
      return `${500 + Math.round(Math.random() * 100)};${1200 + Math.round(Math.random() * 200)}`;
    }).join('\n');
    const csvContent = headers + exampleRows;
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `modelo_importacao_pmt.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApply = () => {
    const m3Array = parsedData.map(d => d.m3);
    const pcsArray = parsedData.map(d => d.pcs);
    onApplyPmt(m3Array, pcsArray);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
              Importar Dados PMT (m³ e Peças)
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
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {status === 'idle' && (
            <div className="space-y-6">
              {/* Drag and Drop CSV */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition ${
                  dragActive 
                    ? 'border-violet-500 bg-violet-50/30 dark:bg-violet-950/10' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 hover:bg-slate-50/30'
                }`}
              >
                <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-2xl mb-3">
                  <Upload className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                </div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Arraste ou envie uma planilha em formato CSV
                </h4>
                <p className="text-[10px] text-slate-400 mb-3 max-w-xs leading-normal">
                  Formatos aceitos: duas colunas com m³ e pçs (ex: m3,pcs ou m3;pcs).
                </p>
                
                 <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                  <label className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold rounded-lg transition shadow-sm hover:shadow cursor-pointer">
                    Selecionar CSV
                    <input 
                      type="file" 
                      accept=".csv,.txt" 
                      className="hidden" 
                      onChange={handleFileChange} 
                      ref={fileInputRef}
                    />
                  </label>
                  <button
                    onClick={downloadTemplate}
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-lg transition cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    Baixar Modelo (.csv)
                  </button>
                </div>
              </div>

              {/* Paste directly */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Clipboard className="w-4 h-4 text-slate-450" />
                  <span>Ou cole as colunas copiadas do Excel / Google Sheets</span>
                </div>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Copie as colunas de m³ e pçs de sua planilha e cole aqui&#13;Exemplo:&#13;550  1200&#13;340  950"
                  rows={6}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                />
                <button
                  onClick={handlePasteSubmit}
                  disabled={!pasteText.trim()}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-755 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition disabled:opacity-50 cursor-pointer"
                >
                  Processar Dados Colados
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-2xl mb-3">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
              </div>
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                Erro ao Processar Dados
              </h4>
              <p className="text-xs text-rose-500 max-w-md mb-6">
                {errorText}
              </p>
              <button 
                onClick={() => setStatus('idle')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {status === 'preview' && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/60 rounded-2xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                    Dados mapeados com sucesso!
                  </h4>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-0.5">
                    Visualização prévia dos dados para os {diasCount} dias mapeados abaixo.
                  </p>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                      <th className="p-2 text-center w-16">Dia</th>
                      <th className="p-2 text-right">Volume (m³)</th>
                      <th className="p-2 text-right">Peças (pçs)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {parsedData.map((d) => (
                      <tr key={d.day} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="p-1.5 text-center font-bold text-slate-500">Dia {d.day}</td>
                        <td className="p-1.5 text-right font-mono">{d.m3.toLocaleString('pt-BR')} m³</td>
                        <td className="p-1.5 text-right font-mono">{d.pcs.toLocaleString('pt-BR')} pçs</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => setStatus('idle')}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 transition cursor-pointer"
                >
                  Voltar e Corrigir
                </button>
                <button 
                  onClick={handleApply}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
                >
                  Aplicar Dados de PMT
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
