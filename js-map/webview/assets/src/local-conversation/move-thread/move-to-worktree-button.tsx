import type { ConversationId, GitCwd } from "protocol";
import { useState, type ReactElement } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { Spinner } from "@/components/spinner";
import { Tooltip } from "@/components/tooltip";
import ExclamationMarkCircleIcon from "@/icons/exclamation-mark-circle.svg";
import SortIcon from "@/icons/sort.svg";

import { MoveToWorktreeDialog } from "./move-to-worktree-dialog";
import {
  useThreadHandoffActions,
  useThreadHandoffForConversation,
} from "./thread-handoff-store";

export function MoveToWorktreeButton({
  conversationId,
  conversationTitle,
  currentBranch,
  cwd,
  disabled,
}: {
  conversationId: ConversationId;
  conversationTitle: string | null;
  currentBranch: string;
  cwd: GitCwd;
  disabled: boolean;
}): ReactElement {
  const intl = useIntl();
  const [isOpen, setIsOpen] = useState(false);
  const operation = useThreadHandoffForConversation(conversationId);
  const { openOperation } = useThreadHandoffActions();
  const progressTooltip = intl.formatMessage({
    id: "localConversation.threadHandoff.tooltip.viewProgress",
    defaultMessage: "View progress",
    description:
      "Tooltip shown when a thread handoff is in progress and the button reopens the progress view",
  });
  const handoffButtonLabel = intl.formatMessage({
    id: "localConversation.moveToWorktree.label",
    defaultMessage: "Hand off",
    description:
      "Button label for moving a local conversation to a new worktree",
  });
  const disabledReason =
    operation == null && disabled
      ? intl.formatMessage({
          id: "localConversation.moveThread.disabled.turnInProgress",
          defaultMessage: "You cannot move a thread while it is in progress",
          description:
            "Tooltip shown when moving a thread is disabled because a turn is in progress",
        })
      : null;

  return (
    <>
      <Tooltip
        tooltipContent={
          operation?.status === "queued" || operation?.status === "running"
            ? progressTooltip
            : disabledReason
        }
      >
        <Button
          aria-label={handoffButtonLabel}
          color="outline"
          size="toolbar"
          disabled={operation == null && disabled}
          onClick={() => {
            if (operation != null) {
              openOperation(operation.id);
              return;
            }
            setIsOpen(true);
          }}
        >
          <span className="flex items-center gap-1.5">
            {operation?.status === "queued" ||
            operation?.status === "running" ? (
              <Spinner className="icon-xs" />
            ) : operation?.status === "error" ? (
              <ExclamationMarkCircleIcon className="icon-xs text-token-danger" />
            ) : operation?.hasUnseenTerminalState &&
              operation.status === "warning" ? (
              <ExclamationMarkCircleIcon className="icon-xs text-token-editor-warning-foreground" />
            ) : (
              <SortIcon className="icon-xs rotate-90" />
            )}
            <span className="max-[920px]:hidden">
              <FormattedMessage
                id="localConversation.moveToWorktree.label"
                defaultMessage="Hand off"
                description="Button label for moving a local conversation to a new worktree"
              />
            </span>
          </span>
        </Button>
      </Tooltip>
      <MoveToWorktreeDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        conversationId={conversationId}
        conversationTitle={conversationTitle}
        currentBranch={currentBranch}
        cwd={cwd}
      />
    </>
  );
}
