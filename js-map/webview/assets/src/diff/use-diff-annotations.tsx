import type { AnnotationSide, DiffLineAnnotation } from "@pierre/diffs";
import type {
  CommentInputItem,
  LocalOrRemoteConversationId,
  ReviewFindingComment,
} from "protocol";
import type React from "react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { parseCodeCommentFromComment } from "@/code-comment-directives";
import { FindingCard } from "@/code-review-finding-card";
import { normalizePath } from "@/utils/path";
import { useDiffCommentDrafts } from "@/utils/use-diff-comment-drafts";

import { CodeDiffComment } from "./code-diff-comment";
import {
  type CommentAnnotationMetadata,
  type DraftInfo,
  buildAnnotationKey,
} from "./diff-annotations";
import { matchesCommentPath } from "./diff-file-utils";

export function useDiffAnnotations({
  diffPath,
  workspaceRoot,
  enableComments,
  comments,
  modelComments,
  onCommentsChange,
  conversationId,
  includeDismissed = true,
}: {
  diffPath: string;
  workspaceRoot?: string;
  enableComments: boolean;
  comments?: Array<CommentInputItem>;
  modelComments?: Array<ReviewFindingComment>;
  onCommentsChange?: (comments: Array<CommentInputItem>) => void;
  conversationId?: LocalOrRemoteConversationId;
  includeDismissed?: boolean;
}): {
  annotations: Array<DiffLineAnnotation<CommentAnnotationMetadata>>;
  annotationKeys: Set<string>;
  addDraftComment: (params: {
    lineNumber: number;
    side: AnnotationSide;
    startLine?: number;
    localDiffHunk?: string;
  }) => void;
  renderCommentAnnotation: (
    annotation: DiffLineAnnotation<CommentAnnotationMetadata>,
  ) => React.ReactNode;
} {
  const instanceId = useId();

  const unsavedKeysRef = useRef<Set<string>>(new Set<string>());

  const { updateDrafts } = useDiffCommentDrafts(conversationId ?? null);

  useEffect(() => {
    if (!conversationId) {
      return;
    }
    const unsavedKeys = unsavedKeysRef.current;
    return (): void => {
      if (unsavedKeys.size === 0) {
        return;
      }
      updateDrafts((prevDrafts) => {
        const nextDrafts = { ...prevDrafts };
        let changed = false;
        for (const key of unsavedKeys) {
          if (key in nextDrafts) {
            changed = true;
            delete nextDrafts[key];
          }
        }
        if (!changed) {
          return prevDrafts;
        }
        return nextDrafts;
      });
      unsavedKeys.clear();
    };
  }, [conversationId, updateDrafts]);

  const [draftComments, setDraftComments] = useState<Record<string, DraftInfo>>(
    {},
  );

  const resolvedModelComments = useMemo(() => {
    const source = modelComments ?? [];
    if (includeDismissed) {
      return source;
    }
    return source.filter(
      (comment): boolean => comment.reviewFindingStatus !== "dismissed",
    );
  }, [includeDismissed, modelComments]);

  const commentAnnotations: Array<
    DiffLineAnnotation<CommentAnnotationMetadata>
  > = useMemo(() => {
    if (!enableComments) {
      return [];
    }
    const userComments = (comments ?? []).map(
      (comment): { comment: CommentInputItem; source: "user" } => ({
        comment,
        source: "user",
      }),
    );
    const reviewComments = resolvedModelComments.map(
      (comment): { comment: CommentInputItem; source: "model" } => ({
        comment,
        source: "model",
      }),
    );
    const allComments = [...userComments, ...reviewComments];
    if (allComments.length === 0) {
      return [];
    }
    return allComments
      .filter(({ comment }): boolean =>
        matchesCommentPath(comment.position.path, diffPath, workspaceRoot),
      )
      .map(
        ({
          comment,
          source,
        }): DiffLineAnnotation<CommentAnnotationMetadata> => ({
          side: comment.position.side === "left" ? "deletions" : "additions",
          lineNumber: comment.position.line,
          metadata: { kind: "comment", comment, source },
        }),
      );
  }, [
    comments,
    diffPath,
    enableComments,
    resolvedModelComments,
    workspaceRoot,
  ]);

  const draftAnnotations: Array<DiffLineAnnotation<CommentAnnotationMetadata>> =
    useMemo(
      () =>
        Object.entries(draftComments).map(
          ([key, value]): DiffLineAnnotation<CommentAnnotationMetadata> => ({
            side: value.side,
            lineNumber: value.lineNumber,
            metadata: {
              kind: "draft-comment",
              key,
              path: value.path,
              startLine: value.startLine,
              localDiffHunk: value.localDiffHunk,
            },
          }),
        ),
      [draftComments],
    );

  const annotations: Array<DiffLineAnnotation<CommentAnnotationMetadata>> =
    useMemo(() => {
      if (!enableComments) {
        return [];
      }
      return [...commentAnnotations, ...draftAnnotations];
    }, [commentAnnotations, draftAnnotations, enableComments]);

  const annotationKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const annotation of commentAnnotations) {
      keys.add(buildAnnotationKey(annotation.side, annotation.lineNumber));
    }
    for (const [key] of Object.entries(draftComments)) {
      keys.add(key);
    }
    return keys;
  }, [commentAnnotations, draftComments]);

  const addDraftComment = useCallback(
    ({
      lineNumber,
      side,
      startLine,
      localDiffHunk,
    }: {
      lineNumber: number;
      side: AnnotationSide;
      startLine?: number;
      localDiffHunk?: string;
    }) => {
      if (!enableComments) {
        return;
      }
      const key = buildAnnotationKey(side, lineNumber);
      setDraftComments((prev) => {
        if (prev[key]) {
          return prev;
        }
        const normalizedPath = normalizePath(diffPath);
        return {
          ...prev,
          [key]: {
            side,
            lineNumber,
            path: normalizedPath,
            ...(startLine != null && startLine !== lineNumber
              ? { startLine }
              : {}),
            ...(localDiffHunk != null ? { localDiffHunk } : {}),
          },
        };
      });
    },
    [diffPath, enableComments],
  );

  const removeDraft = useCallback((key: string) => {
    setDraftComments((prev) => {
      if (!(key in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const renderCommentAnnotation = useCallback(
    (annotation: DiffLineAnnotation<CommentAnnotationMetadata>) => {
      function setDraftKey(key: string, hasUnsavedChanges: boolean): void {
        if (!conversationId) {
          return;
        }
        if (hasUnsavedChanges) {
          updateDrafts((prevDrafts) => {
            if (key in prevDrafts) {
              return prevDrafts;
            }
            return { ...prevDrafts, [key]: true };
          });
          unsavedKeysRef.current.add(key);
          return;
        }
        updateDrafts((prevDrafts) => {
          if (!(key in prevDrafts)) {
            return prevDrafts;
          }
          const nextDrafts = { ...prevDrafts };
          delete nextDrafts[key];
          return nextDrafts;
        });
        unsavedKeysRef.current.delete(key);
      }

      const metadata = annotation.metadata;
      if (!metadata) {
        return null;
      }
      const unsavedKey = buildUnsavedKey({
        instanceId,
        path:
          metadata.kind === "comment"
            ? metadata.comment.position.path
            : metadata.path,
        side: annotation.side,
        lineNumber: annotation.lineNumber,
      });

      switch (metadata.kind) {
        case "comment": {
          if (metadata.source === "model") {
            const finding = parseCodeCommentFromComment(metadata.comment);
            if (finding && conversationId != null) {
              return (
                <div className="w-full max-w-none min-w-0 gap-2 p-1.5 font-sans whitespace-normal">
                  <FindingCard
                    finding={finding}
                    conversationId={conversationId}
                    showLocation={false}
                    buttonSize="composerSm"
                  />
                </div>
              );
            }
            return (
              <CodeDiffComment
                filePath={metadata.comment.position.path}
                workspaceRoot={workspaceRoot}
                side={annotation.side}
                lineNumber={annotation.lineNumber}
                initialComment={metadata.comment}
                readOnly
                onSubmit={(): void => {
                  /* no-op */
                }}
              />
            );
          }
          return (
            <CodeDiffComment
              filePath={metadata.comment.position.path}
              workspaceRoot={workspaceRoot}
              side={annotation.side}
              lineNumber={annotation.lineNumber}
              initialComment={metadata.comment}
              onUnsavedChange={(hasUnsavedChanges): void => {
                setDraftKey(unsavedKey, hasUnsavedChanges);
              }}
              onSubmit={(updated): void => {
                setDraftKey(unsavedKey, false);
                const currentComments = comments ?? [];
                const nextComments = currentComments.map(
                  (comment): CommentInputItem =>
                    comment === metadata.comment ? updated : comment,
                );
                onCommentsChange?.(nextComments);
              }}
              onDelete={(): void => {
                setDraftKey(unsavedKey, false);
                onCommentsChange?.(
                  comments?.filter(
                    (comment): boolean => comment !== metadata.comment,
                  ) ?? [],
                );
              }}
            />
          );
        }
        case "draft-comment":
          return (
            <CodeDiffComment
              filePath={metadata.path}
              workspaceRoot={workspaceRoot}
              side={annotation.side}
              lineNumber={annotation.lineNumber}
              startLine={metadata.startLine}
              localDiffHunk={metadata.localDiffHunk}
              onUnsavedChange={(hasUnsavedChanges): void => {
                setDraftKey(unsavedKey, hasUnsavedChanges);
              }}
              onSubmit={(comment): void => {
                setDraftKey(unsavedKey, false);
                onCommentsChange?.([...(comments ?? []), comment]);
                removeDraft(metadata.key);
              }}
              onClose={(): void => {
                setDraftKey(unsavedKey, false);
                removeDraft(metadata.key);
              }}
            />
          );
      }
    },
    [
      comments,
      conversationId,
      instanceId,
      onCommentsChange,
      removeDraft,
      updateDrafts,
      workspaceRoot,
    ],
  );

  return {
    annotations,
    annotationKeys,
    addDraftComment,
    renderCommentAnnotation,
  };
}

function buildUnsavedKey({
  instanceId,
  path,
  side,
  lineNumber,
}: {
  instanceId: string;
  path: string;
  side: AnnotationSide;
  lineNumber: number;
}): string {
  const normalizedPath = normalizePath(path);
  return `${instanceId}::${normalizedPath}::${buildAnnotationKey(
    side,
    lineNumber,
  )}`;
}
