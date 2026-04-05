import type { AnnotationSide } from "@pierre/diffs";
import type { CommentInputItem } from "protocol";

export type DraftInfo = {
  side: AnnotationSide;
  lineNumber: number;
  path: string;
  startLine?: number;
  localDiffHunk?: string;
};

export type CommentAnnotationMetadata =
  | { kind: "comment"; comment: CommentInputItem; source: "user" | "model" }
  | {
      kind: "draft-comment";
      key: string;
      path: string;
      startLine?: number;
      localDiffHunk?: string;
    };

export type HunkActionAnnotationMetadata = {
  kind: "hunk-actions";
  path: string;
  hunkIndex: number;
};

export type AnnotationMetadata =
  | CommentAnnotationMetadata
  | HunkActionAnnotationMetadata;

export const buildAnnotationKey = (
  side: AnnotationSide,
  lineNumber: number,
): string => `${side}:${lineNumber}`;
