import clsx from "clsx";
import { Command, useCommandState } from "cmdk";
import { useEffect, useMemo, useRef, useState } from "react";

import { Tooltip } from "@/components/tooltip";
import { useResizeObserver } from "@/utils/use-resize-observer";

import { computeHighlightChunks, type TextChunk } from "./highlight-chunks";

export function SlashCommandItem({
  title,
  description,
  LeftIcon,
  RightIcon,
  titleTooltipContent,
  descriptionTooltipContent,
  descriptionClassName,
  tooltipDelayDuration,
  rightAccessory,
  ...rest
}: {
  title: string;
  description?: string;
  LeftIcon?: React.ComponentType<{ className?: string }>;
  RightIcon?: React.ComponentType<{ className?: string }>;
  titleTooltipContent?: React.ReactNode;
  descriptionTooltipContent?: React.ReactNode;
  descriptionClassName?: string;
  tooltipDelayDuration?: number;
  rightAccessory?: React.ReactNode;
} & React.ComponentProps<typeof Command.Item>): React.ReactElement {
  const itemRef = useRef<HTMLDivElement>(null);
  // Dim not-matched parts of the title.
  const search = useCommandState((s) => s.search);
  const selectedValue = useCommandState((s) => s.value);
  const chunks = useMemo((): Array<TextChunk> => {
    return computeHighlightChunks(title, search);
  }, [search, title]);
  const hasMatch = chunks.some((chunk) => chunk.isMatch);

  useEffect(() => {
    if (itemRef.current?.dataset.selected !== "true") {
      return;
    }

    itemRef.current.scrollIntoView({ block: "nearest" });
  }, [selectedValue]);

  return (
    <Command.Item ref={itemRef} {...rest}>
      <div className="flex w-full min-w-0 items-center gap-2">
        {LeftIcon ? <LeftIcon className="icon-xs shrink-0" /> : null}
        <TruncatedTooltipContent
          tooltipContent={titleTooltipContent}
          delayDuration={tooltipDelayDuration}
          className={clsx(
            // Truncate when constrained
            "truncate",
            // If there's a description, cap the title at 60% but don't reserve space.
            // If no description, let the title fill the row.
            description
              ? descriptionClassName
                ? "min-w-0 flex-1"
                : "max-w-[60%] flex-none"
              : "min-w-0 flex-1",
          )}
        >
          {chunks.map((chunk, i) => (
            <span
              key={i}
              className={clsx(
                !chunk.isMatch &&
                  hasMatch &&
                  "text-token-description-foreground",
              )}
            >
              {chunk.text}
            </span>
          ))}
        </TruncatedTooltipContent>
        {description || rightAccessory || RightIcon ? (
          <div className="ml-auto flex min-w-0 items-center gap-2">
            {description ? (
              <TruncatedTooltipContent
                tooltipContent={descriptionTooltipContent}
                delayDuration={tooltipDelayDuration}
                className={clsx(
                  "truncate text-sm text-token-description-foreground",
                  descriptionClassName ?? "min-w-0 flex-1",
                )}
              >
                {description}
              </TruncatedTooltipContent>
            ) : null}
            {rightAccessory ? (
              <span className="shrink-0 opacity-80">{rightAccessory}</span>
            ) : null}
            {RightIcon ? <RightIcon className="icon-xs shrink-0" /> : null}
          </div>
        ) : null}
      </div>
    </Command.Item>
  );
}

function TruncatedTooltipContent({
  children,
  className,
  tooltipContent,
  delayDuration,
}: {
  children: React.ReactNode;
  className?: string;
  tooltipContent?: React.ReactNode;
  delayDuration?: number;
}): React.ReactElement {
  const [isTruncated, setIsTruncated] = useState(false);
  const observeContentRef = useResizeObserver<HTMLDivElement>(
    (_entry, element) => {
      setIsTruncated(element.scrollWidth > element.clientWidth);
    },
  );

  const setContentRef = (node: HTMLDivElement | null): void => {
    observeContentRef(node);
    if (node != null) {
      setIsTruncated(node.scrollWidth > node.clientWidth);
    }
  };

  return (
    <Tooltip
      tooltipContent={tooltipContent}
      delayDuration={delayDuration}
      disabled={tooltipContent == null || !isTruncated}
    >
      <div ref={setContentRef} className={className}>
        {children}
      </div>
    </Tooltip>
  );
}
