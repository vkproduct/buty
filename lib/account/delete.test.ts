import { beforeEach, describe, expect, it, vi } from "vitest";

const userDelete = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { delete: (...a: unknown[]) => userDelete(...a) } },
}));

import { deleteUserAccount } from "./delete";

describe("deleteUserAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userDelete.mockResolvedValue({ id: "u1" });
  });

  it("удаляет пользователя — каскадом уходят все связанные данные", async () => {
    await deleteUserAccount("u1");
    expect(userDelete).toHaveBeenCalledWith({ where: { id: "u1" } });
  });

  it("пробрасывает ошибку Prisma (не ловим молча)", async () => {
    userDelete.mockRejectedValue(new Error("FK constraint"));
    await expect(deleteUserAccount("u1")).rejects.toThrow("FK constraint");
  });
});
