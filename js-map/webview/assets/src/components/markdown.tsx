import { remarkMath } from "@oai/remark-math";
import clsx from "clsx";
import type { Element as HastElement } from "hast";
import type { Text as MdastText } from "mdast";
import { lookup } from "mime-types";
import {
  isAbsoluteFilesystemPath,
  type ConversationId,
  type GitCwd,
} from "protocol";
import type React from "react";
import {
  Children,
  cloneElement,
  isValidElement,
  memo,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useIntl } from "react-intl";
// oxlint-disable-next-line no-restricted-imports
import type { Components } from "react-markdown";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown"; // oxlint-disable-line no-restricted-imports
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";

import { ImagePreviewDialog } from "@/components/image-preview-dialog";
import {
  isAgentMentionPath,
  isAppMentionPath,
  isConfiguredAgentMentionPath,
  isPluginMentionPath,
} from "@/composer/mention-item";
import ChevronRightIcon from "@/icons/chevron-right.svg";
import ImageSquare from "@/icons/image-square.svg";
import { AutomationUpdateDirectiveRenderer } from "@/markdown-directives/automation-update-directive-renderer";
import { CodeCommentDirectiveRenderer } from "@/markdown-directives/code-comment-directive-renderer";
import {
  APP_ACTION_ADD_INBOX_ITEM_DIRECTIVE_NAME,
  APP_ACTION_ARCHIVE_THREAD_DIRECTIVE_NAME,
  AUTOMATION_UPDATE_DIRECTIVE_NAME,
  CODE_COMMENT_DIRECTIVE_NAME,
  GITHUB_DETAILS_DIRECTIVE_NAME,
  GIT_COMMIT_DIRECTIVE_NAME,
  GIT_CREATE_BRANCH_DIRECTIVE_NAME,
  GIT_CREATE_PR_DIRECTIVE_NAME,
  GIT_PUSH_DIRECTIVE_NAME,
  GIT_STAGE_DIRECTIVE_NAME,
  WHAM_FILE_DIRECTIVE_NAME,
  WHAM_TASK_STUB_DIRECTIVE_NAME,
  codexRemarkDirective,
} from "@/markdown-directives/codex-remark-directive";
import { fallbackDirective } from "@/markdown-directives/fallback-directive";
import { ProposedTaskDirectiveRenderer } from "@/markdown-directives/proposed-task-directive-renderer";
import { messageBus } from "@/message-bus";
import { logger } from "@/utils/logger";
import { useFetchFromVSCode } from "@/vscode-api";

import { CodeSnippet } from "./code-snippet";
import { FileCitationDirectiveComponent } from "./markdown/file-citation";
import { isFileReference, parseFileReference } from "./markdown/file-reference";
import { FileLink, SkillChip } from "./markdown/mention-chips";
import { MermaidDiagram } from "./markdown/mermaid-diagram";
import { optimisticallyCloseMarkdown } from "./markdown/optimistically-close-markdown";
import {
  getOrderedListPaddingClassName,
  groupOrderedListItems,
} from "./markdown/ordered-list-utils";
import { rehypeInlineCodeProperty } from "./markdown/rehype-inline-code-property";
import { remarkFileCitations } from "./markdown/remark-file-citations";
import { remarkFileMentions } from "./markdown/remark-file-mentions";
import { remarkFixBrokenOrderedLists } from "./markdown/remark-fix-broken-ordered-lists";
import { remarkPreserveWindowsPaths } from "./markdown/remark-preserve-windows-paths";
import {
  SKILL_MENTION_PATTERN,
  remarkSkillMentions,
} from "./markdown/remark-skill-mentions";
import { remarkStripCitationMarkers } from "./markdown/remark-strip-citation-markers";
import {
  parseMentionLabel,
  renderPromptLink,
} from "./markdown/render-prompt-link";

import markdownStyles from "./markdown/markdown.module.css";

const baseHeadingStyle = "font-semibold";
const inlineCodeTextStyle = "inline-markdown text-size-chat-sm font-mono";
const markdownImageClassName =
  "my-3 block h-auto rounded-md object-contain shadow-md";
