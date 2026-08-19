import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://aatgadugndxcrohunygt.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_ANON_KEY) {
  console.error('Erro: VITE_SUPABASE_ANON_KEY não está definido no arquivo .env');
  process.exit(1);
}

async function migrate() {
  console.log('1. Lendo dados do banco de dados local...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'Escala5x2',
    user: 'postgres',
    password: '12345',
  });

  let localConfig: any = null;

  const client = await pool.connect();
  try {
    const res = await client.query('SELECT * FROM "EscalaConfig" WHERE id = 1');
    if (res.rows.length === 0) {
      console.error('Erro: Nenhuma configuração encontrada no banco de dados local (tabela EscalaConfig com id=1).');
      process.exit(1);
    }
    localConfig = res.rows[0];
    console.log('✓ Configuração local lida com sucesso.');
  } catch (err: any) {
    console.error('Erro ao ler do banco local:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }

  console.log('2. Conectando ao Supabase...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('3. Inspecionando colunas da tabela "escala_config" no Supabase...');
  const { data: remoteSample, error: checkError } = await supabase
    .from('escala_config')
    .select('*')
    .limit(1);

  if (checkError) {
    console.error('Erro ao inspecionar tabela no Supabase:', checkError.message);
    process.exit(1);
  }

  // Identificar colunas disponíveis no Supabase
  let remoteColumns: string[] = [];
  if (remoteSample && remoteSample.length > 0) {
    remoteColumns = Object.keys(remoteSample[0]);
  } else {
    console.log('Tabela remota vazia. Usando colunas padrão detectadas...');
    remoteColumns = [
      'id',
      'colaboradores',
      'teams',
      'params',
      'demanda_m3',
      'demanda_pcs',
      'pmt',
      'dados_mensais',
      'prod_rate_m3',
      'prod_rate_pcs',
      'prod_unit',
      'updated_at'
    ];
  }

  console.log(`Colunas detectadas no Supabase: ${remoteColumns.join(', ')}`);

  // Montar objeto de upsert apenas com colunas que existem localmente e remotamente
  const upsertData: any = {};
  for (const col of remoteColumns) {
    if (localConfig[col] !== undefined) {
      if (
        ['colaboradores', 'teams', 'params', 'demanda_m3', 'demanda_pcs', 'pmt', 'dados_mensais'].includes(col) &&
        typeof localConfig[col] === 'string'
      ) {
        try {
          upsertData[col] = JSON.parse(localConfig[col]);
        } catch {
          upsertData[col] = localConfig[col];
        }
      } else {
        upsertData[col] = localConfig[col];
      }
    }
  }

  upsertData.id = 1;
  upsertData.updated_at = new Date().toISOString();

  console.log('4. Enviando dados para o Supabase...');
  const { error: upsertError } = await supabase
    .from('escala_config')
    .upsert(upsertData);

  if (upsertError) {
    console.error('Erro ao subir dados para o Supabase:', upsertError.message);
    process.exit(1);
  }

  console.log('✓ Configuração enviada para o Supabase com sucesso!');
}

migrate().catch((err) => {
  console.error('Erro durante a migração:', err);
  process.exit(1);
});
