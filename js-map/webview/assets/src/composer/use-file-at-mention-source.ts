import type { FuzzyFileSearchResult } from "app-server-types";
import sortBy from "lodash/sortBy";
import type { FileDescriptor } from "protocol";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import type { FuzzySearchSession } from "@/app-server/fuzzy-file-search-controller";
import { scoreQueryMatch } from "@/composer/score-query-match";
import { usePlatform } from "@/hooks/use-platform";
import { logger } from "@/utils/logger";
import { formatRelativeFilePath, getHostFilePath } from "@/utils/path";

import type {
  AtMentionMenuSection,
  AtMentionSourceState,
} from "./at-mention-source-types";
import { getFileMentionIcon } from "./mention-icons";

type FormattedFile = FileDescriptor & { relativePathWithoutFileName: string };

const FILES_SECTION_TITLE = {
  id: "composer.atMentionList.files",
  defaultMessage: "Files",
  description: "Section header for file results in the @ mention list.",
} as const;

const FILES_EMPTY_STATE = {
  id: "composer.atMentionList.emptyQuery",
  defaultMessage: "Type to search for files",
  description: "Shown in the files section when the query is empty",
} as const;

const FILES_LOADING_STATE = {
  id: "composer.atMentionList.loading",
  defaultMessage: "Searching files…",
  description:
    "Shown in the files section when fuzzy search is loading and no results have arrived yet",
} as const;

export function useFileAtMentionSource({
  query,
  roots,
}: {
  query: string;
  roots: Array<string>;
}): AtMentionSourceState {
  const { platform } = usePlatform();
  const { files: searchFiles, isLoading } = useFuzzySearchSession(roots, query);

  const files = useMemo((): Array<FormattedFile> | null => {
    if (searchFiles == null) {
      return null;
    }

    const formattedFiles = searchFiles.map((file) =>
      formatFuzzySearchFileResult(
        file,
        roots.length > 1,
        platform === "windows",
      ),
    );
    return sortFilesByQuery(formattedFiles, query);
  }, [platform, query, roots, searchFiles]);

  const trimmedQuery = query.trim();
  const sections: Array<AtMentionMenuSection> = [
    {
      id: "files",
      title: FILES_SECTION_TITLE,
      items: (files ?? []).map((file) => ({
        key: `file:${file.fsPath ?? file.path}`,
        label: file.label,
        detail: file.relativePathWithoutFileName,
        icon: getFileMentionIcon(file.path),
        insertMention: ({ composerController, mentionState }): void => {
          composerController.insertAtMention(file, mentionState);
        },
      })),
      emptyState:
        trimmedQuery.length === 0
          ? FILES_EMPTY_STATE
          : isLoading && (files?.length ?? 0) === 0
            ? FILES_LOADING_STATE
            : null,
      isLoading,
    },
  ];

  return {
    sections,
  };
}

const useFuzzySearchSession = (
  roots: Array<string>,
  query: string,
): {
  files: Array<FuzzyFileSearchResult> | null;
  isLoading: boolean;
} => {
  const mcpManager = useDefaultAppServerManager();
  const [files, setFiles] = useState<Array<FuzzyFileSearchResult> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const fuzzySearchSessionPromiseRef =
    useRef<Promise<FuzzySearchSession> | null>(null);
  const activeSessionTokenRef = useRef<object | null>(null);
  const rootsKey = roots.join("\u0000");

  const getOrStartFuzzySearchSession = useEffectEvent(
    async (): Promise<FuzzySearchSession> => {
      if (fuzzySearchSessionPromiseRef.current != null) {
        return fuzzySearchSessionPromiseRef.current;
      }

      const sessionToken = {};
      activeSessionTokenRef.current = sessionToken;
      const sessionPromise = mcpManager.createFuzzyFileSearchSession({
        roots,
        onUpdated: (notification): void => {
          if (activeSessionTokenRef.current !== sessionToken) {
            return;
          }
          setFiles(notification.files);
          setIsLoading(true);
        },
        onCompleted: (): void => {
          if (activeSessionTokenRef.current !== sessionToken) {
            return;
          }
          setIsLoading(false);
        },
      });

      const trackedSessionPromise = sessionPromise.catch((error) => {
        if (fuzzySearchSessionPromiseRef.current === trackedSessionPromise) {
          fuzzySearchSessionPromiseRef.current = null;
        }
        if (activeSessionTokenRef.current === sessionToken) {
          activeSessionTokenRef.current = null;
        }
        throw error;
      });
      fuzzySearchSessionPromiseRef.current = trackedSessionPromise;
      return trackedSessionPromise;
    },
  );

  const stopFuzzySearchSession = useEffectEvent(async (): Promise<void> => {
    const sessionPromise = fuzzySearchSessionPromiseRef.current;
    if (sessionPromise == null) {
      return;
    }

    fuzzySearchSessionPromiseRef.current = null;
    activeSessionTokenRef.current = null;
    const session = await sessionPromise;
    await session.stop();
  });

  useEffect(() => {
    setFiles(null);
    setIsLoading(false);

    return (): void => {
      void stopFuzzySearchSession().catch((error) => {
        logger.warning("Failed to close fuzzy file search session", {
          safe: {},
          sensitive: {
            error,
          },
        });
      });
    };
  }, [mcpManager, rootsKey]);

  useEffect(() => {
    let cancelled = false;
    const runSearch = async (): Promise<void> => {
      if (query.length === 0) {
        setFiles(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const session = await getOrStartFuzzySearchSession();
        if (cancelled) {
          return;
        }
        await session.update(query);
      } catch (error) {
        if (!cancelled) {
          logger.error(`Error fetching fuzzy file search`, {
            safe: {},
            sensitive: {
              error,
            },
          });
          setIsLoading(false);
        }
      }
    };
    void runSearch();

    return (): void => {
      cancelled = true;
    };
  }, [query, rootsKey]);

  return {
    files,
    isLoading,
  };
};

function formatFuzzySearchFileResult(
  { file_name: fileName, path: relativeFilePath, root }: FuzzyFileSearchResult,
  includeWorkspaceRootLabel: boolean,
  isWindowsHost: boolean,
): FormattedFile {
  const formattedRelativeFilePath = formatRelativeFilePath({
    root,
    relativePath: relativeFilePath,
    includeWorkspaceRootLabel,
  });
  const lastSlashIndex = formattedRelativeFilePath.lastIndexOf("/");
  return {
    label: fileName,
    path: includeWorkspaceRootLabel
      ? getHostFilePath(root, relativeFilePath, isWindowsHost)
      : formattedRelativeFilePath,
    relativePathWithoutFileName: formattedRelativeFilePath.substring(
      0,
      lastSlashIndex,
    ),
    fsPath: getHostFilePath(root, relativeFilePath, isWindowsHost),
  };
}

function sortFilesByQuery(
  files: Array<FormattedFile>,
  query: string,
): Array<FormattedFile> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) {
    return files;
  }

  return sortBy(
    files.map((file, index) => ({
      file,
      score: scoreQueryMatch(file.label, trimmedQuery),
      index,
    })),
    [
      (entry): number => -entry.score,
      (entry): string => entry.file.label,
      (entry): number => entry.index,
    ],
  ).map((entry) => entry.file);
}