const SKILL_INLINE_PATTERN = new RegExp(`^${SKILL_MENTION_PATTERN.source}$`);
const EXTERNAL_URL_PATTERN = /^(?:[a-z][a-z0-9+.-]*:\/\/|www\.)/i;
const DATA_IMAGE_URL_PATTERN = /^data:image\//i;
const WHITE_SPACE_REGEX = /^\s*$/;
const basicHtmlSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    [GITHUB_DETAILS_DIRECTIVE_NAME]: ["summary", "open"],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "b",
    "br",
    "del",
    "em",
    "i",
    "s",
    "strong",
    "sub",
    "sup",
    "u",
    GITHUB_DETAILS_DIRECTIVE_NAME,
  ],
};

type MarkdownComponentOverrides = Partial<Components> & Record<string, unknown>;

function NonDisplayingActionDirective({
  node,
}: {
  node?: {
    data?: {
      hName?: string;
      hProperties?: Record<string, unknown>;
    };
  };
}): React.ReactElement | null {
  const directiveName = node?.data?.hName ?? "app-action";
  const payload = node?.data?.hProperties ?? {};
  logger.trace(`[bgthread] directive`, {
    safe: {
      name: directiveName,
    },
    sensitive: {
      payload: payload,
    },
  });
  return null;
}

function GitHubDetailsDirectiveRenderer({
  children,
  open,
  summary,
}: {
  children?: React.ReactNode;
  open?: boolean | "true";
  summary?: string;
}): React.ReactElement {
  return (
    <details
      className="group my-3 rounded-xl border border-token-border/30 bg-token-bg-secondary/15 px-4 py-3"
      open={open === true || open === "true"}
    >
      <summary className="text-size-chat flex cursor-pointer list-none items-center gap-1.5 font-medium text-token-foreground marker:hidden [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon className="icon-2xs shrink-0 transition-transform group-open:rotate-90" />
        <span>{summary}</span>
      </summary>
      <div className="pt-2 [&>*:last-child]:mb-0">{children}</div>
    </details>
  );
}

