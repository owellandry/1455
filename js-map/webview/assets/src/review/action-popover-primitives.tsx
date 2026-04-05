import clsx from "clsx";
import { motion } from "framer-motion";
/* oxlint-disable react/only-export-components -- Suppressed during the oxlint migration */
import React, { type ReactElement, type ReactNode } from "react";

import { Button } from "@/components/button";
import { DialogBody } from "@/components/dialog-layout";
import { Spinner } from "@/components/spinner";
import { WithWindow } from "@/components/with-window";
import { TaskDiffStats } from "@/diff-stats";
import { getProjectRelativePath } from "@/diff/diff-file-utils";

function ActionPopoverRoot({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <DialogBody className={clsx("gap-3", className)}>{children}</DialogBody>
  );
}

type ActionPopoverHeaderIconTone = "neutral" | "success" | "failure";

function ActionPopoverHeader({
  icon,
  isRefreshing = false,
  iconBackgroundTone = "neutral",
  className,
}: {
  icon: ReactElement;
  isRefreshing?: boolean;
  iconBackgroundTone?: ActionPopoverHeaderIconTone;
  className?: string;
}): ReactElement {
  let iconBackgroundClassName = "bg-token-editor-background";
  if (iconBackgroundTone === "success") {
    iconBackgroundClassName = "bg-token-charts-green/20";
  }
  if (iconBackgroundTone === "failure") {
    iconBackgroundClassName = "bg-token-charts-red/10";
  }
  return (
    <div className={clsx("flex items-start justify-between", className)}>
      <span
        className={clsx(
          "flex h-9 w-9 items-center justify-center rounded-xl",
          iconBackgroundClassName,
        )}
      >
        {icon}
      </span>
      {isRefreshing ? (
        <Spinner className="icon-xs mt-0.5 text-token-description-foreground" />
      ) : null}
    </div>
  );
}

function ActionPopoverTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <div
      className={clsx(
        "text-token-foreground heading-dialog font-semibold",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ActionPopoverRowContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <div
      className={clsx(
        "text-token-description-foreground flex flex-col gap-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ActionPopoverFooter({
  left,
  right,
  className,
}: {
  left?: ReactElement;
  right: ReactElement;
  className?: string;
}): ReactElement {
  const coerceButtonSize = (
    node: ReactNode,
    defaultSize: NonNullable<React.ComponentProps<typeof Button>["size"]>,
  ): ReactNode => {
    if (!React.isValidElement<React.PropsWithChildren>(node)) {
      return node;
    }
    if (node.type === Button) {
      const buttonNode = node as ReactElement<
        React.ComponentProps<typeof Button>
      >;
      if (buttonNode.props.size != null) {
        return buttonNode;
      }
      return React.cloneElement(buttonNode, {
        size: defaultSize,
      });
    }
    if (node.props.children == null) {
      return node;
    }
    let didChange = false;
    const nextChildrenArray = React.Children.map(
      node.props.children,
      (child) => {
        const nextChild = coerceButtonSize(child, defaultSize);
        if (nextChild !== child) {
          didChange = true;
        }
        return nextChild;
      },
    );
    if (!didChange) {
      return node;
    }
    let nextChildren: ReactNode = nextChildrenArray;
    if (nextChildrenArray != null && nextChildrenArray.length === 1) {
      [nextChildren] = nextChildrenArray;
    }
    return React.cloneElement(node, {
      children: nextChildren,
    });
  };
  const renderFooter = (
    defaultSize: NonNullable<React.ComponentProps<typeof Button>["size"]>,
  ): ReactElement => {
    const leftElement = coerceButtonSize(left, defaultSize);
    const rightElement = coerceButtonSize(right, defaultSize);
    return (
      <>
        {leftElement ?? null}
        {rightElement}
      </>
    );
  };
  return (
    <div
      className={clsx(
        "flex flex-1 items-center justify-between gap-2",
        className,
      )}
    >
      <WithWindow electron>{renderFooter("medium")}</WithWindow>
      <WithWindow extension browser>
        {renderFooter("toolbar")}
      </WithWindow>
    </div>
  );
}

function ActionPopoverRow({
  left,
  label,
  right,
  className,
}: {
  left: ReactElement;
  label: ReactElement;
  right?: ReactElement;
  className?: string;
}): ReactElement {
  return (
    <div
      className={clsx(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
          {left}
        </span>
        <span className="min-w-0">{label}</span>
      </div>
      {right ?? <span />}
    </div>
  );
}

function ActionPopoverKeyValueRow({
  left,
  label,
  value,
  valueClassName,
  className,
}: {
  left: ReactElement;
  label: ReactNode;
  value: ReactNode;
  valueClassName?: string;
  className?: string;
}): ReactElement {
  return (
    <div
      className={clsx(
        "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-6",
        className,
      )}
    >
      <span className="flex items-center gap-2 whitespace-nowrap">
        <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
          {left}
        </span>
        {label}
      </span>
      <div className={clsx("min-w-0 truncate text-right", valueClassName)}>
        {value}
      </div>
    </div>
  );
}

function ActionPopoverIconButton({
  children,
  ariaLabel,
  onClick,
  disabled,
  className,
}: {
  children: ReactNode;
  ariaLabel: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}): ReactElement {
  return (
    <Button
      color="secondary"
      size="icon"
      aria-label={ariaLabel}
      disabled={disabled}
      className={clsx("rounded-lg p-2", className)}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export type ActionPopoverFileSummary = {
  path: string;
  additions?: number;
  deletions?: number;
};

function ActionPopoverFileRow({
  file,
  workspaceRoot,
}: {
  file: ActionPopoverFileSummary;
  workspaceRoot?: string;
}): ReactElement {
  const relativePath = getProjectRelativePath(file.path, workspaceRoot);
  const parts = relativePath.split("/");
  const name = parts.pop() ?? relativePath;
  const dir = parts.join("/");
  const additions = file.additions ?? 0;
  const deletions = file.deletions ?? 0;
  const hasStats = file.additions != null || file.deletions != null;
  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6"
      title={file.path}
    >
      <div className="flex min-w-0 items-baseline gap-2 whitespace-nowrap">
        <span className="flex-shrink-0 font-medium text-token-foreground">
          {name}
        </span>
        {dir.length > 0 ? (
          <span className="min-w-0 truncate text-token-description-foreground">
            {dir}
          </span>
        ) : null}
      </div>
      {hasStats ? (
        <TaskDiffStats
          variant="color"
          linesAdded={additions}
          linesRemoved={deletions}
        />
      ) : (
        <span />
      )}
    </div>
  );
}

function ActionPopoverFileSection({
  title,
  files,
  workspaceRoot,
  className,
}: {
  title: ReactElement;
  files: Array<ActionPopoverFileSummary>;
  workspaceRoot?: string;
  className?: string;
}): ReactElement {
  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <div className="text-token-description-foreground">{title}</div>
      <div className="flex flex-col gap-2">
        {files.map(
          (file): ReactElement => (
            <ActionPopoverFileRow
              key={file.path}
              file={file}
              workspaceRoot={workspaceRoot}
            />
          ),
        )}
      </div>
    </div>
  );
}

function ActionPopoverExpanded({
  expanded,
  children,
  className,
  scrollClassName,
}: {
  expanded: boolean;
  children: ReactNode;
  className?: string;
  scrollClassName?: string;
}): ReactElement {
  return (
    <motion.div
      initial={false}
      animate={expanded ? "open" : "collapsed"}
      variants={{
        open: { height: "auto", opacity: 1 },
        collapsed: { height: 0, opacity: 0 },
      }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      style={{ overflow: "hidden" }}
      className={className}
    >
      <div
        className={clsx(
          "vertical-scroll-fade-mask max-h-64 overflow-y-auto [--edge-fade-distance:2rem]",
          scrollClassName,
        )}
      >
        {children}
      </div>
    </motion.div>
  );
}

export const ActionPopover = {
  Root: ActionPopoverRoot,
  Header: ActionPopoverHeader,
  Title: ActionPopoverTitle,
  RowContainer: ActionPopoverRowContainer,
  Footer: ActionPopoverFooter,
  Row: ActionPopoverRow,
  KeyValueRow: ActionPopoverKeyValueRow,
  IconButton: ActionPopoverIconButton,
  FileRow: ActionPopoverFileRow,
  FileSection: ActionPopoverFileSection,
  Expanded: ActionPopoverExpanded,
} as const;
