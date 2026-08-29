import { describe, expect, test } from "bun:test";
import {
  type ConnectionState,
  resolveConnectionQrState,
  resolveWorkerConnectionStatusUpdate,
} from "./types";

const localState = (qrCode: string | null): ConnectionState => ({
  qrCode,
  qrExpiresAt: null,
  error: null,
  isConnecting: false,
  isDisconnecting: false,
});

describe("connection pairing state", () => {
  test("uses persisted QR data when no realtime state was received", () => {
    const expiresAt = new Date("2030-01-01T00:00:00.000Z");
    expect(
      resolveConnectionQrState(undefined, "persisted-qr", expiresAt, "pending"),
    ).toEqual({
      qrCode: "persisted-qr",
      qrExpiresAt: expiresAt,
    });
  });

  test("recovers a persisted QR when its realtime event was missed", () => {
    const pairingState = { ...localState(null), isConnecting: true };
    expect(
      resolveConnectionQrState(
        pairingState,
        "polled-qr",
        new Date("2030-01-01T00:00:00.000Z"),
        "pending",
      ).qrCode,
    ).toBe("polled-qr");
  });

  test("does not resurrect a persisted QR after realtime clears it", () => {
    expect(
      resolveConnectionQrState(
        localState(null),
        "stale-persisted-qr",
        new Date("2030-01-01T00:00:00.000Z"),
        "connected",
      ),
    ).toEqual({ qrCode: null, qrExpiresAt: null });
  });

  test("preserves an existing QR when a late worker connecting event arrives", () => {
    expect(
      resolveWorkerConnectionStatusUpdate({
        status: "connecting",
        reason: "",
      }),
    ).toEqual({
      error: null,
      isConnecting: true,
      isDisconnecting: false,
    });
  });

  test("clears QR state when the worker reaches a terminal failure", () => {
    expect(
      resolveWorkerConnectionStatusUpdate({
        status: "failed",
        reason: "worker stopped",
      }),
    ).toEqual({
      qrCode: null,
      qrExpiresAt: null,
      error: "worker stopped",
      isConnecting: false,
      isDisconnecting: false,
    });
  });
});