const generateComponents = (
  textSize: string,
  conversationId: ConversationId | null,
  hideCodeBlocks: boolean | undefined,
  cwd: GitCwd | null,
  allowWideBlocks: boolean,
): MarkdownComponentOverrides => {
  const baseTextStyle = `${textSize}`;
  const components: MarkdownComponentOverrides = {
    code({ className, children, ...rest }) {
      const content = typeof children === "string" ? children : "";
      // @ts-expect-error - inline is added by rehypeInlineCodeProperty
      const inline = rest.inline;
      if (inline) {
        const rawContent = content ?? "";
        const atMentionPath = rawContent.startsWith("@")
          ? rawContent.slice(1)
          : null;
        if (atMentionPath != null && isFileReference(atMentionPath)) {
          const parsedReference = parseFileReference(atMentionPath);
          return (
            <FileLink
              className={className}
              reference={parsedReference}
              cwd={cwd}
            />
          );
        }
        const inlineMarkdownLink = parseInlineMarkdownLink(rawContent);
        if (inlineMarkdownLink) {
          const renderedLink = renderPromptLink({
            className,
            cwd,
            href: inlineMarkdownLink.href,
            label: inlineMarkdownLink.label,
          });
          if (renderedLink != null) {
            return renderedLink;
          }
        }
        const isSkillMention = SKILL_INLINE_PATTERN.test(rawContent);
        if (isSkillMention) {
          const mentionText = parseMentionLabel(rawContent);
          return <SkillChip label={mentionText} />;
        }
        return (
          <span
            className={clsx(
              markdownStyles.inlineMarkdown,
              inlineCodeTextStyle,
              "blend bg-token-text-code-block-background rounded-sm px-1.5 py-0.5 leading-none extension:bg-token-foreground/10 electron:bg-token-list-hover-background/60",
            )}
          >
            {children}
          </span>
        );
      }

      if (hideCodeBlocks) {
        return null;
      }

      const language = className
        ?.split(" ")
        .find((value) => value.startsWith("language-"))
        ?.split("-")[1];

      if (language === "mermaid") {
        return (
          <LazyCodeBlock
            language={language}
            content={content ?? ""}
            className={allowWideBlocks ? markdownStyles.wideBlock : undefined}
            wideBlockKind={allowWideBlocks ? "mermaid" : undefined}
            renderVisible={() => (
              <MermaidDiagram
                code={content ?? ""}
                className={
                  allowWideBlocks ? markdownStyles.wideBlock : undefined
                }
                wideBlockKind={allowWideBlocks ? "mermaid" : undefined}
                fallback={
                  <CodeSnippet
                    wrapperClassName="my-2"
                    content={content ?? ""}
                    language="plaintext"
                  />
                }
              />
            )}
          />
        );
      }

      return (
        <LazyCodeBlock
          language={language}
          content={content}
          renderVisible={() => (
            <CodeSnippet
              wrapperClassName="my-2"
              content={content}
              language={language}
              {...rest}
            />
          )}
        />
      );
    },

    pre({ children }) {
      return <>{children}</>;
    },

    p({ children }) {
      const standaloneImage = allowWideBlocks
        ? getStandaloneMarkdownImageChild(children)
        : null;
      if (standaloneImage != null) {
        return (
          <p
            className={clsx(
              baseTextStyle,
              "my-2 text-center",
              markdownStyles.wideBlock,
            )}
            data-wide-markdown-block="true"
            data-wide-markdown-block-kind="image"
          >
            {cloneElement(standaloneImage, { allowWide: true })}
          </p>
        );
      }
      return <p className={clsx(baseTextStyle, "my-2")}>{children}</p>;
    },

    h1({ children }) {
      return (
        <h1
          className={clsx(
            baseHeadingStyle,
            markdownStyles.headingInlineCode,
            "heading-lg mt-5 mb-2",
          )}
        >
          {children}
        </h1>
      );
    },

    h2({ children }) {
      return (
        <h2
          className={clsx(
            baseHeadingStyle,
            markdownStyles.headingInlineCode,
            "heading-base mt-4 mb-2",
          )}
        >
          {children}
        </h2>
      );
    },

    h3({ children }) {
      return (
        <h3
          className={clsx(
            baseHeadingStyle,
            markdownStyles.headingInlineCode,
            "text-size-chat mt-3 mb-1.5",
          )}
        >
          {children}
        </h3>
      );
    },

    ul({ className, children }) {
      const isTaskList = className?.includes("contains-task-list") ?? false;
      return (
        <ul
          className={clsx(
            baseTextStyle,
            "mt-0 mb-4 ",
            isTaskList ? "list-none pl-0" : "list-disc pl-4",
            className,
          )}
        >
          {children}
        </ul>
      );
    },

    ol({ className, children, start }) {
      const isTaskList = className?.includes("contains-task-list") ?? false;
      if (isTaskList && orderedListHasOnlyTaskItems(children)) {
        return (
          <ol
            className={clsx(
              baseTextStyle,
              "mt-0 mb-4 list-none pl-0",
              className,
            )}
          >
            {children}
          </ol>
        );
      }
      const groups = groupOrderedListItems(Children.toArray(children), start);
      return (
        <>
          {groups.map((group, groupIndex) => {
            const paddingClassName = getOrderedListPaddingClassName(
              group.digits,
            );
            const marginClass = getOrderedListMarginClass(
              groupIndex,
              groups.length,
            );
            return (
              <ol
                key={`ol-${group.start}`}
                className={clsx(
                  baseTextStyle,
                  "list-decimal",
                  marginClass,
                  paddingClassName,
                )}
                start={group.start}
              >
                {group.items}
              </ol>
            );
          })}
        </>
      );
    },

    li({ className, children }) {
      const isTaskListItem = className?.includes("task-list-item") ?? false;
      return (
        <li
          className={clsx(
            baseTextStyle,
            "mb-1.5",
            isTaskListItem && "list-none",
            className,
          )}
        >
          {children}
        </li>
      );
    },

    a({ href, children }) {
      const childText = Children.toArray(children)
        .map((child) => {
          if (typeof child === "string" || typeof child === "number") {
            return String(child);
          }
          if (isValidElement(child)) {
            const childProps = child.props as Record<string, unknown>;
            if (typeof childProps.text === "string") {
              return childProps.text;
            }
            if (typeof childProps.label === "string") {
              return childProps.label;
            }
            if (typeof childProps.children === "string") {
              return childProps.children;
            }
            if (typeof childProps.children === "number") {
              return String(childProps.children);
            }
          }
          return "";
        })
        .join("");
      const trimmedChildText = childText.trim();
      if (href) {
        const renderedLink = renderPromptLink({
          cwd,
          href,
          label: trimmedChildText,
        });
        if (renderedLink != null) {
          return renderedLink;
        }
      }
      return (
        <a
          href={href}
          className="decoration-opacity-50 text-token-text-link-foreground underline decoration-current decoration-[0.5px]"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => {
            if (!href || !isExternalUrl(href)) {
              return;
            }
            event.preventDefault();
            messageBus.dispatchMessage("open-in-browser", {
              url: normalizeExternalUrl(href),
            });
          }}
        >
          {children}
        </a>
      );
    },

    img: MarkdownImage,

    blockquote({ children }) {
      return (
        <blockquote
          className={clsx(
            baseTextStyle,
            "my-3 border-l-2 border-gray-300 pl-4 italic",
          )}
        >
          {children}
        </blockquote>
      );
    },

    hr() {
      return <hr className="my-4 border-t border-gray-300" />;
    },

    table({ children }) {
      if (allowWideBlocks) {
        return (
          <div
            className={clsx(
              "my-3",
              markdownStyles.wideBlock,
              markdownStyles.wideScrollableBlock,
            )}
            data-wide-markdown-block="true"
            data-wide-markdown-block-kind="table"
          >
            <table
              className={clsx(
                baseTextStyle,
                "min-w-full w-max border-collapse",
              )}
            >
              {children}
            </table>
          </div>
        );
      }
      return (
        <table className={clsx(baseTextStyle, "my-3 w-full border-collapse")}>
          {children}
        </table>
      );
    },

    thead({ children }) {
      return <thead className="bg-token-foreground/5">{children}</thead>;
    },

    tbody({ children }) {
      return <tbody>{children}</tbody>;
    },

    tr({ children }) {
      return <tr className="border-b border-token-border">{children}</tr>;
    },

    th({ children }) {
      return (
        <th className="p-1 text-left font-semibold text-token-foreground">
          {children}
        </th>
      );
    },

    td({ children }) {
      return <td className="p-1">{children}</td>;
    },
  };

  function CodeCommentDirectiveComponent(
    props: React.ComponentProps<typeof CodeCommentDirectiveRenderer>,
  ): React.ReactElement | null {
    return (
      <CodeCommentDirectiveRenderer
        {...props}
        conversationId={conversationId}
      />
    );
  }

  components[WHAM_TASK_STUB_DIRECTIVE_NAME] = ProposedTaskDirectiveRenderer;
  components[WHAM_FILE_DIRECTIVE_NAME] = (
    props: React.ComponentProps<typeof FileCitationDirectiveComponent>,
  ): React.ReactElement => (
    <FileCitationDirectiveComponent {...props} cwd={cwd} />
  );
  components[APP_ACTION_ADD_INBOX_ITEM_DIRECTIVE_NAME] =
    NonDisplayingActionDirective;
  components[APP_ACTION_ARCHIVE_THREAD_DIRECTIVE_NAME] =
    NonDisplayingActionDirective;
  components[CODE_COMMENT_DIRECTIVE_NAME] = CodeCommentDirectiveComponent;
  components[AUTOMATION_UPDATE_DIRECTIVE_NAME] =
    AutomationUpdateDirectiveRenderer;
  components[GIT_STAGE_DIRECTIVE_NAME] = NonDisplayingActionDirective;
  components[GIT_COMMIT_DIRECTIVE_NAME] = NonDisplayingActionDirective;
  components[GIT_CREATE_BRANCH_DIRECTIVE_NAME] = NonDisplayingActionDirective;
  components[GIT_PUSH_DIRECTIVE_NAME] = NonDisplayingActionDirective;
  components[GIT_CREATE_PR_DIRECTIVE_NAME] = NonDisplayingActionDirective;
  components[GITHUB_DETAILS_DIRECTIVE_NAME] = GitHubDetailsDirectiveRenderer;

  return components;
};

