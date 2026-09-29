import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function buildClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  // Serverless (Vercel) + соединение через пулер Supabase: каждая тёплая лямбда
  // держит пул Prisma открытым, а пулер ограничивает число клиентских
  // подключений (Supavisor: «max client connections reached»). Без лимита
  // параллельные лямбды исчерпывают пулер и страницы падают с 500.
  // Одно соединение на инстанс — стандартная рекомендация Vercel+Supabase;
  // запросы внутри страницы сериализуются, таблицы каталога малы, цена минимальна.
  if (url && /pooler\.|supabase\./.test(new URL(url).hostname)) {
    const u = new URL(url);
    u.searchParams.set("connection_limit", "1");
    u.searchParams.set("pool_timeout", "15");
    return new PrismaClient({ datasources: { db: { url: u.toString() } } });
  }
  return new PrismaClient();
}

/** Синглтон PrismaClient (в dev переживает hot-reload). */
export const prisma = globalForPrisma.prisma ?? buildClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
