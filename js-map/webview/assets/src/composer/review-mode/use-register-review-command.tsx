import type { GitCwd, HostConfig } from "protocol";
import { type ReactElement, useMemo } from "react";
import { useIntl } from "react-intl";

import BugIcon from "@/icons/bug.svg";
import { useGitRootForCwd } from "@/utils/git-root";

import { useProvideSlashCommand } from "../slash-commands/slash-command";
import { ReviewModeContent } from "./review-mode-content";

export function ReviewSlashCommand({
  cwd,
  hostConfig,
}: {
  cwd: GitCwd;
  hostConfig: HostConfig;
}): null {
  const intl = useIntl();
  const { gitRoot } = useGitRootForCwd(cwd);
  const Content = useMemo(() => {
    function ReviewSlashCommandContent({
      onItemsChanged,
      onClose,
    }: {
      onItemsChanged: () => void;
      onClose: () => void;
    }): ReactElement {
      return (
        <ReviewModeContent
          onItemsChanged={onItemsChanged}
          onClose={onClose}
          cwd={cwd}
          hostConfig={hostConfig}
        />
      );
    }

    return ReviewSlashCommandContent;
  }, [cwd, hostConfig]);

  useProvideSlashCommand({
    id: "review-mode",
    title: intl.formatMessage({
      id: "composer.reviewMode.title",
      defaultMessage: "Code review",
      description: "Title for the review mode slash command",
    }),
    requiresEmptyComposer: true,
    Icon: BugIcon,
    Content,
    enabled: !!gitRoot,
    dependencies: [cwd, gitRoot, hostConfig.id],
  });

  return null;
}
