const API_BASE = 'http://localhost:3001/api';

export async function fetchConfig(): Promise<any> {
  const res = await fetch(`${API_BASE}/config`);
  if (!res.ok) throw new Error(`Erro ao buscar config: ${res.status}`);
  return res.json();
}

export async function saveConfig(data: {
  colaboradores?: any;
  teams?: any;
  params?: any;
  demanda_m3?: any;
  demanda_pcs?: any;
  pmt?: any;
  prod_rate_m3?: number;
  prod_rate_pcs?: number;
  prod_unit?: string;
}): Promise<void> {
  const res = await fetch(`${API_BASE}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Erro ao salvar config: ${res.status}`);
}

export interface ScenarioSummary {
  id: number;
  name: string;
  created_at: string;
}

export async function listScenarios(): Promise<ScenarioSummary[]> {
  const res = await fetch(`${API_BASE}/scenarios`);
  if (!res.ok) throw new Error(`Erro ao listar cenários: ${res.status}`);
  return res.json();
}

export interface ScenarioData {
  id: number;
  name: string;
  teams?: any;
  params?: any;
  demanda_m3?: any;
  demanda_pcs?: any;
  pmt?: any;
  prod_rate_m3?: number;
  prod_rate_pcs?: number;
  prod_unit?: string;
  created_at: string;
}

export async function getScenario(id: number): Promise<ScenarioData> {
  const res = await fetch(`${API_BASE}/scenarios/${id}`);
  if (!res.ok) throw new Error(`Erro ao buscar cenário: ${res.status}`);
  return res.json();
}

export async function createScenario(data: {
  name: string;
  teams?: any;
  params?: any;
  demanda_m3?: any;
  demanda_pcs?: any;
  pmt?: any;
  prod_rate_m3?: number;
  prod_rate_pcs?: number;
  prod_unit?: string;
}): Promise<ScenarioData> {
  const res = await fetch(`${API_BASE}/scenarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Erro ao criar cenário: ${res.status}`);
  return res.json();
}

export async function deleteScenario(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/scenarios/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Erro ao deletar cenário: ${res.status}`);
}

export async function updateScenario(id: number, data: {
  teams?: any;
  params?: any;
  demanda_m3?: any;
  demanda_pcs?: any;
  pmt?: any;
  prod_rate_m3?: number;
  prod_rate_pcs?: number;
  prod_unit?: string;
}): Promise<ScenarioData> {
  const res = await fetch(`${API_BASE}/scenarios/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Erro ao atualizar cenário: ${res.status}`);
  return res.json();
}
