import { NextResponse } from "next/server";

/** JSON-ошибка в едином формате API: { error, code? }. */
export function jsonError(error: string, status: number, code?: string) {
  return NextResponse.json(code ? { error, code } : { error }, { status });
}

/** Тело запроса как объект или null, если это не JSON-объект. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
