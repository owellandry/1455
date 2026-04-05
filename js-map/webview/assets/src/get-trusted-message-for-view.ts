import type { MessageForView } from "protocol";

const OPAQUE_ORIGIN = "null";
const isExtensionHost = __WINDOW_TYPE__ === "extension";

export function getTrustedMessageForView(
  event: MessageEvent<unknown>,
): MessageForView | null {
  const source = event.source;
  const expectedOrigin = window.location.origin;

  // In the extension host, VS Code/Cursor can relay messages via a bridge
  // where `event.source` is not `window.parent`. Trust the webview channel
  // by exact match of the current window origin and the event origin.
  if (isExtensionHost && event.origin !== expectedOrigin) {
    return null;
  }
  if (!isExtensionHost) {
    // Outside the extension host, keep the stricter source checks.
    const isTrustedSource =
      source == null || source === window || source === window.parent;
    if (!isTrustedSource) {
      return null;
    }
  }
  // When messages originate from the same window, enforce a strict origin
  // match whenever our own origin is concrete (non-empty and non-opaque).
  if (
    source === window &&
    expectedOrigin !== "" &&
    expectedOrigin !== OPAQUE_ORIGIN &&
    event.origin !== expectedOrigin
  ) {
    return null;
  }

  const message = event.data;
  if (message == null || typeof message !== "object") {
    return null;
  }
  if (!hasStringType(message)) {
    return null;
  }
  return message;
}

function hasStringType(message: object): message is MessageForView {
  return typeof (message as { type?: unknown }).type === "string";
}
