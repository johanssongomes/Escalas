import { supabase } from './supabaseClient';

const API_BASE = 'http://localhost:3001/api';

// Determina se devemos usar o Supabase diretamente (se estivermos rodando no Vercel/produção ou sem servidor local)
const useSupabaseDirectly = !window.location.hostname.includes('localhost') && 
                            !window.location.hostname.includes('127.0.0.1') && 
                            !!supabase;

export async function fetchConfig(): Promise<any> {
  if (useSupabaseDirectly) {
    console.log('[API Client] Buscando configuração diretamente do Supabase...');
    const { data, error } = await supabase!
      .from('escala_config')
      .select('*')
      .eq('id', 1)
      .single();
      
    if (error) {
      console.error('Erro ao buscar config do Supabase:', error);
      throw error;
    }
    return data;
  }

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
  dados_mensais?: any;
  prod_rate_m3?: number;
  prod_rate_pcs?: number;
  prod_unit?: string;
}): Promise<void> {
  if (useSupabaseDirectly) {
    console.log('[API Client] Salvando configuração diretamente no Supabase...');
    const { error } = await supabase!
      .from('escala_config')
      .upsert({
        id: 1,
        colaboradores: data.colaboradores,
        teams: data.teams,
        params: data.params,
        demanda_m3: data.demanda_m3,
        demanda_pcs: data.demanda_pcs,
        pmt: data.pmt,
        dados_mensais: data.dados_mensais,
        prod_rate_m3: data.prod_rate_m3,
        prod_rate_pcs: data.prod_rate_pcs,
        prod_unit: data.prod_unit,
        updated_at: new Date().toISOString(),
      });
      
    if (error) {
      console.error('Erro ao salvar config no Supabase:', error);
      throw error;
    }
    return;
  }

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
  if (useSupabaseDirectly) {
    console.log('[API Client] Listando cenários diretamente do Supabase...');
    const { data, error } = await supabase!
      .from('Scenario')
      .select('id, name, created_at')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.warn('Erro ao listar de "Scenario", tentando "scenario"...', error.message);
      const { data: dataAlt, error: errorAlt } = await supabase!
        .from('scenario')
        .select('id, name, created_at')
        .order('created_at', { ascending: false });
        
      if (errorAlt) {
        console.error('Erro ao listar cenários do Supabase (tabela scenario):', errorAlt);
        throw errorAlt;
      }
      return dataAlt || [];
    }
    return data || [];
  }

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
  dados_mensais?: any;
  prod_rate_m3?: number;
  prod_rate_pcs?: number;
  prod_unit?: string;
  created_at: string;
}

export async function getScenario(id: number): Promise<ScenarioData> {
  if (useSupabaseDirectly) {
    console.log(`[API Client] Buscando cenário ${id} diretamente do Supabase...`);
    const { data, error } = await supabase!
      .from('Scenario')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.warn('Erro ao buscar de "Scenario", tentando "scenario"...', error.message);
      const { data: dataAlt, error: errorAlt } = await supabase!
        .from('scenario')
        .select('*')
        .eq('id', id)
        .single();
        
      if (errorAlt) {
        console.error(`Erro ao buscar cenário ${id} do Supabase:`, errorAlt);
        throw errorAlt;
      }
      return dataAlt;
    }
    return data;
  }

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
  dados_mensais?: any;
  prod_rate_m3?: number;
  prod_rate_pcs?: number;
  prod_unit?: string;
}): Promise<ScenarioData> {
  if (useSupabaseDirectly) {
    console.log('[API Client] Criando cenário diretamente no Supabase...');
    
    const insertData = {
      name: data.name,
      teams: data.teams,
      params: data.params,
      demanda_m3: data.demanda_m3,
      demanda_pcs: data.demanda_pcs,
      pmt: data.pmt,
      dados_mensais: data.dados_mensais,
      prod_rate_m3: data.prod_rate_m3,
      prod_rate_pcs: data.prod_rate_pcs,
      prod_unit: data.prod_unit,
      created_at: new Date().toISOString()
    };

    const { data: inserted, error } = await supabase!
      .from('Scenario')
      .insert(insertData)
      .select()
      .single();
      
    if (error) {
      console.warn('Erro ao inserir em "Scenario", tentando "scenario"...', error.message);
      const { data: insertedAlt, error: errorAlt } = await supabase!
        .from('scenario')
        .insert(insertData)
        .select()
        .single();
        
      if (errorAlt) {
        console.error('Erro ao criar cenário no Supabase:', errorAlt);
        throw errorAlt;
      }
      return insertedAlt;
    }
    return inserted;
  }

  const res = await fetch(`${API_BASE}/scenarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Erro ao criar cenário: ${res.status}`);
  return res.json();
}

export async function deleteScenario(id: number): Promise<void> {
  if (useSupabaseDirectly) {
    console.log(`[API Client] Deletando cenário ${id} diretamente no Supabase...`);
    const { error } = await supabase!
      .from('Scenario')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.warn('Erro ao deletar de "Scenario", tentando "scenario"...', error.message);
      const { error: errorAlt } = await supabase!
        .from('scenario')
        .delete()
        .eq('id', id);
        
      if (errorAlt) {
        console.error(`Erro ao deletar cenário ${id} do Supabase:`, errorAlt);
        throw errorAlt;
      }
    }
    return;
  }

  const res = await fetch(`${API_BASE}/scenarios/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Erro ao deletar cenário: ${res.status}`);
}

export async function updateScenario(id: number, data: {
  teams?: any;
  params?: any;
  demanda_m3?: any;
  demanda_pcs?: any;
  pmt?: any;
  dados_mensais?: any;
  prod_rate_m3?: number;
  prod_rate_pcs?: number;
  prod_unit?: string;
}): Promise<ScenarioData> {
  if (useSupabaseDirectly) {
    console.log(`[API Client] Atualizando cenário ${id} diretamente no Supabase...`);
    
    const updateData = {
      teams: data.teams,
      params: data.params,
      demanda_m3: data.demanda_m3,
      demanda_pcs: data.demanda_pcs,
      pmt: data.pmt,
      dados_mensais: data.dados_mensais,
      prod_rate_m3: data.prod_rate_m3,
      prod_rate_pcs: data.prod_rate_pcs,
      prod_unit: data.prod_unit
    };

    const { data: updated, error } = await supabase!
      .from('Scenario')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.warn('Erro ao atualizar em "Scenario", tentando "scenario"...', error.message);
      const { data: updatedAlt, error: errorAlt } = await supabase!
        .from('scenario')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
        
      if (errorAlt) {
        console.error(`Erro ao atualizar cenário ${id} no Supabase:`, errorAlt);
        throw errorAlt;
      }
      return updatedAlt;
    }
    return updated;
  }

  const res = await fetch(`${API_BASE}/scenarios/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Erro ao atualizar cenário: ${res.status}`);
  return res.json();
}
