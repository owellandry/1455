import type { SupportedLanguages } from "@pierre/diffs";
import { WorkerPoolContextProvider, useWorkerPool } from "@pierre/diffs/react";
import { useSignal } from "maitai";
import { ConfigurationKeys } from "protocol";
import type React from "react";
import { useEffect } from "react";

import { useConfiguration } from "@/hooks/use-configuration";
import { useWindowType } from "@/hooks/use-window-type";
import { getCodeThemeRegistration } from "@/theme/code-theme";
import {
  useResolvedAppearanceMode,
  useResolvedThemeVariant,
} from "@/theme/use-resolved-theme-variant";

import { wordDiffsEnabled$ } from "./diff-view-mode";

const workerFactory: () => Worker = await loadWorkerFactory();
const SHIKI_WORKER_POOL_SIZE = 4;
const SHIKI_AST_LRU_CACHE_SIZE = 100;
const SHIKI_PRELOADED_LANGUAGES: Array<SupportedLanguages> = [
  "typescript",
  "javascript",
  "css",
  "html",
  "python",
];

export function ShikiHighlightProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  const windowType = useWindowType();
  const appearanceMode = useResolvedAppearanceMode();
  const appearanceVariant = useResolvedThemeVariant(appearanceMode);
  const { data: lightCodeThemeId } = useConfiguration(
    ConfigurationKeys.APPEARANCE_LIGHT_CODE_THEME_ID,
    { enabled: windowType === "electron" },
  );
  const { data: darkCodeThemeId } = useConfiguration(
    ConfigurationKeys.APPEARANCE_DARK_CODE_THEME_ID,
    { enabled: windowType === "electron" },
  );
  const wordDiffsEnabled = useSignal(wordDiffsEnabled$);

  if (windowType !== "electron" || __STORYBOOK__) {
    // The worker pool doesn't work in VS Code webviews.
    // We don't use a worker pool in Storybook to reduce the liklihood of the async pool causing flakes
    return children;
  }

  const codeTheme =
    appearanceVariant === "light"
      ? getCodeThemeRegistration(lightCodeThemeId, "light")
      : getCodeThemeRegistration(darkCodeThemeId, "dark");
  const theme = codeTheme.name;
  const lineDiffType = wordDiffsEnabled ? "word-alt" : "none";

  return (
    <WorkerPoolContextProvider
      poolOptions={{
        workerFactory,
        poolSize: SHIKI_WORKER_POOL_SIZE,
        totalASTLRUCacheSize: SHIKI_AST_LRU_CACHE_SIZE,
      }}
      highlighterOptions={{
        theme,
        lineDiffType,
        // Optionally preload languages to avoid lazy-loading delays
        langs: SHIKI_PRELOADED_LANGUAGES,
      }}
    >
      <ShikiWorkerPoolThemeSync lineDiffType={lineDiffType} theme={theme} />
      {children}
    </WorkerPoolContextProvider>
  );
}

function ShikiWorkerPoolThemeSync({
  lineDiffType,
  theme,
}: {
  lineDiffType: "none" | "word-alt";
  theme: string;
}): null {
  const workerPool = useWorkerPool();

  useEffect(() => {
    if (workerPool == null) {
      return;
    }

    void workerPool.setRenderOptions({ lineDiffType, theme });
  }, [lineDiffType, theme, workerPool]);

  return null;
}

async function loadWorkerFactory(): Promise<() => Worker> {
  const viteModule = await import("./shiki-worker-factory-vite");
  return viteModule.shikiWorkerFactoryVite;
}
