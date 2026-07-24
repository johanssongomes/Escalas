import React, { useState } from 'react';
import type { TeamConfig, ScheduleParams, ShiftType } from '../../types';
import {
  X, Plus, Trash2, Users, Settings2, AlertCircle,
  Pencil, Check, ChevronDown,
} from 'lucide-react';

interface TeamManagerModalProps {
  teams: TeamConfig[];
  params: ScheduleParams;
  onSave: (teams: TeamConfig[]) => void;
  onClose: () => void;
}

// ─── Color palette ────────────────────────────────────────────────────────────
export const COLOR_OPTIONS: {
  key: TeamConfig['colorKey'];
  label: string;
  dot: string;
  bg: string;
  text: string;
  border: string;
  badgeBg: string;
}[] = [
  { key: 'emerald', label: 'Verde',   dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30',  text: 'text-emerald-800 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700', badgeBg: 'bg-emerald-500' },
  { key: 'amber',   label: 'Laranja', dot: 'bg-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950/30',    text: 'text-amber-800 dark:text-amber-300',     border: 'border-amber-300 dark:border-amber-700',   badgeBg: 'bg-amber-500' },
  { key: 'indigo',  label: 'Índigo',  dot: 'bg-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-950/30',   text: 'text-indigo-800 dark:text-indigo-300',   border: 'border-indigo-300 dark:border-indigo-700', badgeBg: 'bg-indigo-500' },
  { key: 'rose',    label: 'Rosa',    dot: 'bg-rose-500',    bg: 'bg-rose-50 dark:bg-rose-950/30',      text: 'text-rose-800 dark:text-rose-300',       border: 'border-rose-300 dark:border-rose-700',     badgeBg: 'bg-rose-500' },
  { key: 'sky',     label: 'Azul',   dot: 'bg-sky-500',     bg: 'bg-sky-50 dark:bg-sky-950/30',       text: 'text-sky-800 dark:text-sky-300',         border: 'border-sky-300 dark:border-sky-700',       badgeBg: 'bg-sky-500' },
  { key: 'violet',  label: 'Violeta', dot: 'bg-violet-500',  bg: 'bg-violet-50 dark:bg-violet-950/30',   text: 'text-violet-800 dark:text-violet-300',   border: 'border-violet-300 dark:border-violet-700', badgeBg: 'bg-violet-500' },
];

export const OFF_PATTERN_LABELS: Record<4 | 5 | 6, string> = {
  4: 'Sex / Sáb',
  5: 'Sáb / Dom',
  6: 'Dom / Seg',
};

export const WEEKDAYS = [
  { value: 0, label: 'Seg' },
  { value: 1, label: 'Ter' },
  { value: 2, label: 'Qua' },
  { value: 3, label: 'Qui' },
  { value: 4, label: 'Sex' },
  { value: 5, label: 'Sáb' },
  { value: 6, label: 'Dom' },
];

const SHIFTS: ShiftType[] = ['T1', 'T2', 'T3'];
const SHIFT_LABELS: Record<ShiftType, string> = {
  T1: '1º Turno (T1)',
  T2: '2º Turno (T2)',
  T3: '3º Turno (T3)',
};

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function colorFor(key: TeamConfig['colorKey']) {
  return COLOR_OPTIONS.find(c => c.key === key) ?? COLOR_OPTIONS[0];
}

// ─── Inline editable team row ─────────────────────────────────────────────────
interface TeamRowProps {
  team: TeamConfig;
  maxTotal: number;
  usedByOthers: number;
  onChange: (updated: TeamConfig) => void;
  onDelete: () => void;
}

const TeamRow: React.FC<TeamRowProps> = ({ team, maxTotal, usedByOthers, onChange, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TeamConfig>({ ...team });
  const [showColorPicker, setShowColorPicker] = useState(false);

  const col = colorFor(team.colorKey);
  const maxCount = maxTotal - usedByOthers;

  const commitEdit = () => {
    const safe = { ...draft, memberCount: Math.max(0, Math.min(draft.memberCount, maxCount)) };
    onChange(safe);
    setEditing(false);
    setShowColorPicker(false);
  };

  const cancelEdit = () => {
    setDraft({ ...team });
    setEditing(false);
    setShowColorPicker(false);
  };

  if (editing) {
    const draftCol = colorFor(draft.colorKey);
    return (
      <div className={`rounded-2xl border-2 ${draftCol.border} ${draftCol.bg} p-3 space-y-3 shadow-md transition-all`}>
        {/* Row 1: name + color picker */}
        <div className="flex items-center gap-3">
          {/* Color dot / picker toggle */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(p => !p)}
              className={`w-7 h-7 rounded-full ${draftCol.dot} ring-2 ring-offset-2 ring-white dark:ring-slate-900 shadow cursor-pointer transition hover:scale-110`}
              title="Escolher cor"
            />
            {showColorPicker && (
              <div className="absolute top-9 left-0 z-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-3 flex gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c.key}
                    onClick={() => { setDraft(d => ({ ...d, colorKey: c.key })); setShowColorPicker(false); }}
                    className={`w-6 h-6 rounded-full ${c.dot} cursor-pointer transition ring-offset-2 hover:scale-110 ${draft.colorKey === c.key ? 'ring-2 ring-slate-800 dark:ring-slate-200' : ''}`}
                    title={c.label}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Name input */}
          <input
            autoFocus
            type="text"
            value={draft.name}
            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            className={`flex-1 text-sm font-extrabold bg-white dark:bg-slate-900 border-2 ${draftCol.border} rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${draftCol.text}`}
            placeholder="Nome da equipe"
          />

          {/* Confirm / Cancel */}
          <button onClick={commitEdit} className="p-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 transition cursor-pointer" title="Salvar">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={cancelEdit} className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 transition cursor-pointer" title="Cancelar">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Row 2: off pattern + count */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Off pattern radio */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Padrão de Folga</span>
            <div className="flex items-center gap-3 flex-wrap">
              {([4, 5, 6] as (4 | 5 | 6)[]).map(val => (
                <label key={val} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name={`pat-${draft.id}`}
                    checked={draft.offPattern === val}
                    onChange={() => setDraft(d => ({ ...d, offPattern: val }))}
                    className="accent-blue-600"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{OFF_PATTERN_LABELS[val]}</span>
                </label>
              ))}

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name={`pat-${draft.id}`}
                  checked={Array.isArray(draft.offPattern)}
                  onChange={() => setDraft(d => ({ ...d, offPattern: [0, 1] }))}
                  className="accent-blue-600"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Personalizado</span>
              </label>

              {Array.isArray(draft.offPattern) && (
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                  <select
                    value={draft.offPattern[0]}
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      setDraft(d => ({ ...d, offPattern: [val, (d.offPattern as [number, number])[1]] }));
                    }}
                    className="text-xs font-bold bg-transparent text-slate-750 dark:text-slate-250 focus:outline-none cursor-pointer"
                  >
                    {WEEKDAYS.map(day => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                  <span className="text-slate-400 text-xs">/</span>
                  <select
                    value={draft.offPattern[1]}
                    onChange={e => {
                      const val = parseInt(e.target.value);
                      setDraft(d => ({ ...d, offPattern: [(d.offPattern as [number, number])[0], val] }));
                    }}
                    className="text-xs font-bold bg-transparent text-slate-750 dark:text-slate-250 focus:outline-none cursor-pointer"
                  >
                    {WEEKDAYS.map(day => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Count */}
          <div className="flex flex-col gap-1 ml-auto">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Colaboradores</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDraft(d => ({ ...d, memberCount: Math.max(0, d.memberCount - 1) }))}
                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-slate-600 hover:bg-slate-100 transition cursor-pointer flex items-center justify-center"
              >−</button>
              <input
                type="number"
                min={0}
                max={maxCount}
                value={draft.memberCount}
                onChange={e => setDraft(d => ({ ...d, memberCount: Math.max(0, Math.min(parseInt(e.target.value) || 0, maxCount)) }))}
                className="w-14 text-center text-sm font-extrabold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-1 focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
              />
              <button
                onClick={() => setDraft(d => ({ ...d, memberCount: Math.min(d.memberCount + 1, maxCount) }))}
                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-slate-600 hover:bg-slate-100 transition cursor-pointer flex items-center justify-center"
              >+</button>
              <span className="text-[10px] text-slate-400 ml-1">/ {maxTotal} total</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── View mode ────────────────────────────────────────────────────────────────
  return (
    <div className={`flex items-center gap-3 p-3 rounded-2xl border ${col.border} ${col.bg} transition group`}>
      {/* Color dot */}
      <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${col.dot}`} />

      {/* Name */}
      <span className={`font-extrabold text-sm flex-1 ${col.text}`}>{team.name}</span>

      {/* Off pattern badge */}
      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-900/50 px-2 py-0.5 rounded-lg border border-white/60 dark:border-slate-700/40 shrink-0">
        {Array.isArray(team.offPattern)
          ? `${WEEKDAYS.find(w => w.value === (team.offPattern as [number, number])[0])?.label} / ${WEEKDAYS.find(w => w.value === (team.offPattern as [number, number])[1])?.label}`
          : OFF_PATTERN_LABELS[team.offPattern as 4 | 5 | 6]}
      </span>

      {/* Count badge */}
      <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full text-white ${col.badgeBg} shrink-0`}>
        {team.memberCount} colab.
      </span>

      {/* Actions — appear on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => { setDraft({ ...team }); setEditing(true); }}
          className="p-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-400 hover:text-blue-600 transition cursor-pointer"
          title="Editar equipe"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition cursor-pointer"
          title="Excluir equipe"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// ─── Add Team inline form ─────────────────────────────────────────────────────
interface AddTeamFormProps {
  shift: ShiftType;
  remaining: number;
  onAdd: (team: TeamConfig) => void;
  onCancel: () => void;
}

const AddTeamForm: React.FC<AddTeamFormProps> = ({ shift, remaining, onAdd, onCancel }) => {
  const [name, setName] = useState('');
  const [colorKey, setColorKey] = useState<TeamConfig['colorKey']>('emerald');
  const [offPattern, setOffPattern] = useState<TeamConfig['offPattern']>(5);
  const [count, setCount] = useState(Math.max(0, remaining));
  const [showColorPicker, setShowColorPicker] = useState(false);

  const col = colorFor(colorKey);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({
      id: generateId(),
      name: name.trim(),
      colorKey,
      shiftType: shift,
      offPattern,
      memberCount: Math.max(0, Math.min(count, remaining)),
    });
  };

  return (
    <div className="mt-3 p-4 bg-blue-50/60 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl space-y-3 shadow-sm">
      <p className="text-xs font-extrabold text-blue-700 dark:text-blue-400">Nova Equipe — {SHIFT_LABELS[shift]}</p>

      <div className="flex items-center gap-3">
        {/* Color picker */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(p => !p)}
            className={`w-8 h-8 rounded-full ${col.dot} ring-2 ring-offset-2 ring-white dark:ring-slate-900 shadow cursor-pointer hover:scale-110 transition`}
          />
          {showColorPicker && (
            <div className="absolute top-10 left-0 z-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-3 flex gap-2">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.key}
                  onClick={() => { setColorKey(c.key); setShowColorPicker(false); }}
                  className={`w-6 h-6 rounded-full ${c.dot} cursor-pointer hover:scale-110 transition ring-offset-2 ${colorKey === c.key ? 'ring-2 ring-slate-800 dark:ring-slate-200' : ''}`}
                  title={c.label}
                />
              ))}
            </div>
          )}
        </div>

        <input
          autoFocus
          type="text"
          placeholder="Ex: Time Alpha, Equipe Noturna..."
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="flex-1 text-sm font-semibold bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
        />
      </div>

      <div className="flex items-center gap-6 flex-wrap">
        {/* Off pattern */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Padrão de Folga</span>
          <div className="flex items-center gap-3 flex-wrap">
            {([4, 5, 6] as (4 | 5 | 6)[]).map(val => (
              <label key={val} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name={`new-pat-${shift}`}
                  checked={offPattern === val}
                  onChange={() => setOffPattern(val)}
                  className="accent-blue-600"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{OFF_PATTERN_LABELS[val]}</span>
              </label>
            ))}

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name={`new-pat-${shift}`}
                checked={Array.isArray(offPattern)}
                onChange={() => setOffPattern([0, 1])}
                className="accent-blue-600"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Personalizado</span>
            </label>

            {Array.isArray(offPattern) && (
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                <select
                  value={offPattern[0]}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    setOffPattern([val, (offPattern as [number, number])[1]]);
                  }}
                  className="text-xs font-bold bg-transparent text-slate-750 dark:text-slate-250 focus:outline-none cursor-pointer"
                >
                  {WEEKDAYS.map(day => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                  ))}
                </select>
                <span className="text-slate-400 text-xs">/</span>
                <select
                  value={offPattern[1]}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    setOffPattern([(offPattern as [number, number])[0], val]);
                  }}
                  className="text-xs font-bold bg-transparent text-slate-750 dark:text-slate-250 focus:outline-none cursor-pointer"
                >
                  {WEEKDAYS.map(day => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Count */}
        <div className="flex flex-col gap-1 ml-auto">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Colaboradores</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setCount(c => Math.max(0, c - 1))} className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-slate-600 hover:bg-slate-100 transition cursor-pointer flex items-center justify-center">−</button>
            <input
              type="number"
              min={0}
              max={remaining}
              value={count}
              onChange={e => setCount(Math.max(0, Math.min(parseInt(e.target.value) || 0, remaining)))}
              className="w-14 text-center text-sm font-extrabold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-1 focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
            />
            <button onClick={() => setCount(c => Math.min(c + 1, remaining))} className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-slate-600 hover:bg-slate-100 transition cursor-pointer flex items-center justify-center">+</button>
            <span className="text-[10px] text-slate-400 ml-1">{remaining} disp.</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleAdd}
          disabled={!name.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Criar Equipe
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────
export const TeamManagerModal: React.FC<TeamManagerModalProps> = ({
  teams,
  params,
  onSave,
  onClose,
}) => {
  const [localTeams, setLocalTeams] = useState<TeamConfig[]>(teams);
  const [addingShift, setAddingShift] = useState<ShiftType | null>(null);
  const [expandedShifts, setExpandedShifts] = useState<ShiftType[]>(['T1', 'T2', 'T3']);

  const totalPerShift: Record<ShiftType, number> = {
    T1: params.conferentesT1,
    T2: params.conferentesT2,
    T3: params.conferentesT3,
  };

  const usedPerShift = (shift: ShiftType) =>
    localTeams.filter(t => t.shiftType === shift).reduce((a, t) => a + t.memberCount, 0);

  const toggleShift = (shift: ShiftType) =>
    setExpandedShifts(prev =>
      prev.includes(shift) ? prev.filter(s => s !== shift) : [...prev, shift]
    );

  const handleChange = (id: string, updated: TeamConfig) =>
    setLocalTeams(prev => prev.map(t => (t.id === id ? updated : t)));

  const handleDelete = (id: string) =>
    setLocalTeams(prev => prev.filter(t => t.id !== id));

  const handleAdd = (team: TeamConfig) => {
    setLocalTeams(prev => [...prev, team]);
    setAddingShift(null);
  };

  const handleSave = () => {
    onSave(localTeams);
  };

  const shiftColor = (shift: ShiftType) =>
    shift === 'T1' ? 'bg-emerald-600' : shift === 'T2' ? 'bg-amber-500' : 'bg-indigo-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 rounded-t-3xl bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Settings2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Gerenciar Equipes</h2>
              <p className="text-xs text-blue-200 mt-0.5">Crie, edite, exclua e distribua colaboradores</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition cursor-pointer">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {SHIFTS.map((shift) => {
            const shiftTeams = localTeams.filter(t => t.shiftType === shift);
            const total = totalPerShift[shift];
            const used = usedPerShift(shift);
            const remaining = total - used;
            const isOver = remaining < 0;
            const isExpanded = expandedShifts.includes(shift);

            return (
              <div key={shift} className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {/* Shift accordion header */}
                <button
                  onClick={() => toggleShift(shift)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition cursor-pointer"
                >
                  <span className={`text-[11px] font-black text-white px-2 py-0.5 rounded-md ${shiftColor(shift)}`}>
                    {shift}
                  </span>
                  <span className="font-extrabold text-sm text-slate-700 dark:text-slate-200 flex-1 text-left">
                    {SHIFT_LABELS[shift]}
                  </span>

                  {/* Budget pill */}
                  <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-bold ${
                    isOver
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                      : remaining === 0
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {isOver && <AlertCircle className="w-3 h-3" />}
                    <Users className="w-3 h-3" />
                    <span>{used}/{total}</span>
                    {remaining !== 0 && (
                      <span className="font-black">({remaining > 0 ? `+${remaining}` : remaining})</span>
                    )}
                  </div>

                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Accordion body */}
                {isExpanded && (
                  <div className="p-4 space-y-2 bg-white dark:bg-slate-900/30">
                    {shiftTeams.length === 0 && addingShift !== shift && (
                      <div className="text-xs text-slate-400 italic text-center py-5 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        Nenhuma equipe criada para este turno. Clique em "+ Nova Equipe" para começar.
                      </div>
                    )}

                    {shiftTeams.map(team => (
                      <TeamRow
                        key={team.id}
                        team={team}
                        maxTotal={total}
                        usedByOthers={used - team.memberCount}
                        onChange={updated => handleChange(team.id, updated)}
                        onDelete={() => handleDelete(team.id)}
                      />
                    ))}

                    {addingShift === shift ? (
                      <AddTeamForm
                        shift={shift}
                        remaining={Math.max(0, remaining)}
                        onAdd={handleAdd}
                        onCancel={() => setAddingShift(null)}
                      />
                    ) : (
                      <button
                        onClick={() => setAddingShift(shift)}
                        className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Nova Equipe para {shift}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 rounded-b-3xl bg-slate-50/80 dark:bg-slate-900/60">
          <p className="text-xs text-slate-400">
            Passe o mouse sobre uma equipe para ver as opções de edição e exclusão.
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 text-sm font-extrabold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition cursor-pointer"
            >
              Salvar e Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
