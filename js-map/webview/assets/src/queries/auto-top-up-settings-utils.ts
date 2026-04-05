import type { components } from "@oai/sa-server-client";

export function isImmediateTopUpFailureStatus(
  immediateTopUpStatus: components["schemas"]["AutoTopUpSettingsResponse"]["immediate_top_up_status"],
): boolean {
  return (
    immediateTopUpStatus === "failed" ||
    immediateTopUpStatus === "payment_declined"
  );
}
