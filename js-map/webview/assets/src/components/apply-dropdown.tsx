import path from "path";

import clsx from "clsx";
import type {
  ComponentProps,
  ComponentType,
  ReactElement,
  ReactNode,
} from "react";
import { useState } from "react";
import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import BranchIcon from "@/icons/branch.svg";
import CheckMdIcon from "@/icons/check-md.svg";
import XIcon from "@/icons/x.svg";

type ApplyDropdownTarget = {
  label: string;
  subtitle: string;
  gitRoot: string;
  workspaceRoot: string;
};

export function ApplyDropdown({
  trigger,
  title,
  header,
  actions,
  disabled,
  align = "end",
  open,
  onOpenChange,
  footer,
  titleClassName,
  contentClassName,
  contentWidth,
  context,
}: {
  trigger: ReactNode;
  title: ReactNode;
  header?: ReactNode;
  actions: ReactNode | ApplyDropdownActions;
  disabled?: boolean;
  align?: ComponentProps<typeof BasicDropdown>["align"];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  footer?: ReactNode;
  titleClassName?: string;
  contentClassName?: string;
  contentWidth?: ComponentProps<typeof BasicDropdown>["contentWidth"];
  context?: {
    targets: Array<ApplyDropdownTarget>;
    results?: {
      appliedPaths: Array<string>;
      skippedPaths: Array<string>;
      conflictedPaths: Array<string>;
    } | null;
  };
}): ReactElement | null {
  const hasResultSection = Boolean(context?.results);
  const [selectedTargetRaw, setSelectedTarget] =
    useState<ApplyDropdownTarget | null>(context?.targets[0] ?? null);

  if (!context?.targets?.length) {
    return null;
  }

  const isSelectedTargetValid = context?.targets?.some(
    (target) => target.gitRoot === selectedTargetRaw?.gitRoot,
  );
  const selectedTarget = isSelectedTargetValid
    ? selectedTargetRaw
    : (context.targets[0] ?? null);

  return (
    <BasicDropdown
      align={align}
      disabled={disabled}
      open={open}
      onOpenChange={onOpenChange}
      surface="panel"
      contentWidth={contentWidth ?? "panel"}
      contentClassName={contentClassName}
      triggerButton={trigger}
    >
      {header ?? (
        <Dropdown.Title
          className={clsx(
            "leading-relaxed font-medium whitespace-normal break-words text-token-foreground",
            titleClassName,
          )}
        >
          {title}
        </Dropdown.Title>
      )}

      <div className="flex flex-col gap-px">
        {!context.results &&
          context?.targets?.map((target) => {
            return (
              <Dropdown.Item
                key={target.gitRoot}
                LeftIcon={BranchIcon}
                onClick={(e): void => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedTarget(target);
                }}
                RightIcon={
                  target.gitRoot === selectedTarget?.gitRoot
                    ? CheckMdIcon
                    : undefined
                }
              >
                <div
                  className="flex flex-col truncate"
                  title={target.gitRoot ?? undefined}
                >
                  <span className="flex gap-1 truncate">
                    <span className="truncate font-medium">{target.label}</span>
                  </span>
                  {target.subtitle ? (
                    <span className="truncate text-token-description-foreground">
                      {target.subtitle}
                    </span>
                  ) : null}
                </div>
              </Dropdown.Item>
            );
          })}
        {hasResultSection ? (
          <ApplyResultPaths
            appliedPaths={context?.results?.appliedPaths ?? []}
            skippedPaths={context?.results?.skippedPaths ?? []}
            conflictedPaths={context?.results?.conflictedPaths ?? []}
          />
        ) : null}
      </div>

      <Dropdown.Section className="mt-1 flex flex-col gap-1">
        {isActionConfig(actions) ? (
          <>
            <Button
              size="toolbar"
              color={actions.primary.color}
              className="justify-center"
              onClick={(): void => {
                if (selectedTarget) {
                  actions.primary.onClick(selectedTarget);
                }
              }}
              disabled={actions.primary.disabled || !selectedTarget}
              loading={actions.primary.loading}
            >
              {actions.primary.label}
            </Button>
            {actions.secondary ? (
              <Button
                size="toolbar"
                color={actions.secondary.color}
                className="justify-center"
                onClick={(): void => {
                  if (selectedTarget) {
                    actions.secondary?.onClick(selectedTarget);
                  }
                }}
                disabled={actions.secondary.disabled || !selectedTarget}
                loading={actions.secondary.loading}
              >
                {actions.secondary.label}
              </Button>
            ) : null}
          </>
        ) : (
          actions
        )}
      </Dropdown.Section>
      {footer ? (
        <Dropdown.Section className="mt-2">{footer}</Dropdown.Section>
      ) : null}
    </BasicDropdown>
  );
}

