import type {
  CommentInputItem,
  LocalOrRemoteConversationId,
  ReviewFindingComment,
  SharedObjectValue,
} from "protocol";
import { z } from "zod";

import type { CodeReviewFinding } from "@/code-review-schema";
import {
  formatCommentLineRange,
  getCommentLineRange,
  getCommentText,
  getProjectRelativePath,
} from "@/diff/diff-file-utils";
import { extractDirectives } from "@/directives/parse-directives";
import { CODE_COMMENT_DIRECTIVE_NAME } from "@/markdown-directives/codex-remark-directive";

const PRIORITY_TITLE_PATTERN =
  /^(?:<sub>\s*)*\[(p\d)\](?:\s*<\/sub>)*\s*(.*)$/i;

function parseDirectiveNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return undefined;
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function parseDirectiveInt(value: unknown): number | undefined {
  const parsed = parseDirectiveNumber(value);
  return parsed == null ? undefined : Math.trunc(parsed);
}

const optionalDirectiveNumber = z
  .preprocess(
    (value): number | undefined => parseDirectiveNumber(value),
    z.number().finite(),
  )
  .optional();

const optionalDirectiveInt = z
  .preprocess(
    (value): number | undefined => parseDirectiveInt(value),
    z.number().int(),
  )
  .optional();

const codeCommentDirectiveSchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
  file: z.string().trim().min(1),
  priority: optionalDirectiveInt,
  confidence: optionalDirectiveNumber,
  start: optionalDirectiveInt,
  end: optionalDirectiveInt,
});

export function parsePriorityTitle(title: string): {
  priority: string | null;
  rest: string;
} {
  const match = title.match(PRIORITY_TITLE_PATTERN);
  if (!match) {
    return { priority: null, rest: title };
  }
  return { priority: match[1].toUpperCase(), rest: match[2].trim() };
}

function normalizeTitle(title: string, priority: number | undefined): string {
  if (priority != null && parsePriorityTitle(title).priority == null) {
    return `[P${priority}] ${title}`;
  }
  return title;
}

export function parseCodeComment(
  attributes: Record<string, unknown> | null | undefined,
): CodeReviewFinding | null {
  const parsed = codeCommentDirectiveSchema.safeParse(attributes ?? {});
  if (!parsed.success) {
    return null;
  }
  const { title, body, file, priority, confidence, start, end } = parsed.data;
  const startLine = Math.max(1, start ?? 1);
  const endLine = Math.max(1, end ?? startLine);

  return {
    title: normalizeTitle(title, priority),
    body,
    confidence_score: confidence ?? 0,
    ...(priority != null ? { priority } : {}),
    code_location: {
      absolute_file_path: file,
      line_range: {
        start: startLine,
        end: endLine < startLine ? startLine : endLine,
      },
    },
  };
}

export function parseCodeCommentFindings(
  markdown: string,
): Array<CodeReviewFinding> {
  if (markdown.trim().length === 0) {
    return [];
  }

  const directives = extractDirectives(markdown);
  const findings: Array<CodeReviewFinding> = [];
  for (const directive of directives) {
    if (directive.name !== CODE_COMMENT_DIRECTIVE_NAME) {
      continue;
    }
    const finding = parseCodeComment(directive.attributes);
    if (finding) {
      findings.push(finding);
    }
  }
  return findings;
}

export function upsertDiffComments(
  existing: Array<ReviewFindingComment>,
  findings: Array<CodeReviewFinding>,
  workspaceRoot?: string | null,
): Array<ReviewFindingComment> {
  if (findings.length === 0) {
    return existing;
  }

  const incoming: Array<ReviewFindingComment> = [];
  for (const finding of findings) {
    const comment = buildCodeComment(finding, workspaceRoot);
    if (comment) {
      incoming.push({ ...comment, reviewFindingStatus: "added" });
    }
  }
  if (incoming.length === 0) {
    return existing;
  }

  const merged = [...existing];
  const seenKeys = new Set<string>();
  for (const comment of existing) {
    seenKeys.add(buildDiffCommentKey(comment));
  }

  let didAppend = false;
  for (const comment of incoming) {
    const key = buildDiffCommentKey(comment);
    if (seenKeys.has(key)) {
      continue;
    }
    seenKeys.add(key);
    merged.push(comment);
    didAppend = true;
  }

  if (!didAppend) {
    return existing;
  }
  return merged;
}

