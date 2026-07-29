import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });

export async function getConfig() {
  return prisma.escalaConfig.findUnique({ where: { id: 1 } });
}

export async function upsertConfig(data: {
  colaboradores?: any;
  teams?: any;
  params?: any;
  demanda_m3?: any;
  demanda_pcs?: any;
  pmt?: any;
  prod_rate_m3?: number | null;
  prod_rate_pcs?: number | null;
  prod_unit?: string | null;
}) {
  return prisma.escalaConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      colaboradores: data.colaboradores ?? undefined,
      teams: data.teams ?? undefined,
      params: data.params ?? undefined,
      demanda_m3: data.demanda_m3 ?? undefined,
      demanda_pcs: data.demanda_pcs ?? undefined,
      pmt: data.pmt ?? undefined,
      prod_rate_m3: data.prod_rate_m3 ?? undefined,
      prod_rate_pcs: data.prod_rate_pcs ?? undefined,
      prod_unit: data.prod_unit ?? undefined,
    },
    update: {
      colaboradores: data.colaboradores ?? undefined,
      teams: data.teams ?? undefined,
      params: data.params ?? undefined,
      demanda_m3: data.demanda_m3 ?? undefined,
      demanda_pcs: data.demanda_pcs ?? undefined,
      pmt: data.pmt ?? undefined,
      prod_rate_m3: data.prod_rate_m3 ?? undefined,
      prod_rate_pcs: data.prod_rate_pcs ?? undefined,
      prod_unit: data.prod_unit ?? undefined,
      updated_at: new Date(),
    },
  });
}

export async function listScenarios() {
  return prisma.scenario.findMany({
    select: { id: true, name: true, created_at: true },
    orderBy: { created_at: 'desc' },
  });
}

export async function getScenario(id: number) {
  return prisma.scenario.findUnique({ where: { id } });
}

export async function createScenario(data: {
  name: string;
  teams?: any;
  params?: any;
  demanda_m3?: any;
  demanda_pcs?: any;
  pmt?: any;
  prod_rate_m3?: number | null;
  prod_rate_pcs?: number | null;
  prod_unit?: string | null;
}) {
  return prisma.scenario.create({ data });
}

export async function deleteScenario(id: number) {
  return prisma.scenario.delete({ where: { id } });
}

export async function updateScenario(id: number, data: {
  teams?: any;
  params?: any;
  demanda_m3?: any;
  demanda_pcs?: any;
  pmt?: any;
  prod_rate_m3?: number | null;
  prod_rate_pcs?: number | null;
  prod_unit?: string | null;
}) {
  return prisma.scenario.update({
    where: { id },
    data: {
      teams: data.teams ?? undefined,
      params: data.params ?? undefined,
      demanda_m3: data.demanda_m3 ?? undefined,
      demanda_pcs: data.demanda_pcs ?? undefined,
      pmt: data.pmt ?? undefined,
      prod_rate_m3: data.prod_rate_m3 ?? undefined,
      prod_rate_pcs: data.prod_rate_pcs ?? undefined,
      prod_unit: data.prod_unit ?? undefined,
    },
  });
}
