import type * as AppServer from "app-server-types";
import {
  isAbsoluteFilesystemPath,
  isWindowsDrivePath,
  prependSlashToWindowsDrivePath,
} from "protocol";
import {
  createElement,
  useEffect,
  useState,
  type ComponentType,
  type ReactElement,
} from "react";

import FigmaLogo from "@/assets/figma2.svg";
import PlaywrightLogo from "@/assets/playwright.svg";
import SkillsColorDark from "@/assets/skills-color-dark.svg";
import SkillsColorLight from "@/assets/skills-color-light.svg";
import BugIcon from "@/icons/bug.svg";
import BuildkiteIcon from "@/icons/buildkite.svg";
import ChromeIcon from "@/icons/chrome.svg";
import CodexIcon from "@/icons/codex.svg";
import Context7Icon from "@/icons/context7.svg";
import GithubIcon from "@/icons/github.svg";
import LinearIcon from "@/icons/linear.svg";
import NotionIcon from "@/icons/notion.svg";
import OpenAIBlossomIcon from "@/icons/openai-blossom.svg";
import PencilIcon from "@/icons/pencil.svg";
import SentryIcon from "@/icons/sentry.svg";
import SlackIcon from "@/icons/slack.svg";
import { joinRootAndPath, normalizePath } from "@/utils/path";

type IconComponent = ComponentType<{ className?: string }>;

type SkillIconOptions = {
  size?: "small" | "large";
  iconSmall?: string | null;
  iconLarge?: string | null;
  basePath?: string | null;
  smallOnly?: boolean;
  alt?: string;
  fallbackName?: string;
  fallbackDescription?: string;
  fallbackIcon?: IconComponent;
};

type RenderSkillIconOptions = SkillIconOptions & {
  className?: string;
};

type SkillIconSource = {
  url: string | null;
  useCurrentColorMask: boolean;
};

const ELECTRON_APP_ORIGIN = "app://-";
const ELECTRON_FILESYSTEM_ROUTE = "/@fs";
const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

function buildIconImage(
  src: string | null,
  alt: string,
  skill?: AppServer.v2.SkillMetadata | null,
  fallbackName?: string,
  fallbackDescription?: string,
  size: "small" | "large" = "small",
): IconComponent {
  function SkillIconImage({ className }: { className?: string }): ReactElement {
    const [failed, setFailed] = useState(false);
    const isRaster = src != null && isRasterImageUrl(src);
    const mergedClassName = className
      ? `object-contain ${className}`
      : "object-contain";

    if (failed || !src) {
      return createElement(
        getFallbackSkillIcon(
          fallbackName ?? skill?.name ?? "",
          fallbackDescription ?? skill?.description,
        ),
        { className: mergedClassName },
      );
    }

    if (isRaster) {
      const sizeOverrideClassName = size === "large" ? "h-full w-full" : "";
      const wrapperClassName = className
        ? `block overflow-hidden rounded-xl ${className} ${sizeOverrideClassName}`
        : `block overflow-hidden rounded-xl ${sizeOverrideClassName}`;
      const imageClassName = "h-full w-full object-cover";
      return createElement(
        "span",
        {
          className: wrapperClassName,
        },
        createElement("img", {
          alt,
          className: imageClassName,
          draggable: false,
          src,
          onError: () => setFailed(true),
        }),
      );
    }

    return createElement("img", {
      alt,
      className: mergedClassName,
      draggable: false,
      src,
      onError: () => setFailed(true),
    });
  }

  return SkillIconImage;
}

function buildCurrentColorIcon(
  src: string,
  alt: string,
  skill?: AppServer.v2.SkillMetadata | null,
  fallbackName?: string,
  fallbackDescription?: string,
  size: "small" | "large" = "small",
): IconComponent {
  function SkillIconMask({ className }: { className?: string }): ReactElement {
    const [failed, setFailed] = useState(false);

    useEffect(() => {
      const img = new Image();
      img.onload = (): void => {};
      img.onerror = (): void => setFailed(true);
      img.src = src;

      return (): void => {
        img.onload = null;
        img.onerror = null;
      };
    }, []);

    const mergedClassName = className
      ? `inline-block bg-current ${className}`
      : "inline-block bg-current";

    if (failed) {
      return createElement(
        buildIconImage(
          src,
          alt,
          skill,
          fallbackName,
          fallbackDescription,
          size,
        ),
      );
    }

    return createElement("span", {
      "aria-hidden": alt ? undefined : true,
      "aria-label": alt || undefined,
      className: mergedClassName,
      role: alt ? "img" : undefined,
      style: {
        WebkitMaskImage: `url("${src}")`,
        WebkitMaskPosition: "center",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskImage: `url("${src}")`,
        maskPosition: "center",
        maskRepeat: "no-repeat",
        maskSize: "contain",
      },
    });
  }
  return SkillIconMask;
}

