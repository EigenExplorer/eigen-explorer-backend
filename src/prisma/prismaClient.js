import { PrismaClient } from '@prisma/client';

// Ensure the Prisma client is only instantiated once in your application
let prisma;

if (!global.prisma) {
    global.prisma = new PrismaClient();
}

prisma = global.prisma;

export default prisma;
