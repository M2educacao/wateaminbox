import type { WhatsAppConnection } from "@/lib/api/types";
import type { WorkerConnectionStatusPayload } from "@wateaminbox/shared";

/**
 * Per-connection state tracked in the hook
 */
export interface ConnectionState {
  qrCode: string | null;
  qrExpiresAt: Date | null;
  error: string | null;
  isConnecting: boolean;
  isDisconnecting: boolean;
}

/**
 * Combined connection data with local state
 */
export interface ConnectionWithState extends WhatsAppConnection {
  localState: ConnectionState;
}

/** Explicit realtime state, including a cleared QR, wins over persisted data. */
export function resolveConnectionQrState(
  local: ConnectionState | undefined,
  persistedQrCode: string | null | undefined,
  persistedQrExpiresAt: Date | null,
  status: WhatsAppConnection["status"],
): Pick<ConnectionState, "qrCode" | "qrExpiresAt"> {
  if (!local) {
    return {
      qrCode: persistedQrCode ?? null,
      qrExpiresAt: persistedQrExpiresAt,
    };
  }
  if (local.qrCode) {
    return { qrCode: local.qrCode, qrExpiresAt: local.qrExpiresAt };
  }
  // Polling recovers a missed QR realtime event while pairing. Once realtime
  // explicitly finishes or fails pairing, local state keeps stale DB data out.
  if (
    status === "pending" &&
    local.isConnecting &&
    !local.error &&
    persistedQrCode
  ) {
    return {
      qrCode: persistedQrCode,
      qrExpiresAt: persistedQrExpiresAt,
    };
  }
  return { qrCode: null, qrExpiresAt: null };
}

/**
 * A late worker "connecting" publication must not hide a QR that has already
 * arrived. Worker status and QR events travel independently, so their delivery
 * order is not guaranteed.
 */
export function resolveWorkerConnectionStatusUpdate(
  payload: WorkerConnectionStatusPayload,
): Partial<ConnectionState> {
  const isError = payload.status === "error" || payload.status === "failed";
  const preserveQr = payload.status === "connecting";

  return {
    ...(preserveQr ? {} : { qrCode: null, qrExpiresAt: null }),
    error: isError ? payload.reason : null,
    isConnecting: preserveQr,
    isDisconnecting: false,
  };
}

/**
 * Pending connection state (before connection is created on server)
 */
export interface PendingConnection {
  qrCode: string | null;
  qrExpiresAt: Date | null;
  error: string | null;
  tempId: string | null;
}
