import type { AnnotationSide } from "@pierre/diffs";
import clsx from "clsx";
import type { CommentInputItem } from "protocol";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
  type RefObject,
} from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { AtMentionList } from "@/composer/at-mention-list";
import { useAtMentionSections } from "@/composer/use-at-mention-sections";
import { useAtMentionAutocomplete } from "@/composer/use-file-mention-autocomplete";
import {
  addTransactionListener,
  createPromptEditorController,
  RichTextInput,
  SkillMentionAutocompleteOverlay,
  useSkillMentionAutocomplete,
} from "@/prompt-editor";
import { useEnabledInstalledApps } from "@/queries/apps-queries";
import { useSkills } from "@/skills/use-skills";
import { useDebouncedValue } from "@/utils/use-debounced-value";
import { useFetchFromVSCode } from "@/vscode-api";

import "prosemirror-view/style/prosemirror.css";
import { Button } from "../components/button";
import { CodeDiffCommentOverlay } from "./code-diff-comment-overlay";
import { getCommentText } from "./diff-file-utils";

const COMMENT_EDITOR_INPUT_CLASSNAME = clsx(
  "text-token-text-primary leading-normal font-sans min-h-10 w-full p-0",
  "[&_.ProseMirror]:w-full",
  "[&_.ProseMirror]:leading-normal",
  "[&_.ProseMirror]:font-sans",
  "[&_.ProseMirror]:px-0",
  "[&_.ProseMirror]:py-0",
);

