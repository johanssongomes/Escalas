import React, { useState, useCallback } from 'react';
import {
  X, Plus, Trash2, Users, GripVertical,
  Check, ChevronDown, ChevronRight, Settings2,
  RefreshCw,
} from 'lucide-react';
import type { Colaborador, ColaboradorRestrictions, ShiftType, TeamConfig } from '../../types';
import { teamColorOf } from '../../utils/teamColors';
import { addColaborador, removeColaborador, updateColaborador, moveColaboradorBetweenTeams, teamSlotsRemaining } from '../../utils/teamAllocationEngine';
import type { NewColaboradorInput } from '../../utils/teamAllocationEngine';

interface CollaboratorWorkbenchProps {
  colaboradores: Colaborador[];
  teams: TeamConfig[];
  month: number;
  year: number;
  onUpdate: (colabs: Colaborador[]) => void;
  onClose: () => void;
}

const SHIFT_LABEL: Record<ShiftType, string> = { T1: '1º Turno (T1)', T2: '2º Turno (T2)', T3: '3º Turno (T3)' };
const SHIFT_BADGE: Record<ShiftType, string> = { T1: 'bg-emerald-600', T2: 'bg-amber-500', T3: 'bg-indigo-600' };

export const CollaboratorWorkbench: React.FC<CollaboratorWorkbenchProps> = ({
  colaboradores, teams, month, year, onUpdate, onClose,
}) => {
  const [localColabs, setLocalColabs] = useState<Colaborador[]>(colaboradores);
  const [dragId, setDragId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ name: string; prodRate: number; noSat: boolean; noSun: boolean }>({ name: '', prodRate: 0, noSat: false, noSun: false });
  const [showAddForm, setShowAddForm] = useState<ShiftType | null>(null);
  const [addData, setAddData] = useState<{ name: string; turno: ShiftType; prodRate: number }>({ name: '', turno: 'T1', prodRate: 25 });
  const [expandedShifts, setExpandedShifts] = useState<ShiftType[]>(['T1', 'T2', 'T3']);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const showMsg = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  const toggleShift = (s: ShiftType) =>
    setExpandedShifts(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const handleDragStart = (id: string) => setDragId(id);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = useCallback((targetTeamName: string, targetShift: ShiftType) => {
    if (!dragId) return;
    const colab = localColabs.find(c => c.id === dragId);
    if (!colab || colab.turno !== targetShift) { setDragId(null); return; }
    if (colab.team === targetTeamName) { setDragId(null); return; }

    // Check capacity
    if (targetTeamName !== 'pool') {
      const remaining = teamSlotsRemaining(teams, targetShift, targetTeamName, localColabs);
      if (remaining <= 0 && colab.team !== targetTeamName) {
        const teamObj = teams.find(t => t.name === targetTeamName && t.shiftType === targetShift);
        alert(`Equipe ${targetTeamName} já está cheia (${teamObj?.memberCount ?? 0} vagas).`);
        setDragId(null);
        return;
      }

    }

    const updated = moveColaboradorBetweenTeams(localColabs, dragId, targetTeamName, month, year);
    setLocalColabs(updated);
    onUpdate(updated);
    setDragId(null);
  }, [dragId, localColabs, teams, month, year, onUpdate]);

  const handleAdd = () => {
    if (!addData.name.trim()) return;
    const input: NewColaboradorInput = {
      name: addData.name.trim(),
      turno: addData.turno,
      prodRate: addData.prodRate > 0 ? addData.prodRate : undefined,
    };
    const updated = addColaborador(localColabs, input);
    setLocalColabs(updated);
    onUpdate(updated);
    setAddData({ name: '', turno: addData.turno, prodRate: 25 });
    setShowAddForm(null);
    showMsg(`Colaborador "${input.name}" adicionado ao ${SHIFT_LABEL[addData.turno]}`);
  };

  const handleRemove = (id: string) => {
    if (!confirm('Remover este colaborador da escala?')) return;
    const updated = removeColaborador(localColabs, id);
    setLocalColabs(updated);
    onUpdate(updated);
  };

  const startEdit = (c: Colaborador) => {
    setEditingId(c.id);
    setEditData({
      name: c.name ?? '',
      prodRate: c.prodRate ?? 25,
      noSat: c.restrictions?.noSaturdays ?? false,
      noSun: c.restrictions?.noSundays ?? false,
    });
  };

  const saveEdit = (id: string) => {
    const restrictions: ColaboradorRestrictions = {};
    if (editData.noSat) restrictions.noSaturdays = true;
    if (editData.noSun) restrictions.noSundays = true;
    const patch: Partial<Pick<Colaborador, 'name' | 'prodRate' | 'restrictions'>> = {
      name: editData.name.trim() || undefined,
      prodRate: editData.prodRate > 0 ? editData.prodRate : undefined,
      restrictions,
    };
    let updated = updateColaborador(localColabs, id, patch);
    // Regenerate escala with restrictions
    updated = updated.map(c => {
      if (c.id !== id) return c;
      return { ...c, escala: moveColaboradorBetweenTeams([c], c.id, c.team ?? 'pool', month, year).length > 0 ? [] : c.escala };
    });
    setLocalColabs(updated);
    onUpdate(updated);
    setEditingId(null);
    showMsg('Restrições salvas. Regenere a escala para aplicar.');
  };

  const generateForAll = () => {
    const regenerated = localColabs.map(c => {
      const moved = moveColaboradorBetweenTeams(localColabs, c.id, c.team ?? c.team ?? 'pool', month, year);
      const found = moved.find(m => m.id === c.id);
      return found ?? c;
    });
    setLocalColabs(regenerated);
    onUpdate(regenerated);
    showMsg('Escala regenerada para todos os colaboradores.');
  };

  const teamColabs = (teamName: string, shift: ShiftType) =>
    localColabs.filter(c => c.turno === shift && c.team === teamName);

  const poolColabs = (shift: ShiftType) =>
    localColabs.filter(c => c.turno === shift && !c.team);



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 rounded-t-3xl bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Settings2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Colaboradores (WFM)</h2>
              <p className="text-xs text-blue-200 mt-0.5">Cadastro, restrições, produtividade individual e arraste entre equipes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={generateForAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
              title="Regenerar escala para todos os colaboradores"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Regerar Escala
            </button>
            <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition cursor-pointer">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Success toast */}
        {successMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg animate-pulse">
            {successMsg}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {(['T3', 'T1', 'T2'] as ShiftType[]).map(shift => {
            const shiftTeams = teams.filter(t => t.shiftType === shift);
            const isExpanded = expandedShifts.includes(shift);
            return (
              <div key={shift} className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <button
                  onClick={() => toggleShift(shift)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition cursor-pointer"
                >
                  <span className={`text-[10px] font-black text-white px-2 py-0.5 rounded-md ${SHIFT_BADGE[shift]}`}>{shift}</span>
                  <span className="font-extrabold text-sm text-slate-700 dark:text-slate-200 flex-1 text-left">
                    {SHIFT_LABEL[shift]}
                  </span>
                  <div className="text-xs text-slate-400 font-bold">
                    {localColabs.filter(c => c.turno === shift).length} colabs
                  </div>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>

                {isExpanded && (
                  <div className="p-4 bg-white dark:bg-slate-900/30 space-y-3">
                    {/* Teams */}
                    {shiftTeams.map(team => {
                      const members = teamColabs(team.name, shift);
                      const remaining = team.memberCount - members.length;
                      const color = teamColorOf(team.colorKey);
                      return (
                        <div
                          key={team.id}
                          className={`rounded-2xl border ${color.border} ${color.bg} p-3 transition`
                            + (dragId && members.some(m => m.id === dragId) ? ' opacity-60' : '')}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(team.name, shift)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`w-3 h-3 rounded-full ${color.dot}`} />
                              <span className={`font-extrabold text-sm ${color.text}`}>{team.name}</span>
                              <span className="text-[10px] font-bold text-slate-400">({members.length}/{team.memberCount})</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {remaining > 0 && (
                                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded-full">+{remaining}</span>
                              )}
                            </div>
                          </div>
                          {members.length === 0 && (
                            <div className="text-[10px] text-slate-400 italic py-2 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                              Arraste colaboradores para esta equipe
                            </div>
                          )}
                          <div className="space-y-1">
                            {members.map(m => renderColabRow(m, team.name, shift, color.border, color.dot))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Pool */}
                    <div
                      className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-3 bg-slate-50/30 dark:bg-slate-900/20"
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop('pool', shift)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Users className="w-3 h-3" /> Sem Equipe (Pool)
                        </span>
                      </div>
                      {poolColabs(shift).length === 0 && (
                        <div className="text-[10px] text-slate-400 italic py-2 text-center">Nenhum colaborador na pool</div>
                      )}
                      <div className="space-y-1">
                        {poolColabs(shift).map(m => renderColabRow(m, 'pool', shift, 'border-slate-300', 'bg-slate-400'))}
                      </div>
                    </div>

                    {/* Add new collaborator */}
                    {showAddForm === shift ? (
                      <div className="p-4 rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
                        <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400">Novo Colaborador — {SHIFT_LABEL[shift]}</p>
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            type="text"
                            placeholder="Nome do colaborador"
                            value={addData.name}
                            onChange={e => setAddData(d => ({ ...d, name: e.target.value, turno: shift }))}
                            onKeyDown={e => e.key === 'Enter' && handleAdd()}
                            className="flex-1 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-semibold"
                          />
                          <input
                            type="number"
                            min={1}
                            max={200}
                            value={addData.prodRate}
                            onChange={e => setAddData(d => ({ ...d, prodRate: Math.max(1, parseInt(e.target.value) || 0) }))}
                            className="w-16 text-xs text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 font-bold"
                            title="Produtividade individual"
                            placeholder="25"
                          />
                          <button onClick={handleAdd} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setShowAddForm(null)} className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                            <X className="w-4 h-4 text-slate-500" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddForm(shift)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar Colaborador
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-800 rounded-b-3xl bg-slate-50/40 dark:bg-slate-900/40">
          <p className="text-[10px] text-slate-400">
            Arraste colaboradores entre equipes para realocar. Use o pool para colaboradores sem equipe ativa.
          </p>
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition cursor-pointer">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );

  function renderColabRow(m: Colaborador, _teamLabel: string, _shift: ShiftType, borderColor: string, dotColor: string) {
    const isEditing = editingId === m.id;
    const workDays = m.escala.filter(s => s === 'WORK').length || '—';
    return (
      <div
        key={m.id}
        draggable
        onDragStart={() => handleDragStart(m.id)}
        className={`flex items-center gap-2 p-1.5 rounded-xl border ${borderColor} transition ${
          dragId === m.id ? 'opacity-50 shadow-md' : 'hover:bg-white dark:hover:bg-slate-900/60'
        } ${m.restrictions?.noSaturdays || m.restrictions?.noSundays ? 'border-l-4 border-l-rose-400' : ''}`}
      >
        <span className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition">
          <GripVertical className="w-3.5 h-3.5" />
        </span>
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
        {isEditing ? (
          <>
            <input
              autoFocus
              type="text"
              value={editData.name}
              onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
              className="flex-1 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-0.5"
            />
            <label className="text-[8px] flex items-center gap-0.5 text-slate-500">
              <input type="checkbox" checked={editData.noSat} onChange={e => setEditData(d => ({ ...d, noSat: e.target.checked }))} className="accent-rose-500" /> Não Sáb
            </label>
            <label className="text-[8px] flex items-center gap-0.5 text-slate-500">
              <input type="checkbox" checked={editData.noSun} onChange={e => setEditData(d => ({ ...d, noSun: e.target.checked }))} className="accent-rose-500" /> Não Dom
            </label>
            <input
              type="number"
              min={1}
              max={200}
              value={editData.prodRate}
              onChange={e => setEditData(d => ({ ...d, prodRate: Math.max(1, parseInt(e.target.value) || 0) }))}
              className="w-12 text-[10px] text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-1"
              title="Produtividade individual"
            />
            <button onClick={() => saveEdit(m.id)} className="p-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 hover:bg-emerald-200 transition cursor-pointer">
              <Check className="w-3 h-3" />
            </button>
            <button onClick={() => setEditingId(null)} className="p-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 transition cursor-pointer">
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <>
            <span className="flex-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{m.name ?? m.id}</span>
            <span className="text-[9px] font-semibold text-slate-400">{workDays}d</span>
            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">{m.prodRate ?? 25}</span>
            {m.restrictions?.noSaturdays && <span className="text-[7px] font-black text-rose-500 uppercase">S</span>}
            {m.restrictions?.noSundays && <span className="text-[7px] font-black text-rose-500 uppercase">D</span>}
            <button onClick={() => startEdit(m)} className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 transition cursor-pointer" title="Editar">
              <Settings2 className="w-3 h-3" />
            </button>
            <button onClick={() => handleRemove(m.id)} className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-600 transition cursor-pointer" title="Remover">
              <Trash2 className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    );
  }
};