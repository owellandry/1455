import { maybeErrorToString } from "protocol";
import { z } from "zod";

export const APP_SERVER_RPC_ERROR_REASON_CLOUD_REQUIREMENTS =
  "cloudRequirements";

const TOKEN_REFRESH_FAILED_MESSAGE = "your access token could not be refreshed";
const RELOGIN_MESSAGE = "please log out and sign in again";
const errorWithDataSchema = z.object({
  data: z.unknown(),
});
const appServerRpcErrorDataSchema = z.object({
  reason: z.string().min(1),
});

function getErrorData(error: unknown): unknown {
  const parsed = errorWithDataSchema.safeParse(error);
  return parsed.success ? parsed.data.data : null;
}

export function getAppServerRpcErrorReason(error: unknown): string | null {
  const parsed = appServerRpcErrorDataSchema.safeParse(getErrorData(error));
  return parsed.success ? parsed.data.reason : null;
}

export function shouldShowReauthError(error: unknown): boolean {
  if (
    getAppServerRpcErrorReason(error) ===
    APP_SERVER_RPC_ERROR_REASON_CLOUD_REQUIREMENTS
  ) {
    return true;
  }
  const message = maybeErrorToString(error).toLowerCase();
  return (
    message.includes(TOKEN_REFRESH_FAILED_MESSAGE) ||
    message.includes(RELOGIN_MESSAGE)
  );
}