const Markdown = memo(function MarkdownComponent({
  children,
  id,
  className,
  components,
  textSize = "text-size-chat",
  conversationId = null,
  hideCodeBlocks,
  fadeType = "none",
  cwd,
  allowWideBlocks = false,
  allowBasicHtml = false,
  enableFileCitationMarkers = false,
}: {
  children: string;
  id?: string;
  className?: string;
  components?: MarkdownComponentOverrides;
  textSize?: string;
  conversationId?: ConversationId | null;
  hideCodeBlocks?: boolean;
  fadeType?: "none" | "indexed";
  cwd: GitCwd | null;
  allowWideBlocks?: boolean;
  allowBasicHtml?: boolean;
  enableFileCitationMarkers?: boolean;
}): React.ReactElement {
  const generatedId = useId();
  const blockId = id ?? generatedId;
  const displayChildren = useMemo(() => {
    if (fadeType !== "indexed") {
      return children;
    }
    return optimisticallyCloseMarkdown(children);
  }, [children, fadeType]);
  const segmenter = useMemo(() => {
    try {
      return new Intl.Segmenter(undefined, { granularity: "word" });
    } catch {
      return null;
    }
  }, []);
  const initialComponents = useMemo(
    (): Partial<Components> =>
      generateComponents(
        textSize,
        conversationId,
        hideCodeBlocks,
        cwd,
        allowWideBlocks,
      ),
    [allowWideBlocks, conversationId, cwd, hideCodeBlocks, textSize],
  );
  const remarkRehypeOptions = useMemo(() => {
    if (fadeType !== "indexed") {
      return undefined;
    }
    return {
      handlers: {
        text: (_state: unknown, node: MdastText): Array<HastElement> => {
          return segmentText(node.value, segmenter).map((segment) => ({
            type: "element",
            tagName: "span",
            properties: { className: markdownStyles.fadeIn },
            children: [{ type: "text", value: segment }],
          }));
        },
      },
    };
  }, [fadeType, segmenter]);
  const remarkPlugins = useMemo(
    () => [
      remarkGfm,
      remarkMath,
      remarkBreaks,
      remarkFixBrokenOrderedLists,
      remarkPreserveWindowsPaths,
      remarkDirective,
      [remarkFileCitations, { enabled: enableFileCitationMarkers }],
      codexRemarkDirective,
      remarkFileMentions,
      remarkSkillMentions,
      remarkStripCitationMarkers,
      fallbackDirective,
    ],
    [enableFileCitationMarkers],
  );

  return (
    <div
      className={clsx(
        "[&>*:first-child]:mt-0",
        markdownStyles.markdownContent,
        fadeType === "indexed" && markdownStyles.markdownRoot,
        className,
      )}
    >
      <ReactMarkdown
        key={`${blockId}-block`}
        urlTransform={(value, key, node: HastElement): string => {
          if (
            key === "href" &&
            node.tagName === "a" &&
            (isAppMentionPath(value) ||
              isPluginMentionPath(value) ||
              isAgentMentionPath(value) ||
              isConfiguredAgentMentionPath(value))
          ) {
            return value;
          }
          if (key === "src" && node.tagName === "img") {
            if (
              DATA_IMAGE_URL_PATTERN.test(value) ||
              isAbsoluteFilesystemPath(value)
            ) {
              return value;
            }
          }
          return defaultUrlTransform(value);
        }}
        rehypePlugins={
          allowBasicHtml
            ? [
                rehypeRaw,
                [rehypeSanitize, basicHtmlSanitizeSchema],
                rehypeInlineCodeProperty,
                [rehypeKatex, { strict: "ignore" }],
              ]
            : [rehypeInlineCodeProperty, [rehypeKatex, { strict: "ignore" }]]
        }
        remarkPlugins={remarkPlugins}
        remarkRehypeOptions={remarkRehypeOptions}
        components={{
          ...initialComponents,
          ...components,
        }}
      >
        {displayChildren}
      </ReactMarkdown>
    </div>
  );
});