export function CodeDiffComment({
  filePath,
  workspaceRoot,
  side,
  lineNumber,
  startLine,
  localDiffHunk,
  onSubmit,
  onDelete,
  onClose,
  initialComment,
  onUnsavedChange,
  readOnly = false,
}: {
  filePath: string;
  workspaceRoot?: string;
  side: AnnotationSide;
  lineNumber: number;
  startLine?: number;
  localDiffHunk?: string;
  onSubmit: (comment: CommentInputItem) => void;
  onDelete?: () => void;
  onClose?: () => void;
  initialComment?: CommentInputItem;
  onUnsavedChange?: (hasUnsavedChanges: boolean) => void;
  readOnly?: boolean;
}): React.ReactNode {
  const initialCommentText = initialComment
    ? getCommentText(initialComment)
    : "";
  const resolvedStartLine =
    initialComment?.position.start_line ?? startLine ?? lineNumber;
  const resolvedEndLine = initialComment?.position.line ?? lineNumber;
  const showRangeLabel = resolvedStartLine !== resolvedEndLine;
  const [commentText, setCommentText] = useState(initialCommentText);
  const [showButtons, setShowButtons] = useState(!initialComment && !readOnly);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousUnsavedRef = useRef<boolean | null>(null);
  const hadInitialCommentRef = useRef(initialComment != null);
  const intl = useIntl();
  const commentEditor = useMemo(
    () =>
      createPromptEditorController("", {
        defaultTextKind: "prompt",
        enableFileMentions: true,
        enableSkillMentions: true,
        enterBehavior: "newline",
      }),
    [],
  );
  const destroyCommentEditor = useCallback(() => {
    if (!commentEditor.view.isDestroyed) {
      commentEditor.destroy();
    }
  }, [commentEditor]);
  useDeferredCleanup(destroyCommentEditor);

  const handleContainerPointerDownCapture = (
    event: PointerEvent<HTMLDivElement>,
  ): void => {
    if (readOnly) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }
    if (target.closest(".ProseMirror,button,input,select,a,[role='button']")) {
      return;
    }
    event.preventDefault();
    commentEditor.focus();
  };

  useEffect(() => {
    if (commentEditor.getText() === initialCommentText) {
      setCommentText((currentCommentText) => {
        if (currentCommentText === initialCommentText) {
          return currentCommentText;
        }
        return initialCommentText;
      });
      return;
    }
    commentEditor.setPromptText(initialCommentText);
    setCommentText(initialCommentText);
  }, [commentEditor, initialCommentText]);

  useEffect(() => {
    const hasInitialComment = initialComment != null;
    if (!hadInitialCommentRef.current && hasInitialComment) {
      setShowButtons(false);
      (commentEditor.view.dom as HTMLElement).blur();
    }
    hadInitialCommentRef.current = hasInitialComment;
  }, [commentEditor, initialComment]);

  let hasUnsavedChanges = false;
  if (!readOnly) {
    if (initialComment) {
      hasUnsavedChanges = commentText !== initialCommentText;
    } else {
      hasUnsavedChanges = commentText.trim().length > 0;
    }
  }

  useEffect(() => {
    if (!onUnsavedChange) {
      return;
    }
    const previous = previousUnsavedRef.current;
    if (previous === hasUnsavedChanges) {
      return;
    }
    previousUnsavedRef.current = hasUnsavedChanges;
    onUnsavedChange(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChange]);

  const handleSubmit = (): void => {
    if (readOnly) {
      return;
    }
    if (!commentText) {
      return;
    }

    const commentToSubmit: CommentInputItem = initialComment
      ? {
          ...initialComment,
          content: [{ content_type: "text", text: commentText }],
        }
      : {
          type: "comment",
          content: [{ content_type: "text", text: commentText }],
          position: {
            side: side === "deletions" ? "left" : "right",
            path: filePath,
            line: lineNumber,
            ...(startLine != null && startLine !== lineNumber
              ? { start_line: startLine }
              : {}),
          },
          ...(localDiffHunk != null ? { localDiffHunk } : {}),
        };
    onSubmit?.(commentToSubmit);
    setShowButtons(false);
    (commentEditor.view.dom as HTMLElement).blur();
    onClose?.();
  };

  return (
    <div ref={containerRef} className="gap-2 p-1.5 font-sans">
      <div
        className="flex w-full cursor-text flex-col gap-2 rounded-xl border border-token-input-border bg-token-input-background p-3 shadow-sm"
        onPointerDownCapture={handleContainerPointerDownCapture}
      >
        {showRangeLabel ? (
          <div className="text-[11px] leading-4 font-medium text-token-description-foreground">
            <FormattedMessage
              id="code.diffComment.lineRange"
              defaultMessage="Lines {startLine}-{endLine}"
              description="Range label shown on a diff comment that applies to multiple selected lines"
              values={{
                endLine: resolvedEndLine,
                startLine: resolvedStartLine,
              }}
            />
          </div>
        ) : null}
        {readOnly ? (
          <ReadOnlyCommentEditor
            commentEditor={commentEditor}
            placeholder={intl.formatMessage({
              id: "code.diff.requestChange",
              defaultMessage: "Request change",
              description: "Placeholder for code diff request change",
            })}
          />
        ) : (
          <EditableCommentEditor
            commentEditor={commentEditor}
            commentText={commentText}
            initialComment={initialComment}
            initialCommentText={initialCommentText}
            workspaceRoot={workspaceRoot}
            containerRef={containerRef}
            onTextChange={setCommentText}
            onEscape={onClose}
            onSubmit={handleSubmit}
            onShowButtons={() => {
              setShowButtons(true);
            }}
            onHideButtons={() => {
              setShowButtons(false);
            }}
            placeholder={intl.formatMessage({
              id: "code.diff.requestChange",
              defaultMessage: "Request change",
              description: "Placeholder for code diff request change",
            })}
          />
        )}

        {showButtons && !readOnly && (
          <div
            className={clsx(
              "mt-2 flex items-center justify-between gap-2",
              !onDelete && "justify-end",
            )}
          >
            {onDelete && (
              <Button
                color="danger"
                size="toolbar"
                onClick={() => onDelete?.()}
              >
                <FormattedMessage
                  id="code.diffComment.delete"
                  defaultMessage="Delete"
                  description="Delete a comment"
                />
              </Button>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button
                color="ghost"
                size="toolbar"
                onClick={() => {
                  onClose?.();
                  setShowButtons(false);
                  if (initialComment) {
                    setCommentText(initialCommentText);
                    commentEditor.setPromptText(initialCommentText);
                  }
                }}
              >
                <FormattedMessage
                  id="code.diffComment.cancel"
                  defaultMessage="Cancel"
                  description="Cancel a comment"
                />
              </Button>

              <Button
                color="primary"
                size="toolbar"
                disabled={!commentText}
                onClick={handleSubmit}
              >
                {initialComment ? (
                  <FormattedMessage
                    id="code.diffComment.save"
                    defaultMessage="Save"
                    description="Save a comment"
                  />
                ) : (
                  <FormattedMessage
                    id="code.diffComment.comment"
                    defaultMessage="Comment"
                    description="Comment on a code diff"
                  />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReadOnlyCommentEditor({
  commentEditor,
  placeholder,
}: {
  commentEditor: ReturnType<typeof createPromptEditorController>;
  placeholder: string;
}): React.ReactElement {
  useEffect(() => {
    if (commentEditor.view.isDestroyed) {
      return;
    }
    commentEditor.view.setProps({
      editable: (): boolean => false,
    });
  }, [commentEditor]);

  return (
    <RichTextInput
      className={COMMENT_EDITOR_INPUT_CLASSNAME}
      composerController={commentEditor}
      disableAutoFocus
      placeholder={placeholder}
      onSubmit={() => {}}
    />
  );
}

function EditableCommentEditor({
  commentEditor,
  commentText,
  initialComment,
  initialCommentText,
  workspaceRoot,
  containerRef,
  onTextChange,
  onEscape,
  onSubmit,
  onShowButtons,
  onHideButtons,
  placeholder,
}: {
  commentEditor: ReturnType<typeof createPromptEditorController>;
  commentText: string;
  initialComment?: CommentInputItem;
  initialCommentText: string;
  workspaceRoot?: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onTextChange: (text: string) => void;
  onEscape?: () => void;
  onSubmit: () => void;
  onShowButtons: () => void;
  onHideButtons: () => void;
  placeholder: string;
}): React.ReactElement {
  const editorOverlayAnchorRef = useRef<HTMLDivElement>(null);
  const mentionRoots = useMentionRoots(workspaceRoot);
  const mentionAutocomplete = useAtMentionAutocomplete(commentEditor);
  const { sections: atMentionSections } = useAtMentionSections({
    query: mentionAutocomplete.ui?.query ?? "",
    roots: mentionRoots ?? [],
  });
  const skillMentionAutocomplete = useSkillMentionAutocomplete(commentEditor);
  const debouncedSkillMentionQuery = useDebouncedValue(
    skillMentionAutocomplete.ui?.query ?? "",
    100,
  );
  const atMentionPlacement = useInlineCommentOverlayPlacement({
    anchorRef: editorOverlayAnchorRef,
    isActive: mentionAutocomplete.ui?.active ?? false,
  });
  const skillMentionPlacement = useInlineCommentOverlayPlacement({
    anchorRef: editorOverlayAnchorRef,
    isActive: skillMentionAutocomplete.ui?.active ?? false,
  });
  const availableApps = useEnabledInstalledApps();
  const { skills: availableSkills } = useSkills(mentionRoots);

  useEffect(() => {
    return addTransactionListener(commentEditor.view, () => {
      onTextChange(commentEditor.getText());
    });
  }, [commentEditor, onTextChange]);

  useEffect(() => {
    commentEditor.syncMentionMetadata({
      skills: availableSkills,
      apps: availableApps,
    });
  }, [availableApps, availableSkills, commentEditor]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }
      if (event.defaultPrevented) {
        return;
      }
      event.preventDefault();
      onEscape?.();
    };
    const editorDom = commentEditor.view.dom;
    editorDom.addEventListener("keydown", handleKeyDown);
    return (): void => {
      editorDom.removeEventListener("keydown", handleKeyDown);
    };
  }, [commentEditor, onEscape]);

  return (
    <div
      ref={editorOverlayAnchorRef}
      className="relative"
      onFocus={onShowButtons}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget as Node | null;
        if (
          initialComment &&
          commentText === initialCommentText &&
          (!nextTarget || !containerRef.current?.contains(nextTarget))
        ) {
          onHideButtons();
        }
      }}
    >
      <CodeDiffCommentOverlay
        anchorRef={editorOverlayAnchorRef}
        isActive={mentionAutocomplete.ui?.active ?? false}
        placement={atMentionPlacement}
      >
        <div
          className={clsx(
            "left-0 right-0 z-[60]",
            atMentionPlacement === "top" ? "-translate-y-full" : "",
          )}
        >
          <AtMentionList
            sections={atMentionSections}
            onUpdateSelectedMention={mentionAutocomplete.setSelectedMention}
            onAddContext={mentionAutocomplete.addMention}
          />
        </div>
      </CodeDiffCommentOverlay>
      <SkillMentionAutocompleteOverlay
        autocomplete={skillMentionAutocomplete}
        query={debouncedSkillMentionQuery}
        roots={mentionRoots}
        anchorRef={editorOverlayAnchorRef}
        placement={skillMentionPlacement}
        zIndexClassName="z-[60]"
      />
      <RichTextInput
        className={COMMENT_EDITOR_INPUT_CLASSNAME}
        composerController={commentEditor}
        disableAutoFocus={!!initialComment}
        placeholder={placeholder}
        onMentionHandler={mentionAutocomplete.handleMentionEvent}
        onSkillMentionHandler={skillMentionAutocomplete.handleMentionEvent}
        onSubmit={onSubmit}
      />
    </div>
  );
}

function useMentionRoots(workspaceRoot?: string): Array<string> | undefined {
  const { data: workspaceRootOptions } = useFetchFromVSCode(
    "workspace-root-options",
  );

  return useMemo<Array<string> | undefined>(() => {
    if (workspaceRoot != null) {
      return [workspaceRoot];
    }
    return workspaceRootOptions?.roots;
  }, [workspaceRoot, workspaceRootOptions?.roots]);
}

function useInlineCommentOverlayPlacement({
  anchorRef,
  isActive,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  isActive: boolean;
}): "top" | "bottom" {
  const subscribePlacement = useCallback(
    (onStoreChange: () => void): (() => void) => {
      if (!isActive || typeof window === "undefined") {
        return (): void => {};
      }
      window.addEventListener("resize", onStoreChange);
      window.addEventListener("scroll", onStoreChange, true);
      return (): void => {
        window.removeEventListener("resize", onStoreChange);
        window.removeEventListener("scroll", onStoreChange, true);
      };
    },
    [isActive],
  );

  return useSyncExternalStore(
    subscribePlacement,
    () => {
      return getInlineCommentOverlayPlacement({
        anchorRef,
      });
    },
    () => "bottom",
  );
}

function getInlineCommentOverlayPlacement({
  anchorRef,
}: {
  anchorRef: RefObject<HTMLElement | null>;
}): "top" | "bottom" {
  if (typeof window === "undefined") {
    return "bottom";
  }

  const anchorElement = anchorRef.current;
  if (anchorElement == null) {
    return "bottom";
  }

  const anchorRect = anchorElement.getBoundingClientRect();
  const spaceAbove = anchorRect.top;
  const spaceBelow = window.innerHeight - anchorRect.bottom;

  if (spaceBelow < 240 && spaceAbove > spaceBelow) {
    return "top";
  }

  return "bottom";
}

function useDeferredCleanup(cleanup: () => void): void {
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    return (): void => {
      // Defer cleanup so React Strict Mode's dev-only unmount/remount cycle can
      // cancel this cleanup before it runs.
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        cleanup();
      }, 0);
    };
  }, [cleanup]);
}
