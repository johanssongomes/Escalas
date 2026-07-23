import React from 'react';
import { FileSpreadsheet, FileText, Printer } from 'lucide-react';
import type { Colaborador } from '../../types';

interface ExportActionsProps {
  colaboradores: Colaborador[];
}

export const ExportActions: React.FC<ExportActionsProps> = ({ colaboradores }) => {
  
  // Export scale as CSV (Excel compatible)
  const handleExportCSV = () => {
    if (colaboradores.length === 0) return;
    
    // Header
    const daysHeader = Array.from({ length: colaboradores[0].escala.length }, (_, i) => `Dia ${i + 1}`).join(',');
    let csvContent = `ID Colaborador,Turno,${daysHeader}\n`;
    
    // Rows
    colaboradores.forEach(colab => {
      const escalaStr = colab.escala.map(status => status === 'WORK' ? 'Trabalho' : 'Folga').join(',');
      csvContent += `${colab.id},${colab.turno},${escalaStr}\n`;
    });
    
    // Download trigger
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `escala_distribuicao_cd_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger Print/PDF
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 mb-6 noprint">
      <button
        onClick={handleExportCSV}
        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md hover:shadow-emerald-500/10 transition cursor-pointer text-xs"
      >
        <FileSpreadsheet className="w-4 h-4" />
        Exportar Excel (CSV)
      </button>

      <button
        onClick={handlePrint}
        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-blue-500/10 transition cursor-pointer text-xs"
      >
        <FileText className="w-4 h-4" />
        Exportar PDF
      </button>

      <button
        onClick={handlePrint}
        className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-md hover:shadow-slate-700/10 transition cursor-pointer text-xs dark:bg-slate-700 dark:hover:bg-slate-600"
      >
        <Printer className="w-4 h-4" />
        Imprimir
      </button>
    </div>
  );
};
