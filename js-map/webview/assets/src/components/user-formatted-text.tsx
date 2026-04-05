import clsx from "clsx";
import type { GitCwd } from "protocol";

import {
  isFileReference,
  parseFileReference,
} from "@/components/markdown/file-reference";
import { FileLink, SkillChip } from "@/components/markdown/mention-chips";
import { FILE_MENTION_PATTERN } from "@/components/markdown/remark-file-mentions";
import { SKILL_MENTION_PATTERN } from "@/components/markdown/remark-skill-mentions";
import { renderPromptLink } from "@/components/markdown/render-prompt-link";

const CODE_SPLIT_REGEX =
  /(```[\s\S]*?```|`[^`\n]+`|```[\s\S]*|`[^`\n]*\n|`[^`\n]*$)/g;
const SKILL_INLINE_PATTERN = new RegExp(`^${SKILL_MENTION_PATTERN.source}$`);
const MENTION_PATTERN = new RegExp(
  `${SKILL_MENTION_PATTERN.source}|${FILE_MENTION_PATTERN.source}`,
  "g",
);
const MARKDOWN_LINK_PATTERN = /\[([^\]\n]+)\]\(([^)\n]+)\)/g;
export function UserFormattedText({
  text,
  className,
  cwd,
}: {
  text: string;
  className?: string;
  cwd: GitCwd | null;
}): React.ReactElement {
  const parts = text.split(CODE_SPLIT_REGEX).filter((part) => part.length > 0);
  const segments: Array<{
    kind: "text" | "code-block" | "inline-code";
    content: string;
  }> = [];

  for (const part of parts) {
    if (part.startsWith("```")) {
      const trimmed = part.endsWith("```")
        ? part.slice(3, -3).trim()
        : part.slice(3).trim();
      segments.push({ kind: "code-block", content: trimmed });
      continue;
    }

    if (part.startsWith("`")) {
      const trimmed = part.endsWith("`") ? part.slice(1, -1) : part.slice(1);
      segments.push({ kind: "inline-code", content: trimmed });
      continue;
    }

    segments.push({ kind: "text", content: part });
  }

  const normalizedSegments: Array<{
    kind: "text" | "code-block" | "inline-code";
    content: string;
  }> = [];

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment.kind === "text") {
      let content = segment.content;
      const previousSegment = index > 0 ? segments[index - 1] : null;
      const nextSegment =
        index + 1 < segments.length ? segments[index + 1] : null;
      if (previousSegment?.kind === "code-block") {
        content = content.replace(/^\n{2,}/, "\n");
      }
      if (nextSegment?.kind === "code-block") {
        content = content.replace(/\n{2,}$/, "\n");
      }
      normalizedSegments.push({ kind: "text", content });
      continue;
    }

    normalizedSegments.push(segment);
  }

  return (
    <div className={clsx("text-size-chat whitespace-pre-wrap", className)}>
      {normalizedSegments.map((segment, index) => {
        if (segment.kind === "code-block") {
          return (
            <pre
              key={`user-code-block-${index}`}
              className="m-0 overflow-x-auto font-mono whitespace-pre"
            >
              <code>{segment.content}</code>
            </pre>
          );
        }

        if (segment.kind === "inline-code") {
          const rawContent = segment.content;
          const isSkillMention = SKILL_INLINE_PATTERN.test(rawContent);
          if (isSkillMention) {
            return (
              <SkillChip
                key={`user-inline-code-${index}`}
                label={formatSkillLabel(rawContent)}
              />
            );
          }
          return (
            <code key={`user-inline-code-${index}`} className="font-mono">
              {segment.content}
            </code>
          );
        }

        return (
          <span key={`user-text-${index}`}>
            {renderTextWithLinksAndMentions(
              segment.content,
              `user-text-${index}`,
              cwd,
            )}
          </span>
        );
      })}
    </div>
  );
}

function formatSkillLabel(rawContent: string): string {
  if (!rawContent.startsWith("$")) {
    return rawContent;
  }
  if (rawContent.startsWith("$[") && rawContent.endsWith("]")) {
    return rawContent.slice(2, -1);
  }
  return rawContent.slice(1);
}

function renderTextWithMentions(
  content: string,
  keyPrefix: string,
  cwd: GitCwd | null,
): Array<React.ReactNode> {
  if (!MENTION_PATTERN.test(content)) {
    return [content];
  }
  const nodes: Array<React.ReactNode> = [];
  let lastIndex = 0;
  MENTION_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  let mentionIndex = 0;
  while ((match = MENTION_PATTERN.exec(content)) != null) {
    if (match.index > lastIndex) {
      nodes.push(content.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("$")) {
      nodes.push(
        <SkillChip
          key={`${keyPrefix}-skill-${mentionIndex}`}
          label={formatSkillLabel(token)}
        />,
      );
    } else if (token.startsWith("@")) {
      const normalizedToken = token.slice(1);
      if (isFileReference(normalizedToken)) {
        nodes.push(
          <FileLink
            key={`${keyPrefix}-file-${mentionIndex}`}
            reference={parseFileReference(normalizedToken)}
            cwd={cwd}
          />,
        );
      } else {
        nodes.push(token);
      }
    } else {
      nodes.push(token);
    }
    lastIndex = match.index + token.length;
    mentionIndex += 1;
  }
  if (lastIndex < content.length) {
    nodes.push(content.slice(lastIndex));
  }
  return nodes;
}

function renderTextWithLinksAndMentions(
  content: string,
  keyPrefix: string,
  cwd: GitCwd | null,
): Array<React.ReactNode> {
  if (!MARKDOWN_LINK_PATTERN.test(content)) {
    return renderTextWithMentions(content, keyPrefix, cwd);
  }
  const nodes: Array<React.ReactNode> = [];
  let lastIndex = 0;
  MARKDOWN_LINK_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  let linkIndex = 0;
  while ((match = MARKDOWN_LINK_PATTERN.exec(content)) != null) {
    if (match.index > lastIndex) {
      nodes.push(
        ...renderTextWithMentions(
          content.slice(lastIndex, match.index),
          `${keyPrefix}-text-${linkIndex}`,
          cwd,
        ),
      );
    }
    const label = match[1];
    const href = match[2];
    const renderedLink = renderPromptLink({
      cwd,
      elementKey: `${keyPrefix}-link-${linkIndex}`,
      href,
      label,
    });
    if (renderedLink != null) {
      nodes.push(renderedLink);
    } else {
      nodes.push(
        <a
          key={`${keyPrefix}-link-${linkIndex}`}
          href={href}
          className="text-token-text-link-foreground hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {label}
        </a>,
      );
    }
    lastIndex = match.index + match[0].length;
    linkIndex += 1;
  }
  if (lastIndex < content.length) {
    nodes.push(
      ...renderTextWithMentions(
        content.slice(lastIndex),
        `${keyPrefix}-text-${linkIndex}`,
        cwd,
      ),
    );
  }
  return nodes;
}
