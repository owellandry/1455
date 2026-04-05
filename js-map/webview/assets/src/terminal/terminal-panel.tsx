import { ClipboardAddon } from "@xterm/addon-clipboard";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import type { ITerminalOptions } from "@xterm/xterm";
import { Terminal as XTerm } from "@xterm/xterm";
import { ConfigurationKeys, type LocalOrRemoteConversationId } from "protocol";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { ErrorBoundary } from "@/components/error-boundary";
import { useConfiguration } from "@/hooks/use-configuration";
import { usePlatform } from "@/hooks/use-platform";
import { useWindowType } from "@/hooks/use-window-type";
import XIcon from "@/icons/x.svg";
import { messageBus } from "@/message-bus";

import "@xterm/xterm/css/xterm.css";
import { dispatchCheckGitIndexForChangesEvent } from "@/review/check-git-index-for-changes";
import {
  CODE_FONT_FAMILY_PLACEHOLDER,
  DEFAULT_CODE_FONT_SIZE,
} from "@/settings/settings-content/general-settings";
import { terminalService } from "@/terminal/terminal-service";
import { getChromeTheme } from "@/theme/chrome-theme";
import {
  useResolvedAppearanceMode,
  useResolvedThemeVariant,
} from "@/theme/use-resolved-theme-variant";

import { TerminalErrorFallback } from "./terminal-error-fallback";
import { handleTerminalKeyboardShortcut } from "./terminal-keyboard-shortcuts";

import styles from "./terminal-panel.module.css";