type ApplyDropdownActionButton = {
  label: ReactNode;
  onClick: (targetRoot: ApplyDropdownTarget) => void;
  color: ComponentProps<typeof Button>["color"];
  loading?: boolean;
  disabled?: boolean;
};

type ApplyDropdownActions = {
  primary: ApplyDropdownActionButton;
  secondary?: ApplyDropdownActionButton;
};

function isActionConfig(
  actions: ReactNode | ApplyDropdownActions,
): actions is ApplyDropdownActions {
  return Boolean(
    actions && typeof actions === "object" && "primary" in actions,
  );
}

function ApplyResultPaths({
  appliedPaths,
  skippedPaths,
  conflictedPaths,
}: {
  appliedPaths: Array<string>;
  skippedPaths: Array<string>;
  conflictedPaths: Array<string>;
}): ReactElement {
  const hasFiles =
    appliedPaths.length + skippedPaths.length + conflictedPaths.length > 0;

  if (!hasFiles) {
    return (
      <div className="p-2 text-sm text-token-description-foreground">
        <FormattedMessage
          id="codex.applyDropdown.results.empty"
          defaultMessage="No files were copied"
          description="Fallback text when no files were applied from an apply operation"
        />
      </div>
    );
  }

  return (
    <div className="vertical-scroll-fade-mask flex max-h-64 flex-col gap-3 overflow-y-auto rounded-lg p-2">
      <LabeledFileSection
        paths={appliedPaths}
        className="text-token-description-foreground"
        Icon={CheckMdIcon}
      />
      <LabeledFileSection
        label={
          <FormattedMessage
            id="codex.applyDropdown.results.skipped"
            defaultMessage="{count, plural, one {1 file skipped:} other {{count} files skipped:}}"
            description="Heading for skipped files after apply"
            values={{ count: skippedPaths.length }}
          />
        }
        paths={skippedPaths}
        className="text-token-description-foreground"
        Icon={XIcon}
      />
      <LabeledFileSection
        label={
          <FormattedMessage
            id="codex.applyDropdown.results.conflicted"
            defaultMessage="{count, plural, one {1 file conflicted:} other {{count} files conflicted:}}"
            description="Heading for conflicted files after apply"
            values={{ count: conflictedPaths.length }}
          />
        }
        paths={conflictedPaths}
        className="text-token-editor-warning-foreground"
        Icon={XIcon}
      />
    </div>
  );
}

function LabeledFileSection({
  label,
  paths,
  className,
  Icon,
}: {
  label?: ReactNode;
  paths: Array<string>;
  className?: string;
  Icon: ComponentType<{ className?: string }>;
}): ReactElement | null {
  if (paths.length === 0) {
    return null;
  }

  return (
    <div className={clsx("flex flex-col gap-1.5 text-sm", className)}>
      {label ? (
        <div className="whitespace-nowrap text-token-description-foreground">
          {label}
        </div>
      ) : null}
      {paths.map(
        (filePath): ReactElement => (
          <ApplyResultRow key={filePath} filePath={filePath} Icon={Icon} />
        ),
      )}
    </div>
  );
}

function ApplyResultRow({
  filePath,
  Icon,
}: {
  filePath: string;
  Icon: ComponentType<{ className?: string }>;
}): ReactElement {
  const fileName = path.basename(filePath);
  const parentName = path.basename(path.dirname(filePath));
  const displayPath =
    parentName && parentName !== "." ? `${parentName}/${fileName}` : fileName;

  return (
    <div
      className="flex items-center gap-2 truncate text-base text-token-foreground"
      title={filePath}
    >
      <Icon className="icon-2xs shrink-0" />
      <span className="truncate">{displayPath}</span>
    </div>
  );
}
