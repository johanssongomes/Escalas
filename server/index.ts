import express from 'express';
import cors from 'cors';
import { getConfig, upsertConfig, listScenarios, getScenario, createScenario, deleteScenario, updateScenario } from './db.js';

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
    const { colaboradores, teams, params, demanda_m3, demanda_pcs, pmt, prod_rate_m3, prod_rate_pcs, prod_unit } = req.body;
    await upsertConfig({ colaboradores, teams, params, demanda_m3, demanda_pcs, pmt, prod_rate_m3, prod_rate_pcs, prod_unit });
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao salvar config:', err);
    res.status(500).json({ error: 'Erro ao salvar config' });
  }
});

app.listen(3001, () => {
  console.log('API rodando em http://localhost:3001');
});

// Scenario routes
app.get('/api/scenarios', async (_req, res) => {
  try {
    const scenarios = await listScenarios();
    res.json(scenarios);
  } catch (err) {
    console.error('Erro ao listar cenários:', err);
    res.status(500).json({ error: 'Erro ao listar cenários' });
  }
});

app.get('/api/scenarios/:id', async (req, res) => {
  try {
    const scenario = await getScenario(Number(req.params.id));
    if (!scenario) return res.status(404).json({ error: 'Cenário não encontrado' });
    res.json(scenario);
  } catch (err) {
    console.error('Erro ao buscar cenário:', err);
    res.status(500).json({ error: 'Erro ao buscar cenário' });
  }
});

app.post('/api/scenarios', async (req, res) => {
  try {
    const { name, teams, params, demanda_m3, demanda_pcs, pmt, prod_rate_m3, prod_rate_pcs, prod_unit } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
    const scenario = await createScenario({ name, teams, params, demanda_m3, demanda_pcs, pmt, prod_rate_m3, prod_rate_pcs, prod_unit });
    res.json(scenario);
  } catch (err) {
    console.error('Erro ao criar cenário:', err);
    res.status(500).json({ error: 'Erro ao criar cenário' });
  }
});

app.delete('/api/scenarios/:id', async (req, res) => {
  try {
    await deleteScenario(Number(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao deletar cenário:', err);
    res.status(500).json({ error: 'Erro ao deletar cenário' });
  }
});

app.put('/api/scenarios/:id', async (req, res) => {
  try {
    const { teams, params, demanda_m3, demanda_pcs, pmt, prod_rate_m3, prod_rate_pcs, prod_unit } = req.body;
    const updated = await updateScenario(Number(req.params.id), { teams, params, demanda_m3, demanda_pcs, pmt, prod_rate_m3, prod_rate_pcs, prod_unit });
    res.json(updated);
  } catch (err) {
    console.error('Erro ao atualizar cenário:', err);
    res.status(500).json({ error: 'Erro ao atualizar cenário' });
  }
});
