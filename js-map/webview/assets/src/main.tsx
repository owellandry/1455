import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { isCompactWindowContextFromWindow } from "./compact-window/is-compact-window-context";
import { FullApp } from "./full-app";
import { messageBus } from "./message-bus";
import { initRendererSentry } from "./sentry-init";

import "./styles/app.css";

const IS_COMPACT_WINDOW = isCompactWindowContextFromWindow();

document.documentElement.dataset.codexWindowType = __WINDOW_TYPE__;
document.documentElement.dataset.windowType = __WINDOW_TYPE__;
document.documentElement.dataset.codexOs = detectClientPlatform();
if (IS_COMPACT_WINDOW) {
  document.documentElement.classList.add("compact-window");
}

initRendererSentry();
window.addEventListener("error", (event) => {
  const message =
    event?.error?.stack ??
    event?.error?.message ??
    event?.message ??
    "Unknown error";
  messageBus.dispatchMessage("log-message", {
    level: "error",
    message: `[desktop-notifications][global-error] ${String(message)}`,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = (event as PromiseRejectionEvent).reason;
  const message =
    typeof reason === "object" && reason != null
      ? ((reason as { stack?: string; message?: string }).stack ??
        (reason as { message?: string }).message ??
        JSON.stringify(reason))
      : String(reason);
  messageBus.dispatchMessage("log-message", {
    level: "error",
    message: `[desktop-notifications][unhandled-rejection] ${message}`,
  });
});

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root container not found");
}

const rootHost = window as Window & { __codexRoot?: Root };
if (!rootHost.__codexRoot) {
  rootHost.__codexRoot = createRoot(container);
}
const root = rootHost.__codexRoot;

void mountApp();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    root.unmount();
    rootHost.__codexRoot = undefined;
  });
}

async function mountApp(): Promise<void> {
  await maybeEnableReactScan();

  root.render(
    <StrictMode>
      <FullApp />
    </StrictMode>,
  );
}

async function maybeEnableReactScan(): Promise<void> {
  if (
    __WINDOW_TYPE__ !== "electron" ||
    import.meta.env.VITE_REACT_SCAN !== "1"
  ) {
    return;
  }

  const { scan } = await import("react-scan");
  scan({
    enabled: true,
    showToolbar: true,
  });
}

function detectClientPlatform(): "win32" | "darwin" | "linux" | "unknown" {
  const nav = navigator as Navigator & {
    userAgentData?: {
      platform?: string;
    };
  };
  const platformHint =
    nav.userAgentData?.platform?.toLowerCase() ??
    nav.platform?.toLowerCase() ??
    nav.userAgent.toLowerCase();
  if (platformHint.includes("win")) {
    return "win32";
  }
  if (platformHint.includes("mac") || platformHint.includes("darwin")) {
    return "darwin";
  }
  if (platformHint.includes("linux")) {
    return "linux";
  }
  return "unknown";
}