Markdown.displayName = "Markdown";

export { Markdown };

function getOrderedListMarginClass(
  groupIndex: number,
  groupCount: number,
): string {
  if (groupCount <= 1) {
    return "mt-1.5 mb-3";
  }
  if (groupIndex === 0) {
    return "mt-1.5 mb-0";
  }
  if (groupIndex === groupCount - 1) {
    return "mt-0 mb-3";
  }
  return "my-0";
}

function segmentText(
  text: string,
  segmenter: Intl.Segmenter | null,
): Array<string> {
  if (segmenter == null) {
    const segments = Array.from(text.match(/\s*\S+(?:\s+|$)/g) ?? []);
    if (segments.length > 0 || text.length === 0) {
      return segments;
    }
    return [text];
  }
  const segments: Array<string> = [];
  for (const { segment, isWordLike } of segmenter.segment(text)) {
    if (WHITE_SPACE_REGEX.test(segment) || !isWordLike) {
      const lastIndex = Math.max(segments.length - 1, 0);
      segments[lastIndex] ??= "";
      segments[lastIndex] += segment;
      continue;
    }
    segments.push(segment);
  }
  return segments;
}

function orderedListHasOnlyTaskItems(children: React.ReactNode): boolean {
  const listItems = Children.toArray(children).filter((child) =>
    isValidElement(child),
  );
  if (listItems.length === 0) {
    return false;
  }
  return listItems.every((child) => {
    const childProps = child.props as { className?: string };
    return childProps.className?.includes("task-list-item") ?? false;
  });
}