export function updateCodeCommentStore({
  conversationId,
  findings,
  workspaceRoot,
  setDiffComments,
}: {
  conversationId: LocalOrRemoteConversationId;
  findings: Array<CodeReviewFinding>;
  workspaceRoot?: string | null;
  setDiffComments: (
    updater: (
      prev: SharedObjectValue<"diff_comments_from_model"> | undefined,
    ) => SharedObjectValue<"diff_comments_from_model"> | undefined,
  ) => void;
}): void {
  if (findings.length === 0) {
    return;
  }
  setDiffComments((prev) => {
    const next = { ...prev };
    const prevCurrent = next[conversationId] ?? [];
    const nextMerged = upsertDiffComments(prevCurrent, findings, workspaceRoot);
    if (nextMerged.length === prevCurrent.length) {
      return prev;
    }
    next[conversationId] = nextMerged;
    return next;
  });
}

export function buildDiffCommentKey(comment: CommentInputItem): string {
  const position = comment.position;
  const text = getCommentText(comment);
  return `${position.path}|${position.side}|${formatCommentLineRange(comment)}|${text}`;
}

export function buildCodeCommentPromptData(
  comments: Array<ReviewFindingComment> | undefined,
): { findings: Array<ReviewFindingComment>; acceptedCount: number } {
  const findings: Array<ReviewFindingComment> = [];
  for (const comment of comments ?? []) {
    const next = {
      ...comment,
      reviewFindingStatus: comment.reviewFindingStatus ?? "added",
    };
    if (next.reviewFindingStatus === "added") {
      findings.push(next);
    }
  }
  const acceptedCount = findings.length;
  return { findings, acceptedCount };
}

export function parseCodeCommentFromComment(
  comment: CommentInputItem,
): CodeReviewFinding | null {
  const text = getCommentText(comment).trim();
  if (!text) {
    return null;
  }
  const [titleLine, ...rest] = text.split(/\n\s*\n/);
  const title = titleLine.trim();
  if (!title) {
    return null;
  }
  const body = rest.join("\n\n").trim();
  const { startLine, endLine } = getCommentLineRange(comment);
  return {
    title,
    body: body || title,
    confidence_score: 0,
    code_location: {
      absolute_file_path: comment.position.path,
      line_range: {
        start: startLine,
        end: endLine,
      },
    },
  };
}

function buildCodeCommentText(finding: CodeReviewFinding): string {
  const title = finding.title.trim();
  const body = finding.body.trim();
  if (!title) {
    return body;
  }
  if (!body) {
    return title;
  }
  return `${title}\n\n${body}`;
}

export function buildCodeComment(
  finding: CodeReviewFinding,
  workspaceRoot?: string | null,
): CommentInputItem | null {
  const filePath = finding.code_location.absolute_file_path.trim();
  if (!filePath) {
    return null;
  }
  const startLine = finding.code_location.line_range.start;
  if (!Number.isFinite(startLine)) {
    return null;
  }
  const endLine = finding.code_location.line_range.end;
  const resolvedEndLine = Number.isFinite(endLine) ? endLine : startLine;
  const path = getProjectRelativePath(filePath, workspaceRoot ?? undefined);
  const text = buildCodeCommentText(finding);
  if (!text) {
    return null;
  }
  return {
    content: [{ content_type: "text", text }],
    position: {
      side: "right",
      path,
      line: resolvedEndLine,
      ...(resolvedEndLine !== startLine ? { start_line: startLine } : {}),
    },
  };
}
