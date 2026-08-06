import { prisma } from '../server/db.js';

async function main() {
  const scenarios = await prisma.scenario.findMany();
  console.log('Scenarios in database:');
  scenarios.forEach(s => {
    console.log(`ID: ${s.id}, Name: ${s.name}, Created: ${s.created_at}`);
  });
}

main().catch(console.error);