function isSvgIconUrl(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return false;
  }
  if (trimmed.startsWith("data:")) {
    return trimmed.includes("image/svg+xml");
  }
  const sanitized = trimmed.split("?")[0]?.split("#")[0] ?? "";
  return sanitized.endsWith(".svg");
}

function isRasterImageUrl(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return false;
  }
  if (trimmed.startsWith("data:")) {
    return !trimmed.includes("image/svg+xml");
  }
  const sanitized = trimmed.split("?")[0]?.split("#")[0] ?? "";
  if (sanitized.endsWith(".svg")) {
    return false;
  }
  return (
    sanitized.endsWith(".png") ||
    sanitized.endsWith(".jpg") ||
    sanitized.endsWith(".jpeg") ||
    sanitized.endsWith(".webp") ||
    sanitized.endsWith(".gif") ||
    sanitized.endsWith(".avif")
  );
}

function createElectronSkillIconUrl(fsPath: string): string {
  const encodedPath = encodeURI(fsPath);
  return `${ELECTRON_APP_ORIGIN}${ELECTRON_FILESYSTEM_ROUTE}${encodedPath}`;
}

function getSkillIconSource({
  size = "small",
  iconSmall,
  iconLarge,
  basePath,
  smallOnly,
}: {
  size?: "small" | "large";
  iconSmall?: string | null;
  iconLarge?: string | null;
  basePath?: string | null;
  smallOnly?: boolean;
}): SkillIconSource {
  const resolveIconUrl = (
    value: string,
  ): { url: string | null; isCustomPath: boolean } => {
    const trimmed = value.trim();
    if (!trimmed) {
      return { url: null, isCustomPath: false };
    }
    const lowered = trimmed.toLowerCase();
    const isRemoteSource =
      lowered.startsWith("data:") ||
      lowered.startsWith("http:") ||
      lowered.startsWith("https:");
    if (isRemoteSource) {
      return { url: trimmed, isCustomPath: false };
    }
    if (
      lowered.startsWith("file:") ||
      lowered.startsWith("vscode-resource:") ||
      lowered.startsWith("vscode-webview:") ||
      lowered.startsWith("vscode-file:")
    ) {
      return { url: trimmed, isCustomPath: !!basePath };
    }
    const normalized = normalizePath(trimmed);
    const hasWindowsDrivePath = isWindowsDrivePath(normalized);
    const hasUrlScheme = URL_SCHEME_PATTERN.test(normalized);
    if (hasUrlScheme && !hasWindowsDrivePath) {
      return { url: normalized, isCustomPath: false };
    }
    const isAbsoluteInput = isAbsoluteFilesystemPath(normalized);
    const resolved =
      basePath && !isAbsoluteInput
        ? resolveRelativeIconPath(normalized, basePath)
        : normalized;
    if (isAbsoluteFilesystemPath(resolved)) {
      const fsPath = prependSlashToWindowsDrivePath(resolved);
      const protocol = window.location.protocol;
      if (protocol === "http:" || protocol === "https:") {
        return {
          url: `/@fs${encodeURI(fsPath)}`,
          isCustomPath: !!basePath,
        };
      }
      return {
        url: createElectronSkillIconUrl(fsPath),
        isCustomPath: !!basePath,
      };
    }
    return { url: resolved, isCustomPath: !!basePath };
  };
  if (size === "large") {
    const resolved = iconLarge || iconSmall || null;
    if (!resolved) {
      return { url: null, useCurrentColorMask: false };
    }
    const { url, isCustomPath } = resolveIconUrl(resolved);
    return {
      url,
      useCurrentColorMask: !!url && isCustomPath && isSvgIconUrl(url),
    };
  }
  const resolved = smallOnly
    ? iconSmall || null
    : iconSmall || iconLarge || null;
  if (!resolved) {
    return { url: null, useCurrentColorMask: false };
  }
  const { url, isCustomPath } = resolveIconUrl(resolved);
  return {
    url,
    useCurrentColorMask: !!url && isCustomPath && isSvgIconUrl(url),
  };
}

function resolveRelativeIconPath(value: string, basePath: string): string {
  const normalizedBase = normalizePath(basePath).replace(/\/+$/, "");
  const lastSlash = normalizedBase.lastIndexOf("/");
  const baseDir = lastSlash >= 0 ? normalizedBase.slice(0, lastSlash) : "";
  return normalizePath(
    joinRootAndPath(baseDir, value.startsWith("/") ? value.slice(1) : value),
  );
}

const ELECTRON_WINDOW_SELECTOR = '[data-codex-window-type="electron"]';

