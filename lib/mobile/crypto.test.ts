import { afterEach, describe, expect, it } from "vitest";

import {
  generateCode,
  generateSessionToken,
  hashCode,
  hashSessionToken,
  isReviewLogin,
  isValidEmail,
  isWellFormedCode,
  normalizeEmail,
  parseBearer,
  safeEqualHex,
} from "./crypto";

describe("мобильный вход — криптография", () => {
  afterEach(() => {
    delete process.env.APP_REVIEW_EMAIL;
    delete process.env.APP_REVIEW_CODE;
  });

  it("код — ровно 6 цифр, включая ведущие нули", () => {
    for (let i = 0; i < 200; i++) {
      expect(isWellFormedCode(generateCode())).toBe(true);
    }
    expect(isWellFormedCode("12345")).toBe(false);
    expect(isWellFormedCode("12345a")).toBe(false);
  });

  it("хэш кода зависит от адреса и ключа", () => {
    const a = hashCode("a@b.ru", "123456", "k");
    expect(a).toBe(hashCode("a@b.ru", "123456", "k"));
    expect(a).not.toBe(hashCode("c@b.ru", "123456", "k"));
    expect(a).not.toBe(hashCode("a@b.ru", "123456", "other"));
    expect(safeEqualHex(a, hashCode("a@b.ru", "123456", "k"))).toBe(true);
    expect(safeEqualHex(a, hashCode("a@b.ru", "654321", "k"))).toBe(false);
    expect(safeEqualHex("", "")).toBe(false);
  });

  it("токен сессии уникален и хэшируется детерминированно", () => {
    const t1 = generateSessionToken();
    const t2 = generateSessionToken();
    expect(t1).not.toBe(t2);
    expect(t1.startsWith("bt_")).toBe(true);
    expect(hashSessionToken(t1)).toBe(hashSessionToken(t1));
    expect(hashSessionToken(t1)).not.toContain(t1);
  });

  it("Bearer принимается только с префиксом токена Buty", () => {
    expect(parseBearer("Bearer bt_abc")).toBe("bt_abc");
    expect(parseBearer("bearer bt_abc")).toBe("bt_abc");
    expect(parseBearer("Bearer xyz")).toBeNull();
    expect(parseBearer("Basic bt_abc")).toBeNull();
    expect(parseBearer(null)).toBeNull();
  });

  it("email нормализуется и проверяется", () => {
    expect(normalizeEmail("  Vee@Mail.RU ")).toBe("vee@mail.ru");
    expect(isValidEmail("vee@mail.ru")).toBe(true);
    expect(isValidEmail("vee@mail")).toBe(false);
    expect(isValidEmail("vee mail.ru")).toBe(false);
  });

  it("демо-вход для App Review работает только при заданных переменных", () => {
    expect(isReviewLogin("review@buty.app", "246810")).toBe(false);
    process.env.APP_REVIEW_EMAIL = "Review@Buty.app";
    process.env.APP_REVIEW_CODE = "246810";
    expect(isReviewLogin("review@buty.app", "246810")).toBe(true);
    expect(isReviewLogin("review@buty.app", "000000")).toBe(false);
    expect(isReviewLogin("other@buty.app", "246810")).toBe(false);
    process.env.APP_REVIEW_CODE = "short";
    expect(isReviewLogin("review@buty.app", "short")).toBe(false);
  });
});
