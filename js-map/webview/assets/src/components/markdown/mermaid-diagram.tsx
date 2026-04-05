import clsx from "clsx";
import mermaid from "mermaid";
import type { MermaidConfig } from "mermaid";
import type React from "react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { copyToClipboard } from "@/utils/copy-to-clipboard";
import { useIsDark } from "@/utils/use-is-dark";

import { CopyButton } from "../copy-button";
import {
  detectMermaidDiagramKind,
  type MermaidDiagramKind,
} from "./ensure-mermaid-diagrams";

const DIAGRAM_PADDING_CLASS =
  "bg-token-text-code-block-background/10 border-token-input-background relative overflow-x-auto rounded-lg border px-4 py-3";

const DIRECTIVE_PATTERN = /%%\{[\s\S]*?\}%%/g;
const SECURITY_LEVEL_PATTERN = /securityLevel\s*:/i;
const CLICK_DIRECTIVE_PATTERN = /^\s*click\s+.*$/gim;
const FALLBACK_MERMAID_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const LIGHT_MERMAID_THEME = {
  background: "rgb(255, 255, 255)",
  clusterBkg: "rgba(0, 0, 0, 0.04)",
  edgeLabelBackground: "rgb(255, 255, 255)",
  lineColor: "rgba(17, 24, 28, 0.7)",
  mainBkg: "rgb(255, 255, 255)",
  noteBkgColor: "rgba(0, 0, 0, 0.04)",
  noteBorderColor: "rgba(17, 24, 28, 0.14)",
  noteTextColor: "rgb(17, 24, 28)",
  primaryBorderColor: "rgba(17, 24, 28, 0.12)",
  primaryColor: "rgb(255, 255, 255)",
  primaryTextColor: "rgb(17, 24, 28)",
  secondaryColor: "rgba(0, 0, 0, 0.04)",
  secondaryTextColor: "rgba(17, 24, 28, 0.7)",
  tertiaryColor: "rgba(0, 0, 0, 0.04)",
  tertiaryTextColor: "rgba(17, 24, 28, 0.55)",
  textColor: "rgb(17, 24, 28)",
} as const;
const DARK_MERMAID_THEME = {
  background: "rgb(10, 10, 10)",
  clusterBkg: "rgba(255, 255, 255, 0.06)",
  edgeLabelBackground: "rgb(10, 10, 10)",
  lineColor: "rgba(255, 255, 255, 0.72)",
  mainBkg: "rgba(255, 255, 255, 0.08)",
  noteBkgColor: "rgba(255, 255, 255, 0.08)",
  noteBorderColor: "rgba(255, 255, 255, 0.18)",
  noteTextColor: "rgb(255, 255, 255)",
  primaryBorderColor: "rgba(255, 255, 255, 0.16)",
  primaryColor: "rgba(255, 255, 255, 0.08)",
  primaryTextColor: "rgb(255, 255, 255)",
  secondaryColor: "rgba(255, 255, 255, 0.04)",
  secondaryTextColor: "rgba(255, 255, 255, 0.72)",
  tertiaryColor: "rgba(255, 255, 255, 0.06)",
  tertiaryTextColor: "rgba(255, 255, 255, 0.6)",
  textColor: "rgb(255, 255, 255)",
} as const;

// Remove per-diagram directives so rendered diagrams cannot relax the global security sandbox.
function sanitizeMermaidCode(source: string): string | undefined {
  let failed = false;
  const withoutDirectives = source.replace(DIRECTIVE_PATTERN, (directive) => {
    if (SECURITY_LEVEL_PATTERN.test(directive)) {
      failed = true;
    }
    return "";
  });

  if (failed) {
    return undefined;
  }

  return withoutDirectives.replace(CLICK_DIRECTIVE_PATTERN, "");
}

function ensureMermaidConfig(
  host: HTMLElement,
  isDark: boolean,
): MermaidConfig {
  const themeVariables = getMermaidThemeVariables(host, isDark);
  const fontFamily = getMermaidFontFamily(host);
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    suppressErrorRendering: true,
    deterministicIds: true,
    deterministicIDSeed: "codex-mermaid",
    htmlLabels: false,
    flowchart: { htmlLabels: false },
    darkMode: isDark,
    fontFamily,
    theme: "base",
    themeVariables,
  });
  return {
    darkMode: isDark,
    fontFamily,
    theme: "base",
    themeVariables,
  };
}

