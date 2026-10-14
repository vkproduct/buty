import { afterEach, describe, expect, it, vi } from "vitest";

import { getEmailProvider } from "./index";
import { MockEmailProvider } from "./mock";
import { ResendEmailProvider } from "./resend";

describe("getEmailProvider", () => {
  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    vi.unstubAllEnvs();
  });

  it("без RESEND_API_KEY возвращает MockEmailProvider", () => {
    expect(getEmailProvider()).toBeInstanceOf(MockEmailProvider);
  });

  it("с ключом и EMAIL_FROM возвращает ResendEmailProvider", () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.EMAIL_FROM = "Buty.app <noreply@buty.app>";
    expect(getEmailProvider()).toBeInstanceOf(ResendEmailProvider);
  });

  it("с ключом, но без EMAIL_FROM — MockEmailProvider", () => {
    process.env.RESEND_API_KEY = "test-key";
    expect(getEmailProvider()).toBeInstanceOf(MockEmailProvider);
  });

  it("production без ключа бросает ошибку", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getEmailProvider()).toThrow("Email provider is not configured");
  });

  it("production с ключом, но без EMAIL_FROM бросает ошибку", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.RESEND_API_KEY = "test-key";
    expect(() => getEmailProvider()).toThrow("Email provider is not configured");
  });

  it("production с ключом и EMAIL_FROM возвращает ResendEmailProvider", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.RESEND_API_KEY = "test-key";
    process.env.EMAIL_FROM = "Buty.app <noreply@buty.app>";
    expect(getEmailProvider()).toBeInstanceOf(ResendEmailProvider);
  });

  it("development без ключа возвращает MockEmailProvider", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(getEmailProvider()).toBeInstanceOf(MockEmailProvider);
  });
});
