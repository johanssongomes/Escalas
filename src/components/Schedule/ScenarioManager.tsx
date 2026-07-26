import { useState, useEffect } from 'react';
import { listScenarios, createScenario, deleteScenario, getScenario, updateScenario, type ScenarioSummary } from '../../utils/apiClient';
import { Save, FolderOpen, Trash2, X, Check, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  teams?: any;
  params?: any;
  demanda_m3?: any;
  demanda_pcs?: any;
  colaboradores?: any;
  activeScenarioName?: string;
  activeScenarioId?: number;
  isScenarioDirty?: boolean;
  onLoadScenario: (data: { teams?: any; params?: any; demanda_m3?: any; demanda_pcs?: any; scenarioName?: string; scenarioId?: number }) => void;
  onScenarioSaved?: () => void; // Called after saving changes to reset dirty state
}

export function ScenarioManager({
  teams, params, demanda_m3, demanda_pcs, colaboradores,
  activeScenarioName, activeScenarioId, isScenarioDirty,
  onLoadScenario, onScenarioSaved,
}: Props) {
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadList = async () => {
    try {
      const list = await listScenarios();
      setScenarios(list);
    } catch (err) {
      console.error('Erro ao carregar cenários:', err);
    }
  };

  useEffect(() => {
    if (showLoadModal) loadList();
  }, [showLoadModal]);

  const handleSave = async () => {
    if (!scenarioName.trim()) return;
    setLoading(true);
    try {
      const updatedParams = {
        ...params,
        meses_data: {
          ...(params?.meses_data ?? {}),
          [`${params?.month}_${params?.year}`]: colaboradores ?? [],
        },
      };
      await createScenario({
        name: scenarioName.trim(),
        teams,
        params: updatedParams,
      });
      setShowSaveModal(false);
      setScenarioName('');
    } catch (err) {
      console.error('Erro ao salvar cenário:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async (id: number, name: string) => {
    setLoading(true);
    try {
      const scenario = await getScenario(id);
      onLoadScenario({
        teams: scenario.teams ?? undefined,
        params: scenario.params ?? undefined,
        scenarioName: name,
        scenarioId: id,
      });
      setShowLoadModal(false);
    } catch (err) {
      console.error('Erro ao carregar cenário:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteScenario(id);
      loadList();
    } catch (err) {
      console.error('Erro ao deletar cenário:', err);
    }
  };

  // Save changes to the currently active scenario
  const handleSaveChanges = async () => {
    if (!activeScenarioId) return;
    setLoading(true);
    try {
      const updatedParams = {
        ...params,
        meses_data: {
          ...(params?.meses_data ?? {}),
          [`${params?.month}_${params?.year}`]: colaboradores ?? [],
        },
      };
      await updateScenario(activeScenarioId, { teams, params: updatedParams });
      setSaveSuccess(true);
      onScenarioSaved?.();
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Erro ao atualizar cenário:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-end gap-1.5">
        <div className="flex gap-2 flex-wrap justify-end">

          {/* Save Changes button — only visible when a scenario is active AND dirty */}
          {activeScenarioName && isScenarioDirty && (
            <button
              onClick={handleSaveChanges}
              disabled={loading}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-md disabled:opacity-60 ${
                saveSuccess
                  ? 'bg-emerald-500 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
              }`}
              title={`Salvar alterações em "${activeScenarioName}"`}
            >
              {saveSuccess ? (
                <><CheckCircle2 className="w-3.5 h-3.5" /> Salvo!</>
              ) : loading ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
              ) : (
                <><Save className="w-3.5 h-3.5" /> Salvar Alterações</>
              )}
            </button>
          )}

          {/* New scenario save button */}
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer shadow-md"
            title="Salvar como novo cenário"
          >
            <Save className="w-3.5 h-3.5" />
            Salvar Cenário
          </button>

          {/* Load scenario button */}
          <button
            onClick={() => { setShowLoadModal(true); loadList(); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-md ${
              activeScenarioName
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-600 hover:bg-slate-700 text-white'
            }`}
            title={activeScenarioName ? `Cenário ativo: ${activeScenarioName}` : 'Carregar um cenário salvo'}
          >
            {activeScenarioName ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <FolderOpen className="w-3.5 h-3.5" />
            )}
            {activeScenarioName ? activeScenarioName : 'Carregar Cenário'}
          </button>
        </div>

        {/* Status indicator below buttons */}
        {activeScenarioName && (
          <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider transition-colors ${
            isScenarioDirty
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {isScenarioDirty ? (
              <><AlertCircle className="w-3 h-3" /> Cenário modificado — alterações não salvas</>
            ) : (
              <><CheckCircle2 className="w-3 h-3" /> Cenário aplicado</>
            )}
          </span>
        )}
      </div>

      {/* Save New Scenario Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl w-96 max-w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Salvar Cenário</h2>
              <button onClick={() => setShowSaveModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            {activeScenarioName && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 bg-slate-50 dark:bg-slate-700/50 px-3 py-2 rounded-xl">
                💡 Salvar como novo cria uma cópia independente. Para atualizar <strong>{activeScenarioName}</strong>, use <span className="text-amber-600 font-bold">Salvar Alterações</span>.
              </p>
            )}
            <input
              type="text"
              value={scenarioName}
              onChange={e => setScenarioName(e.target.value)}
              placeholder="Nome do cenário..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!scenarioName.trim() || loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Salvando...' : <><Check className="w-3.5 h-3.5" /> Salvar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Scenario Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl w-[440px] max-w-full mx-4 max-h-[480px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Carregar Cenário</h2>
              <button onClick={() => setShowLoadModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {scenarios.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">Nenhum cenário salvo</p>
              )}
              {scenarios.map(s => {
                const isActive = activeScenarioName === s.name;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between p-3 rounded-xl transition border ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                        : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isActive && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                      <div>
                        <p className={`text-sm font-semibold ${isActive ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>{s.name}</p>
                        <p className="text-[10px] text-slate-400">{new Date(s.created_at).toLocaleString('pt-BR')}</p>
                        {isActive && (
                          <p className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                            isScenarioDirty ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {isScenarioDirty ? '⚠ Modificado' : '✓ Ativo'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {/* Save changes button inline for active scenario */}
                      {isActive && isScenarioDirty && (
                        <button
                          onClick={async () => { await handleSaveChanges(); setShowLoadModal(false); }}
                          disabled={loading}
                          className="p-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition cursor-pointer disabled:opacity-50"
                          title="Salvar alterações neste cenário"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleLoad(s.id, s.name)}
                        disabled={loading}
                        className={`p-2 rounded-lg text-white transition cursor-pointer disabled:opacity-50 ${
                          isActive ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                        title={isActive ? 'Recarregar' : 'Carregar'}
                      >
                        {isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <FolderOpen className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
