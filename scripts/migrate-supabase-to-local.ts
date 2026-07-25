import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const { Pool } = pg;

const SUPABASE_URL = 'https://aatgadugndxcrohunygt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhdGdhZHVnbmR4Y3JvaHVueWd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MDIyNzMsImV4cCI6MjEwMDQ3ODI3M30.WM1CYCnc9QR-2AEVOrk7QgNyWMQek7IYtsGckeN2YyA';

async function migrate() {
  console.log('Conectando ao Supabase...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error } = await supabase
    .from('escala_config')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('Erro ao ler do Supabase:', error.message);
    process.exit(1);
  }

  if (!data) {
    console.log('Nenhum dado encontrado no Supabase.');
    return;
  }

  console.log('Dados lidos do Supabase. Migrando para banco local...');

  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'Escala5x2',
    user: 'postgres',
    password: '12345',
  });

  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO "EscalaConfig" (id, colaboradores, teams, params, demanda_m3, demanda_pcs, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         colaboradores = EXCLUDED.colaboradores,
         teams = EXCLUDED.teams,
         params = EXCLUDED.params,
         demanda_m3 = EXCLUDED.demanda_m3,
         demanda_pcs = EXCLUDED.demanda_pcs,
         updated_at = EXCLUDED.updated_at`,
      [
        1,
        JSON.stringify(data.colaboradores),
        JSON.stringify(data.teams),
        JSON.stringify(data.params),
        JSON.stringify(data.demanda_m3),
        JSON.stringify(data.demanda_pcs),
        data.updated_at ?? new Date(),
      ]
    );
    console.log('Migração concluída com sucesso!');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Erro durante migração:', err);
  process.exit(1);
});
