import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { canAddShelfItem, FREE_SHELF_LIMIT, getUserPlan } from "@/lib/billing";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_NAME = 200;
const MAX_INCI = 10_000;

/** GET /api/shelf — полка текущего пользователя (с данными продуктов). */
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const items = await prisma.shelfItem.findMany({
    where: { userId: session.user.id },
    include: {
      product: {
        include: {
          ingredients: { include: { ingredient: true }, orderBy: { position: "asc" } },
        },
      },
    },
    orderBy: { addedAt: "desc" },
  });
  return NextResponse.json({ items });
}

/** POST /api/shelf — добавить средство: { productId } или { customName, customInci? }. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const { productId, customName, customInci } = body as {
    productId?: unknown;
    customName?: unknown;
    customInci?: unknown;
  };

  // Лимит бесплатного тарифа: не больше FREE_SHELF_LIMIT средств на полке
  const plan = await getUserPlan(session.user.id);
  const count = await prisma.shelfItem.count({
    where: { userId: session.user.id },
  });
  if (!canAddShelfItem(plan.isPro, count)) {
    return NextResponse.json(
      {
        error: `Бесплатный тариф — до ${FREE_SHELF_LIMIT} средств на полке. Перейдите на Pro, чтобы добавлять без ограничений.`,
        code: "PAYWALL",
      },
      { status: 402 },
    );
  }

  if (typeof productId === "string" && productId) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: "Продукт не найден" }, { status: 404 });
    }
    const item = await prisma.shelfItem.create({
      data: { userId: session.user.id, productId },
    });
    return NextResponse.json({ item }, { status: 201 });
  }

  if (typeof customName === "string" && customName.trim()) {
    if (customName.length > MAX_NAME) {
      return NextResponse.json({ error: "Название слишком длинное" }, { status: 400 });
    }
    if (
      customInci !== undefined &&
      (typeof customInci !== "string" || customInci.length > MAX_INCI)
    ) {
      return NextResponse.json({ error: "Некорректный состав" }, { status: 400 });
    }
    const item = await prisma.shelfItem.create({
      data: {
        userId: session.user.id,
        customName: customName.trim(),
        customInci: typeof customInci === "string" ? customInci : null,
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  }

  return NextResponse.json(
    { error: "Передайте productId или customName" },
    { status: 400 },
  );
}
