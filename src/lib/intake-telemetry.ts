/**
 * Non-PII structured logs for smart intake (server-side).
 * Never log document text, VINs, or customer data.
 */

export type IntakeTelemetryPayload = Record<string, string | number | boolean | null | undefined>;

export function intakeTelemetry(event: string, payload: IntakeTelemetryPayload = {}): void {
  try {
    const line = JSON.stringify({
      scope: "vehiclix:intake",
      event,
      ts: new Date().toISOString(),
      ...payload,
    });
    console.info(line);
  } catch {
    /* ignore logging failures */
  }
}