function resolveIsDarkTheme(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  const electronWindow = document.querySelector(ELECTRON_WINDOW_SELECTOR);
  if (electronWindow?.classList.contains("electron-dark")) {
    return true;
  }
  if (electronWindow?.classList.contains("electron-light")) {
    return false;
  }
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function SkillsFallbackIcon({
  className,
}: {
  className?: string;
}): ReactElement {
  const [isDarkTheme, setIsDarkTheme] = useState(resolveIsDarkTheme);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const electronWindow = document.querySelector(ELECTRON_WINDOW_SELECTOR);
    if (!electronWindow) {
      return;
    }
    const observer = new MutationObserver(() => {
      setIsDarkTheme(resolveIsDarkTheme());
    });
    observer.observe(electronWindow, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return (): void => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (): void => {
      setIsDarkTheme(resolveIsDarkTheme());
    };
    mediaQuery.addEventListener("change", handleChange);
    return (): void => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  const mergedClassName = className
    ? `object-contain ${className}`
    : "object-contain";
  const Icon = isDarkTheme ? SkillsColorDark : SkillsColorLight;
  return createElement(Icon, {
    "aria-hidden": true,
    className: mergedClassName,
  });
}

// Hardcoded fallback icons used when a skill doesn't provide an icon.
const SKILL_ICON_FALLBACKS: Record<string, IconComponent> = {
  "gh-address-comments": GithubIcon,
  "buildkite-fix-ci": BuildkiteIcon,
  "sentry-observability": SentryIcon,
  "linear-implement-ticket": LinearIcon,
  "figma-implement-design": FigmaLogo,
  "skill-creator": SkillsFallbackIcon,
};

function normalizeSkillKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

function getFallbackSkillIcon(
  name: string,
  description?: string,
): IconComponent {
  const normalized = normalizeSkillKey(name);
  const fallback = SKILL_ICON_FALLBACKS[normalized];
  if (fallback) {
    return fallback;
  }
  const lowered = normalized;
  const loweredDescription = description?.toLowerCase() ?? "";
  if (lowered.includes("codex")) {
    return CodexIcon;
  }
  if (lowered.includes("openai")) {
    return OpenAIBlossomIcon;
  }
  if (lowered.includes("linear")) {
    return LinearIcon;
  }
  if (lowered.includes("review")) {
    return BugIcon;
  }
  if (lowered.includes("github") || lowered.includes("gh-")) {
    return GithubIcon;
  }
  if (loweredDescription.includes("github")) {
    return GithubIcon;
  }
  if (lowered.includes("browser") || lowered.includes("chrome")) {
    return ChromeIcon;
  }
  if (lowered.includes("plan")) {
    return PencilIcon;
  }
  if (lowered.includes("slack")) {
    return SlackIcon;
  }
  if (lowered.includes("notion")) {
    return NotionIcon;
  }
  if (lowered.includes("buildkite")) {
    return BuildkiteIcon;
  }
  if (lowered.includes("figma")) {
    return FigmaLogo;
  }
  if (lowered.includes("sentry")) {
    return SentryIcon;
  }
  if (
    lowered.includes("playwright") ||
    loweredDescription.includes("playwright")
  ) {
    return PlaywrightLogo;
  }
  if (lowered.includes("context7") || loweredDescription.includes("context7")) {
    return Context7Icon;
  }
  return SkillsFallbackIcon;
}

export function getSkillIcon(
  skill?: AppServer.v2.SkillMetadata | null,
  {
    size = "small",
    iconSmall,
    iconLarge,
    basePath,
    smallOnly,
    alt = "",
    fallbackName,
    fallbackDescription,
    fallbackIcon,
  }: SkillIconOptions = {},
): IconComponent {
  const resolvedIcon = getSkillIconSource({
    size,
    iconSmall: iconSmall ?? skill?.interface?.iconSmall ?? null,
    iconLarge: iconLarge ?? skill?.interface?.iconLarge ?? null,
    basePath: basePath ?? skill?.path ?? null,
    smallOnly,
  });

  if (!resolvedIcon.url) {
    return (
      fallbackIcon ??
      getFallbackSkillIcon(
        fallbackName ?? skill?.name ?? "",
        fallbackDescription ?? skill?.description,
      )
    );
  }
  if (resolvedIcon.useCurrentColorMask) {
    return buildCurrentColorIcon(
      resolvedIcon.url,
      alt,
      skill,
      fallbackName,
      fallbackDescription,
      size,
    );
  }
  return buildIconImage(
    resolvedIcon.url,
    alt,
    skill,
    fallbackName,
    fallbackDescription,
    size,
  );
}

export function renderSkillIcon(
  skill?: AppServer.v2.SkillMetadata | null,
  {
    size = "small",
    iconSmall,
    iconLarge,
    basePath,
    smallOnly,
    alt = "",
    fallbackName,
    fallbackDescription,
    className,
  }: RenderSkillIconOptions = {},
): ReactElement {
  const SkillIcon = getSkillIcon(skill, {
    size,
    iconSmall,
    iconLarge,
    basePath,
    smallOnly,
    alt,
    fallbackName,
    fallbackDescription,
  });
  return createElement(SkillIcon, { className });
}
