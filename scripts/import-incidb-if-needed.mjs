/**
 * Одноразовый импорт каталога продуктов INCIDB на деплое (Vercel build).
 * Полный прогон идёт несколько минут — выполняем его, только если каталог
 * ещё не наполнен (< 17 000 продуктов); иначе выходим сразу.
 * Сам импорт — scripts/import-incidb-products.ts (идемпотентный upsert).
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const count = await prisma.product.count();
  // FORCE_INCIDB_IMPORT=1 — принудительный прогон (исправления импорта на проде)
  if (process.env.FORCE_INCIDB_IMPORT === "1") {
    console.log("INCIDB products: FORCE_INCIDB_IMPORT=1 — запускаю импорт каталога…");
    execSync("pnpm db:import-incidb", { stdio: "inherit" });
  } else if (count >= 17000) {
    console.log(`INCIDB products: уже импортировано (${count}), пропускаю.`);
  } else {
    console.log(`INCIDB products: в БД ${count} — запускаю импорт каталога…`);
    execSync("pnpm db:import-incidb", { stdio: "inherit" });
  }
} catch (e) {
  // БД недоступна на сборке или импорт упал — не валим деплой,
  // каталог можно доимпортировать вручную: pnpm db:import-incidb
  console.warn("INCIDB products: импорт пропущен:", e?.message ?? e);
} finally {
  await prisma.$disconnect();
}
