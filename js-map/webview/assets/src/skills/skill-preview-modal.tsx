import clsx from "clsx";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { FormattedMessage } from "react-intl";

import { Markdown } from "@/components/markdown";
import { ProseModal } from "@/components/prose-modal";
import { Spinner } from "@/components/spinner";
import { useSkillMarkdown } from "@/skills/use-skill-markdown";

const SKILL_MARKDOWN_HEADING_BASE_CLASS_NAME = "font-semibold";

export function SkillPreviewModal({
  icon,
  title,
  titleText,
  titleClassName,
  description,
  isOpen,
  onOpenChange,
  footer,
  children,
}: {
  icon: ReactElement | null;
  title: ReactNode;
  titleText?: string;
  titleClassName?: string;
  description: ReactNode;
  isOpen: boolean;
  onOpenChange: (nextValue: boolean) => void;
  footer?: ReactNode;
  children: ReactNode;
}): ReactElement {
  return (
    <ProseModal
      icon={icon == null ? null : <SkillPreviewModalIcon icon={icon} />}
      iconClassName="h-auto w-auto rounded-none border-0 !p-0"
      iconBackgroundClassName="bg-transparent"
      title={title}
      titleText={titleText}
      titleClassName={titleClassName}
      description={description}
      descriptionText={
        typeof description === "string" ? description : undefined
      }
      descriptionClassName="text-lg"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      closeLabel={
        <FormattedMessage
          id="common.close"
          defaultMessage="Close"
          description="Close button label"
        />
      }
      scrollFade={false}
      footer={footer}
    >
      {children}
    </ProseModal>
  );
}

function SkillPreviewModalIcon({ icon }: { icon: ReactElement }): ReactElement {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-token-border-default text-token-text-secondary">
      {icon}
    </span>
  );
}

export function SkillPreviewModalTitle({
  badge,
  kind,
  title,
}: {
  badge?: ReactNode;
  kind: "App" | "Skill";
  title: ReactNode;
}): ReactElement {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="min-w-0 truncate">{title}</div>
      {badge}
      <div className="heading-dialog shrink-0 font-normal text-token-text-secondary">
        {kind}
      </div>
    </div>
  );
}

export function SkillPreviewModalContent({
  children,
  className,
  surfaceClassName,
  scrollClassName,
}: {
  children: ReactNode;
  className?: string;
  surfaceClassName?: string;
  scrollClassName?: string;
}): ReactElement {
  return (
    <div className={clsx("flex h-full min-h-0 flex-col pt-4", className)}>
      <div
        className={clsx(
          "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-token-border-default/70 bg-token-bg-primary/40",
          surfaceClassName,
        )}
      >
        <div
          className={clsx("h-full min-h-0 overflow-y-auto", scrollClassName)}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function SkillMarkdownPreviewBody({
  isOpen,
  skillPath,
  titleText,
}: {
  isOpen: boolean;
  skillPath: string | null;
  titleText?: string;
}): ReactElement {
  const { markdown, isFetching, error } = useSkillMarkdown({
    path: skillPath,
    expectedTitle: titleText,
    enabled: isOpen && skillPath != null,
  });
  const hasError = error != null || (isOpen && skillPath == null);

  return (
    <SkillPreviewModalContent scrollClassName="p-4">
      {isFetching ? (
        <div className="flex items-center gap-2 text-sm text-token-text-secondary">
          <Spinner className="icon-xs" />
          <FormattedMessage
            id="skills.card.loadingContents"
            defaultMessage="Loading skill contents..."
            description="Loading label when fetching a skill file preview"
          />
        </div>
      ) : hasError ? (
        <div className="text-sm text-token-text-secondary">
          <FormattedMessage
            id="skills.card.contentsError"
            defaultMessage="Unable to load skill contents."
            description="Error message when a skill file preview fails"
          />
        </div>
      ) : (
        <Markdown
          className="text-sm"
          components={{
            h1: SkillMarkdownH1,
            h2: SkillMarkdownH2,
          }}
          cwd={null}
        >
          {markdown}
        </Markdown>
      )}
    </SkillPreviewModalContent>
  );
}

function SkillMarkdownH1({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLHeadingElement>): ReactElement {
  return (
    <h1
      {...rest}
      className={clsx(
        SKILL_MARKDOWN_HEADING_BASE_CLASS_NAME,
        "heading-base mt-4 mb-2",
        className,
      )}
    >
      {children}
    </h1>
  );
}

function SkillMarkdownH2({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLHeadingElement>): ReactElement {
  return (
    <h2
      {...rest}
      className={clsx(
        SKILL_MARKDOWN_HEADING_BASE_CLASS_NAME,
        "text-sm mt-3 mb-1.5",
        className,
      )}
    >
      {children}
    </h2>
  );
}
