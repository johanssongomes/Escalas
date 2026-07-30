import { prisma } from './server/db.js';
const config = await prisma.escalaConfig.findUnique({ where: { id: 1 } });
console.log('Database row:', JSON.stringify(config, null, 2));
await prisma.$disconnect();