function isExternalUrl(href: string): boolean {
  return EXTERNAL_URL_PATTERN.test(href);
}

function normalizeExternalUrl(href: string): string {
  if (/^www\./i.test(href)) {
    return `https://${href}`;
  }
  return href;
}

function parseInlineMarkdownLink(
  rawContent: string,
): { label: string; href: string } | null {
  const match = rawContent.match(/^\[([^\]\n]+)\]\(([^)\n]+)\)$/);
  if (!match) {
    return null;
  }
  const label = match[1]?.trim() ?? "";
  const href = match[2]?.trim() ?? "";
  if (label.length === 0 || href.length === 0) {
    return null;
  }
  return { label, href };
}

function MarkdownImage({
  src,
  alt,
  title,
  className,
  allowWide = false,
}: React.ComponentProps<"img"> & {
  allowWide?: boolean;
}): React.ReactElement | null {
  const intl = useIntl();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const rawSrc = src ?? "";
  const hasSrc = rawSrc.length > 0;
  const isAbsolutePath = hasSrc && isAbsoluteFilesystemPath(rawSrc);
  const { data, isLoading } = useFetchFromVSCode("read-file-binary", {
    params: { path: isAbsolutePath ? rawSrc : "" },
    queryConfig: {
      enabled: isAbsolutePath,
    },
  });

  if (!hasSrc) {
    return null;
  }

  const contentsBase64 = data?.contentsBase64 ?? null;
  const resolvedSrc =
    isAbsolutePath && contentsBase64
      ? toDataUrl({ path: rawSrc, contentsBase64 })
      : rawSrc;

  if (isAbsolutePath && isLoading && !contentsBase64) {
    return null;
  }

  const hasLoadError = failedSrc === resolvedSrc;
  const imageAlt = alt ?? "";
  const imagePreviewButtonLabel =
    imageAlt ||
    intl.formatMessage({
      id: "markdown.imagePreviewButton",
      defaultMessage: "Open image preview",
      description:
        "Accessible label for a markdown image button when no alt text is provided",
    });
  const disabledImageFallbackLabel =
    imageAlt ||
    intl.formatMessage({
      id: "markdown.imageUnavailable",
      defaultMessage: "Image unavailable",
      description:
        "Accessible label for a markdown image fallback when the image fails to load and no alt text is provided",
    });

  if (hasLoadError) {
    return (
      <button
        type="button"
        disabled
        className={clsx(
          markdownImageClassName,
          allowWide
            ? "mx-auto max-h-[var(--markdown-wide-block-max-height)] w-fit max-w-full"
            : "max-h-[min(48vh,32rem)] max-w-[min(100%,44rem)]",
          "bg-token-toolbar-hover-background text-token-description-foreground inline-flex min-h-24 min-w-24 max-w-full cursor-default items-center justify-center border-0 p-0",
        )}
        aria-label={disabledImageFallbackLabel}
        title={title}
      >
        <ImageSquare className="icon-lg" />
      </button>
    );
  }

  return (
    <ImagePreviewDialog
      src={resolvedSrc}
      alt={imageAlt}
      open={isPreviewOpen}
      onOpenChange={setIsPreviewOpen}
      contentMaxWidthClassName="max-w-[min(90vw,var(--markdown-wide-block-max-width))]"
      triggerContent={
        <button
          type="button"
          className={clsx(
            "cursor-zoom-in border-0 bg-transparent p-0 align-top",
            allowWide
              ? "mx-auto block max-w-full w-fit"
              : "inline-block max-w-[min(100%,44rem)]",
          )}
          aria-label={imagePreviewButtonLabel}
        >
          <img
            className={clsx(
              markdownImageClassName,
              allowWide
                ? "max-h-[var(--markdown-wide-block-max-height)] w-auto max-w-full"
                : "max-h-[min(48vh,32rem)] max-w-[min(100%,44rem)]",
              className,
            )}
            src={resolvedSrc}
            alt={imageAlt}
            title={title}
            loading="lazy"
            onError={() => {
              setFailedSrc(resolvedSrc);
            }}
          />
        </button>
      }
    />
  );
}

