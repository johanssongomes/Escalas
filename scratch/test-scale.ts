import { prisma } from '../server/db.ts';
import { generateIntelligentScale, DEFAULT_OPERATION } from '../src/utils/escala52Engine';

async function main() {
  const config = await prisma.escalaConfig.findUnique({
    where: { id: 1 },
  });

  if (!config) {
    console.log("No config found");
    return;
  }

  const colaboradores = config.colaboradores as any[];
  const teams = config.teams as any[];
  const params = config.params as any;

  const res = generateIntelligentScale(
    params.operation ?? DEFAULT_OPERATION,
    teams,
    colaboradores.map(c => ({ ...c, escala: [] })),
    0, // January
    2026,
    undefined,
    params.maxConsecutiveWorkDays,
    params.rotationSequence
  );

  const colab = res.colaboradores.find(c => c.id === 'T2-001');
  console.log("Generated January 2026 for T2-001:", JSON.stringify(colab, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