function ensureMonospaceFallback(fontFamily: string): string {
  const trimmed = fontFamily.trim();
  if (trimmed.length === 0) {
    return "monospace";
  }
  if (/\bmonospace\b/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}, monospace`;
}

async function ensurePrimaryFontLoaded(
  primaryFontFamily: string,
  fontSize: number,
): Promise<void> {
  if (!primaryFontFamily || !("fonts" in document)) {
    return;
  }

  try {
    if (!document.fonts.check(`${fontSize}px ${primaryFontFamily}`)) {
      await document.fonts.load(`${fontSize}px ${primaryFontFamily}`);
    }
  } catch {
    // Best-effort: if loading fails, still apply the font family.
  }
}

function fitAndSyncSize(
  term: XTerm,
  fitAddon: FitAddon,
  sessionId: string,
): void {
  fitAddon.fit();
  terminalService.resize(sessionId, term.cols, term.rows);
}

function fitTerminal(fitAddon: FitAddon): void {
  fitAddon.fit();
}

function resolveTerminalTheme(): NonNullable<ITerminalOptions["theme"]> {
  const rootStyles = getComputedStyle(document.documentElement);
  const probe = document.createElement("div");
  document.body.appendChild(probe);
  const resolve = (name: string): string | undefined => {
    const raw = rootStyles.getPropertyValue(name).trim();
    if (!raw) {
      return undefined;
    }
    probe.style.color = raw;
    const computed = getComputedStyle(probe).color;
    return computed || raw || undefined;
  };
  // Pull resolved custom properties so xterm receives concrete color values.
  const theme = {
    background: resolve("--color-background-surface"),
    foreground: resolve("--color-token-terminal-foreground"),
    cursor: resolve("--color-token-terminal-foreground"),
    selectionBackground: resolve("--color-token-terminal-selection-background"),
    selectionInactiveBackground: resolve(
      "--color-token-terminal-inactive-selection-background",
    ),
    black: resolve("--color-token-terminal-ansi-black"),
    red: resolve("--color-token-terminal-ansi-red"),
    green: resolve("--color-token-terminal-ansi-green"),
    yellow: resolve("--color-token-terminal-ansi-yellow"),
    blue: resolve("--color-token-terminal-ansi-blue"),
    magenta: resolve("--color-token-terminal-ansi-magenta"),
    cyan: resolve("--color-token-terminal-ansi-cyan"),
    white: resolve("--color-token-terminal-ansi-white"),
    brightBlack: resolve("--color-token-terminal-ansi-bright-black"),
    brightRed: resolve("--color-token-terminal-ansi-bright-red"),
    brightGreen: resolve("--color-token-terminal-ansi-bright-green"),
    brightYellow: resolve("--color-token-terminal-ansi-bright-yellow"),
    brightBlue: resolve("--color-token-terminal-ansi-bright-blue"),
    brightMagenta: resolve("--color-token-terminal-ansi-bright-magenta"),
    brightCyan: resolve("--color-token-terminal-ansi-bright-cyan"),
    brightWhite: resolve("--color-token-terminal-ansi-bright-white"),
  };
  probe.remove();
  return theme;
}

export function TerminalPanel(props: {
  conversationId?: LocalOrRemoteConversationId | null;
  hostId?: string | null;
  cwd?: string | null;
  isActive?: boolean;
  sessionId?: string | null;
  onClose?: () => void;
}): React.ReactElement {
  const { conversationId, isActive = false, sessionId } = props;

  return (
    <ErrorBoundary
      key={sessionId ?? conversationId}
      name="TerminalPanel"
      fallback={(fallbackData) => (
        <TerminalErrorFallback
          onRetry={() => {
            fallbackData.resetError();
          }}
        />
      )}
    >
      <TerminalPanelContent {...props} isActive={isActive} />
    </ErrorBoundary>
  );
}

function TerminalPanelContent({
  conversationId,
  hostId,
  cwd,
  isActive = false,
  sessionId,
  onClose,
}: ComponentProps<typeof TerminalPanel>): React.ReactElement {
  const intl = useIntl();
  const { platform } = usePlatform();
  const windowType = useWindowType();
  const appearanceMode = useResolvedAppearanceMode();
  const appearanceVariant = useResolvedThemeVariant(appearanceMode);
  // The terminal only exists in the Electron app; avoid unnecessary config plumbing in other hosts.
  const isElectronWindow = windowType === "electron";
  const shouldUseTerminalClipboardShortcuts = platform !== "macOS";
  const { data: lightChromeTheme } = useConfiguration(
    ConfigurationKeys.APPEARANCE_LIGHT_CHROME_THEME,
    { enabled: isElectronWindow },
  );
  const { data: darkChromeTheme } = useConfiguration(
    ConfigurationKeys.APPEARANCE_DARK_CHROME_THEME,
    { enabled: isElectronWindow },
  );
  const { data: codeFontSize } = useConfiguration(
    ConfigurationKeys.CODE_FONT_SIZE,
    {
      enabled: isElectronWindow,
    },
  );
  const activeChromeTheme =
    appearanceVariant === "light"
      ? getChromeTheme(lightChromeTheme, "light")
      : getChromeTheme(darkChromeTheme, "dark");
  const configuredCodeFontFamily = activeChromeTheme.fonts.code?.trim() ?? "";
  const effectiveCodeFontFamily =
    configuredCodeFontFamily.length > 0
      ? configuredCodeFontFamily
      : CODE_FONT_FAMILY_PLACEHOLDER;
  const effectiveCodeFontSize = codeFontSize ?? DEFAULT_CODE_FONT_SIZE;
  const codeFontFamilyWithFallback = ensureMonospaceFallback(
    effectiveCodeFontFamily,
  );
  const primaryCodeFontFamily =
    effectiveCodeFontFamily.split(",")[0]?.trim() ?? "";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const terminalSessionIdRef = useRef<string | null>(null);
  const isTerminalAttachedRef = useRef(false);
  const codeFontFamilyWithFallbackRef = useRef(codeFontFamilyWithFallback);
  const effectiveCodeFontSizeRef = useRef(effectiveCodeFontSize);
  const firstDataRef = useRef(false);
  const [status, setStatus] = useState("Starting...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shell, setShell] = useState<string | null>(null);

  useEffect((): void => {
    codeFontFamilyWithFallbackRef.current = codeFontFamilyWithFallback;
  }, [codeFontFamilyWithFallback]);

  useEffect((): void => {
    effectiveCodeFontSizeRef.current = effectiveCodeFontSize;
  }, [effectiveCodeFontSize]);

  useEffect(() => {
    const updateTheme = (): void => {
      const terminal = terminalRef.current;
      if (!terminal) {
        return;
      }
      terminal.options.theme = resolveTerminalTheme();
      if (terminal.rows > 0) {
        terminal.refresh(0, terminal.rows - 1);
      }
    };

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const observer = new MutationObserver((): void => {
      updateTheme();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    mediaQuery.addEventListener("change", updateTheme);
    updateTheme();

    return (): void => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", updateTheme);
    };
  }, []);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) {
      return;
    }

    let cancelled = false;
    void (async (): Promise<void> => {
      await ensurePrimaryFontLoaded(
        primaryCodeFontFamily,
        effectiveCodeFontSize,
      );

      if (cancelled) {
        return;
      }

      terminal.options.fontFamily = codeFontFamilyWithFallback;
      terminal.options.fontSize = effectiveCodeFontSize;

      // Wait a frame so xterm measures with the updated font, then fit/resize.
      requestAnimationFrame((): void => {
        const renderedTerminal = terminalRef.current;
        if (!renderedTerminal || renderedTerminal !== terminal) {
          return;
        }

        const fitAddon = fitAddonRef.current;
        const terminalSessionId = terminalSessionIdRef.current;
        if (fitAddon && terminalSessionId) {
          if (isTerminalAttachedRef.current) {
            fitAndSyncSize(renderedTerminal, fitAddon, terminalSessionId);
          } else {
            fitTerminal(fitAddon);
          }
        }
      });
    })();

    return (): void => {
      cancelled = true;
    };
  }, [
    codeFontFamilyWithFallback,
    effectiveCodeFontSize,
    primaryCodeFontFamily,
  ]);

  useEffect((): void => {
    if (!isActive) {
      return;
    }
    const terminal = terminalRef.current;
    if (!terminal) {
      return;
    }
    requestAnimationFrame(() => {
      if (!terminalRef.current) {
        return;
      }
      terminalRef.current.focus();
    });
  }, [isActive]);

  useEffect((): (() => void) | undefined => {
    const mount = containerRef.current;
    if (!mount) {
      return;
    }

    const id =
      sessionId ??
      terminalService.create({
        conversationId: conversationId,
        hostId: hostId ?? null,
        cwd: cwd ?? null,
      });
    terminalSessionIdRef.current = id;
    isTerminalAttachedRef.current = false;
    let disposed = false;
    const term = new XTerm({
      allowTransparency: true,
      cursorStyle: "bar",
      fontSize: effectiveCodeFontSizeRef.current,
      allowProposedApi: true,
      cursorBlink: true,
      fontFamily: codeFontFamilyWithFallbackRef.current,
      letterSpacing: 0,
      lineHeight: 1.2,
      theme: resolveTerminalTheme(),
    });
    let scrollToBottomRaf: number | null = null;
    const scheduleScrollToBottom = (): void => {
      if (scrollToBottomRaf != null) {
        return;
      }
      scrollToBottomRaf = requestAnimationFrame((): void => {
        scrollToBottomRaf = null;
        term.scrollToBottom();
      });
    };
    terminalRef.current = term;
    const clipboardAddon = new ClipboardAddon();
    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    const webLinksAddon = new WebLinksAddon((event, uri): void => {
      if (!uri) {
        return;
      }
      event.preventDefault?.();
      messageBus.dispatchMessage("open-in-browser", { url: uri });
    });
    term.loadAddon(clipboardAddon);
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.attachCustomKeyEventHandler((event): boolean =>
      handleTerminalKeyboardShortcut({
        clipboard:
          typeof navigator !== "undefined" &&
          navigator.clipboard != null &&
          shouldUseTerminalClipboardShortcuts
            ? navigator.clipboard
            : undefined,
        event,
        sendText: (text): void => {
          terminalService.write(id, text);
        },
        term,
      }),
    );
    term.open(mount);
    /**
     * Fits and resizes on the next frame so xterm sees stable dimensions and avoids disposed state.
     */
    const syncSize = (afterFit?: () => void): void => {
      if (disposed) {
        return;
      }
      if (!mount.isConnected) {
        return;
      }
      requestAnimationFrame((): void => {
        if (disposed) {
          return;
        }
        if (!mount.isConnected) {
          return;
        }
        if (isTerminalAttachedRef.current) {
          fitAndSyncSize(term, fitAddon, id);
        } else {
          fitTerminal(fitAddon);
        }
        afterFit?.();
      });
    };
    syncSize();
    firstDataRef.current = false;

    const unregister = terminalService.register(id, {
      onInitLog: (log): void => {
        term.write(log);
        scheduleScrollToBottom();
      },
      onData: (data): void => {
        if (!firstDataRef.current) {
          firstDataRef.current = true;
          setStatus("Running");
          setErrorMessage(null);
        }
        term.write(data);
        scheduleScrollToBottom();
      },
      onExit: (): void => {
        if (!disposed) {
          setStatus("Exited");
        }
      },
      onError: (message): void => {
        if (!disposed) {
          setStatus("Error");
          setErrorMessage(message);
        }
      },
      onAttach: (_cwd, shell): void => {
        if (!disposed) {
          isTerminalAttachedRef.current = true;
          setStatus("Running");
          setErrorMessage(null);
          setShell(shell ?? null);
          syncSize();
        }
      },
    });

    const dataDisposable = term.onData((data): void => {
      terminalService.write(id, data);
    });
    const keyDisposable = term.onKey(({ domEvent }): void => {
      if (domEvent.key === "Enter") {
        dispatchCheckGitIndexForChangesEvent();
      }
    });
    if (sessionId) {
      requestAnimationFrame((): void => {
        if (disposed) {
          return;
        }
        terminalService.attach({
          sessionId,
          conversationId: conversationId,
          hostId: hostId ?? null,
          cwd: cwd ?? null,
          cols: term.cols,
          rows: term.rows,
        });
      });
    }
    const resizeObserver = new ResizeObserver((): void => {
      syncSize();
    });
    resizeObserver.observe(mount);

    return (): void => {
      disposed = true;
      if (scrollToBottomRaf != null) {
        cancelAnimationFrame(scrollToBottomRaf);
        scrollToBottomRaf = null;
      }
      resizeObserver.disconnect();
      dataDisposable.dispose();
      keyDisposable.dispose();
      unregister();
      fitAddonRef.current = null;
      terminalSessionIdRef.current = null;
      isTerminalAttachedRef.current = false;
      if (!sessionId) {
        terminalService.close(id);
      }
      term.dispose();
      terminalRef.current = null;
    };
  }, [
    conversationId,
    cwd,
    hostId,
    sessionId,
    shouldUseTerminalClipboardShortcuts,
  ]);

  return (
    <div
      data-codex-terminal
      className="relative h-full w-full bg-token-terminal-background"
    >
      <div className="absolute top-0 right-0 left-0 z-50 flex h-toolbar-sm items-center justify-between px-panel text-sm leading-none">
        <div className="flex gap-1">
          <div className="text-sm font-medium">
            <FormattedMessage
              id="terminal.title"
              defaultMessage="Terminal"
              description="Terminal panel title"
            />
          </div>
          <div className="mono text-sm text-token-description-foreground/50">
            {shell}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {status === "Error" ? (
            <div
              className="max-w-80 truncate text-token-error-foreground"
              title={errorMessage ?? status}
            >
              {errorMessage ?? status}
            </div>
          ) : null}
          {onClose ? (
            <Button
              color="ghost"
              size="icon"
              onClick={onClose}
              aria-label={intl.formatMessage({
                id: "terminal.close",
                defaultMessage: "Close terminal",
                description: "Closes the terminal panel",
              })}
            >
              <XIcon className="icon-xs" />
            </Button>
          ) : null}
        </div>
      </div>
      <div
        style={styles}
        className="absolute inset-0 top-toolbar-sm bottom-3 overflow-visible pl-panel tracking-normal"
        ref={containerRef}
      />
    </div>
  );
}