export function MermaidDiagram({
  code,
  className,
  fallback,
  wideBlockKind,
}: {
  code: string;
  className?: string;
  fallback?: React.ReactElement;
  wideBlockKind?: string;
}): React.ReactElement {
  const isDark = useIsDark();
  const rawId = useId();
  const diagramId = useMemo(
    () => `mermaid-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [rawId],
  );

  const sanitizedCode = useMemo(() => sanitizeMermaidCode(code), [code]);

  const diagramKind = useMemo<MermaidDiagramKind | null>(
    () =>
      sanitizedCode != null ? detectMermaidDiagramKind(sanitizedCode) : null,
    [sanitizedCode],
  );

  if (sanitizedCode == null) {
    return (
      <div
        className={clsx("my-2", className)}
        data-wide-markdown-block={wideBlockKind != null ? "true" : undefined}
        data-wide-markdown-block-kind={wideBlockKind}
      >
        {fallback}
      </div>
    );
  }

  return (
    <div
      className={clsx("my-2", className)}
      data-wide-markdown-block={wideBlockKind != null ? "true" : undefined}
      data-wide-markdown-block-kind={wideBlockKind}
    >
      <MermaidDiagramContent
        code={code}
        diagramId={diagramId}
        diagramKind={diagramKind}
        fallback={fallback}
        isDark={!!isDark}
        sanitizedCode={sanitizedCode}
      />
    </div>
  );
}

function MermaidDiagramContent({
  code,
  diagramId,
  diagramKind,
  fallback,
  isDark,
  sanitizedCode,
}: {
  code: string;
  diagramId: string;
  diagramKind: MermaidDiagramKind | null;
  fallback?: React.ReactElement;
  isDark: boolean;
  sanitizedCode: string;
}): React.ReactElement | null {
  const intl = useIntl();
  const holderRef = useRef<HTMLDivElement>(null);
  const [diagramErrorKey, setDiagramErrorKey] = useState<string | null>(null);
  const renderKey = useMemo(
    () => `${isDark ? "dark" : "light"}::${sanitizedCode}`,
    [isDark, sanitizedCode],
  );
  const fencedCode = useMemo(
    () => ["```mermaid", code, "```"].join("\n"),
    [code],
  );
  const handleCopyToClipboard = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>): void => {
      void copyToClipboard(fencedCode, event);
    },
    [fencedCode],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const container = holderRef.current;
    if (!container) {
      return;
    }

    if (!code) {
      container.innerHTML = "";
      return;
    }

    let isCancelled = false;
    container.innerHTML = "";

    const render = async (): Promise<void> => {
      try {
        const mermaidConfig = ensureMermaidConfig(container, isDark);
        const parseResult = await mermaid.parse(sanitizedCode, {
          suppressErrors: true,
        });
        if (parseResult === false) {
          if (isCancelled) {
            return;
          }
          container.innerHTML = "";
          setDiagramErrorKey(renderKey);
          return;
        }
        const { svg } = await mermaid.render(diagramId, sanitizedCode);
        if (isCancelled) {
          return;
        }
        container.innerHTML = svg;
        const renderedSvg = container.querySelector("svg");
        if (renderedSvg) {
          renderedSvg.style.maxWidth = "100%";
          renderedSvg.style.maxHeight = "var(--markdown-wide-block-max-height)";
          renderedSvg.style.width = "100%";
          renderedSvg.style.height = "auto";
        }
        container.setAttribute("data-mermaid-theme", mermaidConfig.theme ?? "");
        if (diagramKind != null) {
          container.setAttribute("data-mermaid-diagram", diagramKind);
        } else {
          container.removeAttribute("data-mermaid-diagram");
        }
        setDiagramErrorKey((previous) =>
          previous === renderKey ? null : previous,
        );
      } catch {
        if (isCancelled) {
          return;
        }
        container.innerHTML = "";
        setDiagramErrorKey(renderKey);
      }
    };

    void render();

    return (): void => {
      isCancelled = true;
    };
  }, [code, diagramId, diagramKind, isDark, renderKey, sanitizedCode]);

  if (diagramErrorKey === renderKey) {
    return fallback ?? null;
  }

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10">
        <CopyButton
          iconClassName="icon-2xs"
          iconOnly
          buttonText={intl.formatMessage({
            id: "mermaidDiagram.copySource",
            defaultMessage: "Copy mermaid",
            description:
              "Tooltip label for the copy button on rendered mermaid diagrams",
          })}
          onCopy={handleCopyToClipboard}
        />
      </div>
      <div
        ref={holderRef}
        className={clsx(
          DIAGRAM_PADDING_CLASS,
          "overflow-auto [&>svg]:h-auto [&>svg]:max-h-[var(--markdown-wide-block-max-height)] [&>svg]:w-full [&>svg]:max-w-full [&>svg]:text-left",
        )}
        aria-label={intl.formatMessage({
          id: "mermaidDiagram.ariaLabel",
          defaultMessage: "Mermaid diagram",
          description: "ARIA label for rendered mermaid diagrams",
        })}
        role="img"
      >
        <span className="sr-only">
          <FormattedMessage
            id="mermaidDiagram.originalCode"
            defaultMessage="Mermaid source code"
            description="Screen reader label for the hidden mermaid source code."
          />
        </span>
        <pre className="sr-only whitespace-pre-wrap">{code}</pre>
      </div>
    </div>
  );
}

// Mermaid derives additional theme values in JS, so pass concrete computed colors here
// instead of raw CSS variables. The fallback palette only covers test or no-style paths.
function getMermaidThemeVariables(
  host: HTMLElement,
  isDark: boolean,
): MermaidConfig["themeVariables"] {
  const fallbackTheme = isDark ? DARK_MERMAID_THEME : LIGHT_MERMAID_THEME;
  const primaryColor = resolveBackgroundColor(
    host,
    "var(--color-background-elevated-primary)",
    fallbackTheme.primaryColor,
  );
  const secondaryColor = resolveBackgroundColor(
    host,
    "var(--color-background-elevated-secondary)",
    fallbackTheme.secondaryColor,
  );
  const tertiaryColor = resolveBackgroundColor(
    host,
    "var(--color-token-text-code-block-background)",
    fallbackTheme.tertiaryColor,
  );
  const background = resolveBackgroundColor(
    host,
    "var(--color-token-main-surface-primary)",
    fallbackTheme.background,
  );
  const edgeLabelBackground = resolveBackgroundColor(
    host,
    "var(--color-background-editor-opaque)",
    fallbackTheme.edgeLabelBackground,
  );
  const textColor = resolveTextColor(
    host,
    "var(--color-token-foreground)",
    fallbackTheme.textColor,
  );
  const secondaryTextColor = resolveTextColor(
    host,
    "var(--color-token-description-foreground)",
    fallbackTheme.secondaryTextColor,
  );
  const tertiaryTextColor = resolveTextColor(
    host,
    "var(--color-text-foreground-tertiary)",
    fallbackTheme.tertiaryTextColor,
  );
  const borderColor = resolveBorderColor(
    host,
    "var(--color-token-input-border)",
    fallbackTheme.primaryBorderColor,
  );
  const lineColor = resolveTextColor(
    host,
    "var(--color-token-description-foreground)",
    fallbackTheme.lineColor,
  );

  return {
    actorBorder: lineColor,
    actorBkg: primaryColor,
    actorLineColor: lineColor,
    actorTextColor: textColor,
    activationBkgColor: secondaryColor,
    activationBorderColor: lineColor,
    background,
    clusterBkg: secondaryColor,
    clusterBorder: borderColor,
    defaultLinkColor: lineColor,
    edgeLabelBackground,
    labelBackgroundColor: edgeLabelBackground,
    labelBoxBkgColor: primaryColor,
    labelBoxBorderColor: borderColor,
    labelTextColor: textColor,
    lineColor,
    loopTextColor: textColor,
    mainBkg: primaryColor,
    nodeBorder: borderColor,
    noteBkgColor: secondaryColor,
    noteBorderColor: borderColor,
    noteTextColor: textColor,
    primaryBorderColor: borderColor,
    primaryColor,
    primaryTextColor: textColor,
    relationColor: lineColor,
    relationLabelBackground: edgeLabelBackground,
    relationLabelColor: textColor,
    secondaryBorderColor: borderColor,
    secondaryColor,
    secondaryTextColor,
    sequenceNumberColor: textColor,
    signalColor: lineColor,
    signalTextColor: textColor,
    tertiaryBorderColor: borderColor,
    tertiaryColor,
    tertiaryTextColor,
    textColor,
    titleColor: textColor,
  };
}

function getMermaidFontFamily(host: HTMLElement): string {
  const probe = host.ownerDocument.createElement("div");
  probe.style.fontFamily = "var(--font-sans)";
  probe.setAttribute("aria-hidden", "true");
  appendHiddenProbe(host, probe);
  const fontFamily =
    host.ownerDocument.defaultView?.getComputedStyle(probe).fontFamily.trim() ??
    "";
  probe.remove();
  return fontFamily.length > 0 ? fontFamily : FALLBACK_MERMAID_FONT_FAMILY;
}

function resolveBackgroundColor(
  host: HTMLElement,
  cssValue: string,
  fallback: string,
): string {
  const probe = host.ownerDocument.createElement("div");
  probe.style.backgroundColor = cssValue;
  return getResolvedProbeColor(host, probe, "backgroundColor", fallback);
}

function resolveTextColor(
  host: HTMLElement,
  cssValue: string,
  fallback: string,
): string {
  const probe = host.ownerDocument.createElement("div");
  probe.style.color = cssValue;
  return getResolvedProbeColor(host, probe, "color", fallback);
}

function resolveBorderColor(
  host: HTMLElement,
  cssValue: string,
  fallback: string,
): string {
  const probe = host.ownerDocument.createElement("div");
  probe.style.borderTopStyle = "solid";
  probe.style.borderTopWidth = "1px";
  probe.style.borderTopColor = cssValue;
  return getResolvedProbeColor(host, probe, "borderTopColor", fallback);
}

function getResolvedProbeColor(
  host: HTMLElement,
  probe: HTMLDivElement,
  property: "backgroundColor" | "borderTopColor" | "color",
  fallback: string,
): string {
  appendHiddenProbe(host, probe);
  const resolved =
    host.ownerDocument.defaultView?.getComputedStyle(probe)[property].trim() ??
    "";
  probe.remove();
  return resolved.length > 0 ? resolved : fallback;
}

function appendHiddenProbe(host: HTMLElement, probe: HTMLDivElement): void {
  probe.style.opacity = "0";
  probe.style.pointerEvents = "none";
  probe.style.position = "absolute";
  probe.style.inset = "0";
  probe.style.width = "0";
  probe.style.height = "0";
  host.appendChild(probe);
}
