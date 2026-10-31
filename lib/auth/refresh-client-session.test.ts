import { afterEach, describe, expect, it, vi } from "vitest";

import { NEXTAUTH_MESSAGE_KEY, refreshClientSession } from "./refresh-client-session";

class FakeStorageEvent {
  type: string;
  key: string | null;
  newValue: string | null;
  constructor(type: string, init: { key?: string; newValue?: string }) {
    this.type = type;
    this.key = init.key ?? null;
    this.newValue = init.newValue ?? null;
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("refreshClientSession", () => {
  it("шлёт в текущую вкладку storage-событие, которое понимает SessionProvider next-auth", () => {
    const setItem = vi.fn();
    const dispatchEvent = vi.fn();
    vi.stubGlobal("StorageEvent", FakeStorageEvent);
    vi.stubGlobal("window", { localStorage: { setItem }, dispatchEvent });

    refreshClientSession();

    expect(setItem).toHaveBeenCalledTimes(1);
    expect(setItem.mock.calls[0][0]).toBe(NEXTAUTH_MESSAGE_KEY);
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    const event = dispatchEvent.mock.calls[0][0] as FakeStorageEvent;
    expect(event.type).toBe("storage");
    expect(event.key).toBe("nextauth.message");
    const message = JSON.parse(event.newValue ?? "{}");
    // Условия из BroadcastChannel.receive в next-auth/client/_utils.js
    expect(message.event).toBe("session");
    expect(message.data).toBeTruthy();
  });

  it("событие уходит, даже если localStorage недоступен", () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal("StorageEvent", FakeStorageEvent);
    vi.stubGlobal("window", {
      localStorage: {
        setItem: () => {
          throw new Error("SecurityError");
        },
      },
      dispatchEvent,
    });

    expect(() => refreshClientSession()).not.toThrow();
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
  });

  it("на сервере ничего не делает", () => {
    expect(() => refreshClientSession()).not.toThrow();
  });
});
