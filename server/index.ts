import express from 'express';
import cors from 'cors';
import { getConfig, upsertConfig } from './db.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/config', async (_req, res) => {
  try {
    const config = await getConfig();
    res.json(config ?? {});
  } catch (err) {
    console.error('Erro ao buscar config:', err);
    res.status(500).json({ error: 'Erro ao buscar config' });
  }
});

app.put('/api/config', async (req, res) => {
  try {
    const { colaboradores, teams, params, demanda_m3, demanda_pcs } = req.body;
    await upsertConfig({ colaboradores, teams, params, demanda_m3, demanda_pcs });
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao salvar config:', err);
    res.status(500).json({ error: 'Erro ao salvar config' });
  }
});

app.listen(3001, () => {
  console.log('API rodando em http://localhost:3001');
});
