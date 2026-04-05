import clsx from "clsx";
import memoizeOne from "memoize-one";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useIntl } from "react-intl";
import tw from "tailwind-styled-components";

import { PartialSVGImage } from "@/components/svg-image";
import { copyToClipboard } from "@/utils/copy-to-clipboard";
import { useIsDark } from "@/utils/use-is-dark";

// Adapted from chatgpt/web
import type { HighlightCodeResponse } from "./code/highlight-code";
import { CopyButton } from "./copy-button";

const getHighlighter = memoizeOne(() => import("./code/highlight-code"));

const HighlightedSegment = React.memo(function HighlightedSegment({
  htmlSegment,
}: {
  htmlSegment: string;
}) {
  return <span dangerouslySetInnerHTML={{ __html: htmlSegment }} />;
});

export function CodeSnippet({
  wrapperClassName,
  codeClassName,
  language,
  content,
  shouldWrapCode,
  removeTopBorderRadius,
  showActionBar = true,
  showStickyRightContent = true,
  codeContainerClassName,
  title,
  copyButtonText,
}: {
  language?: string;
  codeClassName?: string;
  content: string;
  shouldWrapCode?: boolean;
  wrapperClassName?: string;
  removeTopBorderRadius?: boolean;
  showActionBar?: boolean;
  showStickyRightContent?: boolean;
  codeContainerClassName?: string;
  title?: React.ReactNode;
  copyButtonText?: string;
}): React.ReactNode {
  const ref = useRef<HTMLDivElement>(null);

  const handlePartialCodeSelectionCopy = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      // Override the default copy selection behavior to only set the text/plain clipboard data
      // This is to prevent the default behavior of setting the html clipboard data,
      // which includes the formatting of the code snippet.
      event.preventDefault();
      event.stopPropagation();

      const selectedText = window.getSelection()?.toString();
      if (selectedText) {
        void copyToClipboard(selectedText, event);
      }
    },
    [],
  );

  const handleCopyToClipboard = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      void copyToClipboard(content, event);
    },
    [content],
  );

  const intl = useIntl();

  const [highlightResponse, setHighlightResponse] =
    useState<HighlightCodeResponse | null>(null);
  useEffect(() => {
    // These are guaranteed to be returned in the order they were requested.
    // This means we can be showing an "old" highlight result compared to the
    // latest content, but we will converge to the final one and will never
    // revert from a newer to an older highlight.
    void getHighlighter().then((highlighter) => {
      if (highlighter == null) {
        // Failed to load the highlighting bundle.
        return;
      }

      try {
        setHighlightResponse(highlighter.highlightCode(content, language));
      } catch (error: unknown) {
        if (error instanceof Error && /Unknown language/i.test(error.message)) {
          // If the language is unsupported, swallow the error.
        } else {
          // We don't expect any other kinds of errors from highlighting.
          throw error;
        }
      }
    });
  }, [content, language]);

  const shouldRenderAsSvg =
    language === "svg" ||
    ((language === "xml" || language === "html") && isContentSvg(content));

  const segments = useMemo(
    () =>
      highlightResponse?.html
        .split(/(<span[^>]*>.*?<\/span>)/g)
        .filter(Boolean),
    [highlightResponse?.html],
  );

  const code = shouldRenderAsSvg ? (
    <PartialSVGImage svgString={content} className="max-h-96 w-full" />
  ) : segments && segments.length > 0 ? (
    <span>
      {segments.map((segment, index) => (
        <HighlightedSegment key={index} htmlSegment={segment} />
      ))}
    </span>
  ) : highlightResponse?.html ? (
    <span dangerouslySetInnerHTML={{ __html: highlightResponse.html }} />
  ) : (
    <span>{content}</span>
  );

  return (
    <DisplayCodeSnippet
      ref={ref}
      title={title ?? language}
      shouldWrapCode={shouldWrapCode}
      stickyTitleRightContent={
        showStickyRightContent && (
          <CopyButton
            iconClassName="icon-2xs"
            iconOnly
            buttonText={
              copyButtonText ??
              intl.formatMessage({
                id: "copyButton.copyCode",
                defaultMessage: "Copy code",
                description:
                  "Button to copy the contents of the code snippet to the clipboard",
              })
            }
            onCopy={handleCopyToClipboard}
          />
        )
      }
      codeClassName={codeClassName}
      codeContainerClassName={codeContainerClassName}
      onCopy={handlePartialCodeSelectionCopy}
      className={wrapperClassName}
      removeTopBorderRadius={removeTopBorderRadius}
      showActionBar={showActionBar}
    >
      {code}
    </DisplayCodeSnippet>
  );
}

function DisplayCodeSnippet({
  children,
  title,
  stickyTitleRightContent,
  shouldWrapCode = false,
  className,
  codeContainerClassName,
  codeClassName,
  ref,
  onCopy,
  removeTopBorderRadius,
  showActionBar = true,
}: {
  children: React.ReactNode;
  title?: React.ReactNode;
  stickyTitleRightContent: React.ReactNode;
  shouldWrapCode?: boolean;
  className?: string;
  codeContainerClassName?: string;
  codeClassName?: string;
  ref: RefObject<HTMLDivElement | null>;
  onCopy?: (event: React.ClipboardEvent<HTMLDivElement>) => void;
  removeTopBorderRadius?: boolean;
  showActionBar?: boolean;
}): React.ReactNode {
  const isDark = useIsDark();
  return (
    <div
      className={clsx(
        "bg-token-text-code-block-background border-token-input-background relative overflow-clip rounded-lg border contain-inline-size",
        isDark ? "dark" : "light",
        className,
      )}
      data-theme={isDark ? "dark" : "light"}
    >
      {showActionBar && (
        <>
          <ActionBar $removeTopBorderRadius={removeTopBorderRadius}>
            <div className="min-w-0 truncate">{title}</div>
            <div className="flex items-center">{stickyTitleRightContent}</div>
          </ActionBar>
        </>
      )}
      <CodeContainer ref={ref} className={codeContainerClassName}>
        <CodeContent
          $shouldWrap={shouldWrapCode}
          className={codeClassName}
          onCopy={onCopy}
        >
          {children}
        </CodeContent>
      </CodeContainer>
    </div>
  );
}

const ActionBar = tw.div<{
  $removeTopBorderRadius?: boolean;
}>`sticky top-0 z-10 flex items-center justify-between ps-2 pe-2 py-1 text-sm font-sans text-token-description-foreground select-none ${(p): string => (p.$removeTopBorderRadius ? "" : "rounded-t-lg")}`;
const CodeContainer = function CodeContainer({
  children,
  className,
  ref,
}: {
  children: React.ReactNode;
  className?: string;
  ref: RefObject<HTMLDivElement | null>;
}): React.ReactNode {
  return (
    <div
      ref={ref}
      className={clsx("text-size-chat overflow-y-auto p-2", className)}
      dir="ltr"
    >
      {children}
    </div>
  );
};
const CodeContent = tw.code<{ $shouldWrap: boolean }>`${(p): string =>
  p.$shouldWrap ? "whitespace-pre-wrap!" : "whitespace-pre!"}`;

function isContentSvg(input: string): boolean {
  const trimmed = input.trim();

  return trimmed.startsWith("<svg");
}
