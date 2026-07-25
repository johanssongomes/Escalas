import { PrismaClient } from '../src/generated/prisma/client.js';

export const prisma = new PrismaClient();

export async function getConfig() {
  return prisma.escalaConfig.findUnique({ where: { id: 1 } });
}

export async function upsertConfig(data: {
  colaboradores?: any;
  teams?: any;
  params?: any;
  demanda_m3?: any;
  demanda_pcs?: any;
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
    },
    update: {
      colaboradores: data.colaboradores ?? undefined,
      teams: data.teams ?? undefined,
      params: data.params ?? undefined,
      demanda_m3: data.demanda_m3 ?? undefined,
      demanda_pcs: data.demanda_pcs ?? undefined,
      updated_at: new Date(),
    },
  });
}