function getStandaloneMarkdownImageChild(
  children: React.ReactNode,
): React.ReactElement<
  React.ComponentProps<"img"> & {
    allowWide?: boolean;
  }
> | null {
  const contentChildren = Children.toArray(children).filter((child) => {
    return !(typeof child === "string" && WHITE_SPACE_REGEX.test(child));
  });
  if (contentChildren.length !== 1) {
    return null;
  }
  const [onlyChild] = contentChildren;
  if (
    !isValidElement<
      React.ComponentProps<"img"> & {
        allowWide?: boolean;
      }
    >(onlyChild)
  ) {
    return null;
  }
  return onlyChild.type === MarkdownImage ? onlyChild : null;
}

function toDataUrl({
  path,
  contentsBase64,
}: {
  path: string;
  contentsBase64: string;
}): string {
  const mimeType = lookup(path);
  const resolvedMimeType =
    typeof mimeType === "string" ? mimeType : "application/octet-stream";
  return `data:${resolvedMimeType};base64,${contentsBase64}`;
}

function LazyCodeBlock({
  language: _language,
  content,
  className,
  renderVisible,
  wideBlockKind,
}: {
  language?: string;
  content: string;
  className?: string;
  renderVisible: () => React.ReactElement;
  wideBlockKind?: string;
}): React.ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isVisible) {
      return;
    }
    const node = containerRef.current;
    if (!node) {
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      setTimeout(() => {
        setIsVisible(true);
      }, 0);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "600px 0px",
      },
    );
    observer.observe(node);
    return (): void => {
      observer.disconnect();
    };
  }, [isVisible]);

  if (isVisible) {
    return renderVisible();
  }

  return (
    <div
      ref={containerRef}
      className={clsx("my-2", className)}
      data-wide-markdown-block={wideBlockKind != null ? "true" : undefined}
      data-wide-markdown-block-kind={wideBlockKind}
    >
      <pre className="text-size-chat overflow-x-auto rounded-lg border border-token-input-background bg-token-text-code-block-background/10 p-2">
        <code>{content}</code>
      </pre>
    </div>
  );
}
