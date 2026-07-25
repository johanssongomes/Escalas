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
}): Promise<void> {
  const res = await fetch(`${API_BASE}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Erro ao salvar config: ${res.status}`);
}
