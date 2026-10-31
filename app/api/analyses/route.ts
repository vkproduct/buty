import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface AnalysisListItem {
  id: string;
  createdAt: string;
  inputMethod: string;
  total: number;
  recognized: number;
  conflicts: number;
  preview: string;
  /** Полный текст состава — для повторного разбора по клику. */
  rawText: string;
  productName: string | null;
}

/**
 * GET /api/analyses?cursor=<id> → последние разборы текущего пользователя
 * по 20 штук: { items, nextCursor }. Работает и для сайта (cookie), и для
 * приложения (Bearer bt_…).
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Войдите, чтобы увидеть историю" }, { status: 401 });
  }

  const cursor = new URL(request.url).searchParams.get("cursor");
  const rows = await prisma.analysis.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { product: { select: { brand: true, name: true } } },
  });

  const nextCursor = rows.length > PAGE_SIZE ? rows[PAGE_SIZE].id : null;
  const items: AnalysisListItem[] = rows.slice(0, PAGE_SIZE).map((a) => ({
    id: a.id,
    createdAt: a.createdAt.toISOString(),
    inputMethod: a.inputMethod,
    total: a.total,
    recognized: a.recognized,
    conflicts: a.conflicts,
    preview: a.rawText.slice(0, 120),
    rawText: a.rawText,
    productName: a.product ? `${a.product.brand} ${a.product.name}` : null,
  }));

  return NextResponse.json({ items, nextCursor });
}

/** DELETE /api/analyses — очистить всю историю разборов текущего пользователя. */
export async function DELETE() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Войдите" }, { status: 401 });
  }
  await prisma.analysis.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
