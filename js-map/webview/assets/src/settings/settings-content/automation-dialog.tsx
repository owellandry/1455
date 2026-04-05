import type * as AppServer from "app-server-types";
import clsx from "clsx";
import {
  createGitCwd,
  getAutomationModelDetails,
  getAutomationReasoningEffort,
  getAutomationReasoningOptions,
  type AutomationKind,
  type AutomationExecutionEnvironment,
  type GitCwd,
} from "protocol";
import type {
  ComponentType,
  Dispatch,
  ReactElement,
  ReactNode,
  SVGProps,
  SetStateAction,
} from "react";
import { useEffect, useId, useRef, useState } from "react";
import {
  FormattedMessage,
  useIntl,
  type IntlShape,
  type MessageDescriptor,
} from "react-intl";

import { AUTOMATION_CREATE_SUBTITLE } from "@/automations/automation-copy";
import { getAutomationModelLabel } from "@/automations/automation-model-settings";
import {
  changeScheduleMode,
  formatScheduleSummary,
  normalizeIntervalHours,
  normalizeIntervalMinutes,
  type RruleWeekday,
  type ScheduleConfig,
  type ScheduleMode,
} from "@/automations/automation-schedule";
import {
  applyAutomationTemplateToDraft,
  getDraftForAutomationKind,
  type AutomationDraft,
  type AutomationTemplateSelection,
} from "@/automations/automation-shared";
import { getAutomationSubmitTooltipContent } from "@/automations/automation-submit-tooltip";
import { useHeartbeatAutomationThreadOptions } from "@/automations/heartbeat-thread-options";
import { AnimatedOverlaySwitch } from "@/components/animated-overlay-switch";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import {
  DIALOG_FOOTER_COMPACT,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";

import "prosemirror-view/style/prosemirror.css";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { MoreMenuTrigger } from "@/components/more-menu-trigger";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import { Tooltip } from "@/components/tooltip";
import { ReasoningEffortLabelMessage } from "@/composer/model-and-reasoning-effort-translations";
import { CODEX_RULES_URL } from "@/constants/links";
import CheckIcon from "@/icons/check-md.svg";
import ChevronDownIcon from "@/icons/chevron.svg";
import ClockIcon from "@/icons/clock.svg";
import CubeIcon from "@/icons/cube.svg";
import FolderIcon from "@/icons/folder.svg";
import HeartIcon from "@/icons/heart.svg";
import InfoIcon from "@/icons/info.svg";
import LaptopIcon from "@/icons/laptop.svg";
import PinIcon from "@/icons/pin.svg";
import ReasoningExtraHighIcon from "@/icons/reasoning-extra-high.svg";
import ReasoningHighIcon from "@/icons/reasoning-high.svg";
import ReasoningLowIcon from "@/icons/reasoning-low.svg";
import ReasoningMediumIcon from "@/icons/reasoning-medium.svg";
import ReasoningMinimalIcon from "@/icons/reasoning-minimal.svg";
import WorktreeIcon from "@/icons/worktree.svg";
import { AutomationTemplateGrid } from "@/inbox/automation-empty-state-prompts";
import { isEnglishLocaleCode } from "@/intl/locale-resolver";
import {
  addTransactionListener,
  createPromptEditorController,
  RichTextInput,
  SkillMentionAutocompleteOverlay,
  useSkillMentionAutocomplete,
} from "@/prompt-editor";
import { useEnabledInstalledApps } from "@/queries/apps-queries";
import { useUserConfig } from "@/queries/config-queries";
import { useListModels } from "@/queries/model-queries";
import type { RepositoryTaskGroups } from "@/sidebar/use-repository-task-groups";
import { useSkills } from "@/skills/use-skills";
import { useGate } from "@/statsig/statsig";
import type { ReasoningEffortKey } from "@/types/models";
import { formatModelDisplayName } from "@/utils/format-model-display-name";
import { useDebouncedValue } from "@/utils/use-debounced-value";

import type { Option } from "./multiselect";

const SECTION_CLASSNAME = "flex flex-col gap-2";
const FIELD_CLASSNAME =
  "bg-token-input-background text-token-input-foreground placeholder:text-token-input-placeholder-foreground w-full rounded-md border border-token-input-border px-2.5 py-1.5 text-base outline-none focus:border-token-focus-border";
const TITLE_INPUT_CLASSNAME =
  "text-token-input-foreground placeholder:text-token-input-placeholder-foreground m-0 w-full min-w-0 appearance-none bg-transparent p-0 text-lg leading-tight outline-none";
const DIALOG_PROMPT_INPUT_CLASSNAME = clsx(
  "text-token-input-foreground placeholder:text-token-input-placeholder-foreground w-full text-base outline-none",
  "min-h-[16rem] max-h-[32rem]",
  "[&_.ProseMirror]:px-0",
  "[&_.ProseMirror]:py-0",
);
const INLINE_PROMPT_INPUT_CLASSNAME = clsx(
  "text-token-input-foreground placeholder:text-token-input-placeholder-foreground w-full text-base outline-none",
  "min-h-[16rem] max-h-[32rem]",
  "[&_.ProseMirror]:px-0",
  "[&_.ProseMirror]:py-0",
);
const EXPANDED_PROMPT_INPUT_CLASSNAME = clsx(
  "text-token-input-foreground placeholder:text-token-input-placeholder-foreground w-full text-base outline-none",
  "min-h-[16rem] max-h-none overflow-visible",
  "[&_.ProseMirror]:px-0",
  "[&_.ProseMirror]:py-0",
);
const AUTOMATION_TITLE_TOOLTIP_CLASSNAME = "max-w-lg text-center";
const AUTOMATION_TEMPLATE_MIN_HEIGHT = 360;
const AUTOMATION_TEMPLATE_HEIGHT_OFFSET = 208;
const AUTOMATION_TEMPLATE_GRID_FADE_MS = 700;
const REASONING_ICON_BY_EFFORT: Record<
  ReasoningEffortKey,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  none: ReasoningMinimalIcon,
  minimal: ReasoningMinimalIcon,
  low: ReasoningLowIcon,
  medium: ReasoningMediumIcon,
  high: ReasoningHighIcon,
  xhigh: ReasoningExtraHighIcon,
};

const SCHEDULE_MODE_OPTIONS: Array<{
  id: ScheduleMode;
  labelMessage: MessageDescriptor;
}> = [
  {
    id: "hourly",
    labelMessage: {
      id: "settings.automations.scheduleMode.hourly",
      defaultMessage: "Hourly",
      description: "Dropdown label for an hourly automation schedule",
    },
  },
  {
    id: "daily",
    labelMessage: {
      id: "settings.automations.scheduleMode.daily",
      defaultMessage: "Daily",
      description: "Dropdown label for a daily automation schedule",
    },
  },
  {
    id: "weekdays",
    labelMessage: {
      id: "settings.automations.scheduleMode.weekdays",
      defaultMessage: "Weekdays",
      description: "Dropdown label for a weekdays-only automation schedule",
    },
  },
  {
    id: "weekly",
    labelMessage: {
      id: "settings.automations.scheduleMode.weekly",
      defaultMessage: "Weekly",
      description: "Dropdown label for a weekly automation schedule",
    },
  },
  {
    id: "custom",
    labelMessage: {
      id: "settings.automations.scheduleMode.custom",
      defaultMessage: "Custom",
      description: "Dropdown label for a custom automation schedule",
    },
  },
];

const EXECUTION_ENVIRONMENT_OPTIONS: Array<{
  id: AutomationExecutionEnvironment;
  labelMessage: MessageDescriptor;
  tooltipMessage: MessageDescriptor;
}> = [
  {
    id: "local",
    labelMessage: {
      id: "settings.automations.executionEnvironment.local",
      defaultMessage: "Local",
      description:
        "Dropdown label for running automations locally in the selected project",
    },
    tooltipMessage: {
      id: "settings.automations.executionEnvironment.local.help",
      defaultMessage:
        "Runs directly in the selected project directory without creating a worktree.",
      description: "Tooltip explaining local execution mode for automations",
    },
  },
  {
    id: "worktree",
    labelMessage: {
      id: "settings.automations.executionEnvironment.worktree",
      defaultMessage: "Worktree",
      description: "Dropdown label for running automations in a worktree",
    },
    tooltipMessage: {
      id: "settings.automations.executionEnvironment.worktree.help",
      defaultMessage:
        "Runs in a dedicated Git worktree created from the selected project, keeping your current checkout untouched.",
      description: "Tooltip explaining worktree execution mode for automations",
    },
  },
];

const WEEKDAY_OPTIONS: Array<{
  id: RruleWeekday;
  labelMessage: MessageDescriptor;
  longLabelMessage: MessageDescriptor;
}> = [
  {
    id: "MO",
    labelMessage: {
      id: "settings.automations.rrule.weekday.mon",
      defaultMessage: "Mo",
      description: "RRULE weekday short label",
    },
    longLabelMessage: {
      id: "settings.automations.rrule.weekday.monday",
      defaultMessage: "Monday",
      description: "RRULE weekday long label",
    },
  },
  {
    id: "TU",
    labelMessage: {
      id: "settings.automations.rrule.weekday.tue",
      defaultMessage: "Tu",
      description: "RRULE weekday short label",
    },
    longLabelMessage: {
      id: "settings.automations.rrule.weekday.tuesday",
      defaultMessage: "Tuesday",
      description: "RRULE weekday long label",
    },
  },
  {
    id: "WE",
    labelMessage: {
      id: "settings.automations.rrule.weekday.wed",
      defaultMessage: "We",
      description: "RRULE weekday short label",
    },
    longLabelMessage: {
      id: "settings.automations.rrule.weekday.wednesday",
      defaultMessage: "Wednesday",
      description: "RRULE weekday long label",
    },
  },
  {
    id: "TH",
    labelMessage: {
      id: "settings.automations.rrule.weekday.thu",
      defaultMessage: "Th",
      description: "RRULE weekday short label",
    },
    longLabelMessage: {
      id: "settings.automations.rrule.weekday.thursday",
      defaultMessage: "Thursday",
      description: "RRULE weekday long label",
    },
  },
  {
    id: "FR",
    labelMessage: {
      id: "settings.automations.rrule.weekday.fri",
      defaultMessage: "Fr",
      description: "RRULE weekday short label",
    },
    longLabelMessage: {
      id: "settings.automations.rrule.weekday.friday",
      defaultMessage: "Friday",
      description: "RRULE weekday long label",
    },
  },
  {
    id: "SA",
    labelMessage: {
      id: "settings.automations.rrule.weekday.sat",
      defaultMessage: "Sa",
      description: "RRULE weekday short label",
    },
    longLabelMessage: {
      id: "settings.automations.rrule.weekday.saturday",
      defaultMessage: "Saturday",
      description: "RRULE weekday long label",
    },
  },
  {
    id: "SU",
    labelMessage: {
      id: "settings.automations.rrule.weekday.sun",
      defaultMessage: "Su",
      description: "RRULE weekday short label",
    },
    longLabelMessage: {
      id: "settings.automations.rrule.weekday.sunday",
      defaultMessage: "Sunday",
      description: "RRULE weekday long label",
    },
  },
];

/** Create/edit automation dialog (prompt uses ProseMirror w/ skill mentions). */
export function AutomationCreateDialogTitle({
  learnMoreHref,
}: {
  learnMoreHref: string;
}): ReactElement {
  const intl = useIntl();

  return (
    <Tooltip
      tooltipContent={
        <FormattedMessage
          {...AUTOMATION_CREATE_SUBTITLE}
          values={{
            learnMoreLink: (chunks: ReactNode): ReactElement => (
              <a
                className="text-token-link underline-offset-2 hover:underline"
                href={learnMoreHref}
                rel="noreferrer"
                target="_blank"
              >
                {chunks}
              </a>
            ),
          }}
        />
      }
      side="top"
      align="center"
      tooltipClassName={AUTOMATION_TITLE_TOOLTIP_CLASSNAME}
    >
      <button
        type="button"
        className="inline-flex shrink-0 items-center justify-center text-token-description-foreground hover:text-token-foreground"
        aria-label={intl.formatMessage({
          id: "settings.automations.dialog.info",
          defaultMessage: "Automation creation details",
          description:
            "Aria label for the automation creation info tooltip button",
        })}
      >
        <InfoIcon className="icon-sm" />
      </button>
    </Tooltip>
  );
}

export function AutomationTitleInput({
  id,
  value,
  autoFocus,
  onChange,
}: {
  id: string;
  value: string;
  autoFocus?: boolean;
  onChange: (nextValue: string) => void;
}): ReactElement {
  const intl = useIntl();

  return (
    <input
      id={id}
      data-testid="automation-title-input"
      autoFocus={autoFocus}
      className={TITLE_INPUT_CLASSNAME}
      aria-label={intl.formatMessage({
        id: "settings.automations.nameLabel",
        defaultMessage: "Name",
        description: "Label for automation name input",
      })}
      value={value}
      placeholder={intl.formatMessage({
        id: "settings.automations.namePlaceholder",
        defaultMessage: "Automation title",
        description: "Placeholder for automation name input",
      })}
      onChange={(event): void => {
        onChange(event.target.value);
      }}
    />
  );
}

export function AutomationSandboxTooltipButton({
  isReadOnlySandbox,
  isDangerFullAccess,
}: {
  isReadOnlySandbox: boolean;
  isDangerFullAccess: boolean;
}): ReactElement {
  const intl = useIntl();

  return (
    <Tooltip
      tooltipContent={
        <AutomationCreationPolicyBannerContent
          isReadOnlySandbox={isReadOnlySandbox}
          isDangerFullAccess={isDangerFullAccess}
        />
      }
      delayDuration={0}
      side="top"
      align="center"
      interactive
      tooltipClassName="max-w-md text-center"
    >
      <button
        type="button"
        className="inline-flex shrink-0 items-center justify-center text-token-description-foreground hover:text-token-foreground"
        aria-label={intl.formatMessage({
          id: "settings.automations.banner.tooltipLabel",
          defaultMessage: "Automation sandbox details",
          description:
            "Aria label for the automation sandbox details tooltip trigger",
        })}
      >
        <InfoIcon className="icon-sm" />
      </button>
    </Tooltip>
  );
}

export function AutomationDialogShell({
  children,
  open,
  onOpenChange,
  showDialogClose = true,
  size = "default",
  contentClassName,
  contentProps,
}: {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showDialogClose?: boolean;
  size?: "compact" | "default" | "wide" | "xwide" | "xxwide";
  contentClassName?: string;
  contentProps?: React.ComponentProps<typeof Dialog>["contentProps"];
}): ReactElement {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      showDialogClose={showDialogClose}
      size={size}
      contentClassName={clsx(
        "flex max-h-[95vh] flex-col overflow-hidden",
        contentClassName,
      )}
      contentProps={contentProps}
    >
      {children}
    </Dialog>
  );
}

function AutomationTemplatePicker({
  onSelectTemplateDraft,
}: {
  onSelectTemplateDraft: (draft: AutomationTemplateSelection) => void;
}): ReactElement {
  return (
    <AutomationTemplateGrid
      columns="two"
      onSelectAction={onSelectTemplateDraft}
    />
  );
}

export function AutomationCreateFlow({
  composer,
  open,
  onSelectTemplateDraft,
}: {
  composer: (templateToggleButton: ReactNode) => ReactNode;
  open: boolean;
  onSelectTemplateDraft: (draft: AutomationTemplateSelection) => void;
}): ReactElement {
  const intl = useIntl();
  const renderTemplateToggleButton = ({
    isOverlayOpen,
    openOverlay,
    closeOverlay,
  }: {
    isOverlayOpen: boolean;
    openOverlay: () => void;
    closeOverlay: () => void;
  }): ReactElement => {
    const toggleTemplateButtonAriaLabel = isOverlayOpen
      ? intl.formatMessage({
          id: "settings.automations.modal.collapse",
          defaultMessage: "Collapse automation modal",
          description:
            "Aria label for the automation modal button when leaving template mode",
        })
      : intl.formatMessage({
          id: "settings.automations.modal.expand",
          defaultMessage: "Expand automation modal",
          description:
            "Aria label for the automation modal button when entering template mode",
        });

    return (
      <Button
        type="button"
        data-testid="automation-template-toggle-button"
        aria-label={toggleTemplateButtonAriaLabel}
        color="outline"
        size="toolbar"
        className="shrink-0"
        onClick={(): void => {
          if (isOverlayOpen) {
            closeOverlay();
            return;
          }
          openOverlay();
        }}
      >
        {isOverlayOpen ? (
          <FormattedMessage
            id="settings.automations.modal.createNew"
            defaultMessage="Create new"
            description="Label for the automation modal button when template mode is active"
          />
        ) : (
          <FormattedMessage
            id="settings.automations.modal.useTemplate"
            defaultMessage="Use template"
            description="Label for the automation modal button when composer mode is active"
          />
        )}
      </Button>
    );
  };

  return (
    <AnimatedOverlaySwitch
      open={open}
      baseContent={({
        isOverlayOpen,
        openOverlay,
        closeOverlay,
      }): ReactNode => {
        return composer(
          renderTemplateToggleButton({
            isOverlayOpen,
            openOverlay,
            closeOverlay,
          }),
        );
      }}
      overlayContent={({ closeOverlayAndThen }): ReactNode => (
        <div className="flex h-full flex-col px-5 pt-[4rem] pb-4">
          <div className="vertical-scroll-fade-mask min-h-0 flex-1 overflow-y-auto">
            <AutomationTemplatePicker
              onSelectTemplateDraft={(selectedTemplateDraft): void => {
                closeOverlayAndThen(() => {
                  onSelectTemplateDraft(selectedTemplateDraft);
                });
              }}
            />
          </div>
        </div>
      )}
      overlayHeader={
        <div className="px-5 pt-5 pb-3">
          <div className="min-w-0 pr-32 text-lg leading-tight whitespace-nowrap text-token-foreground">
            <FormattedMessage
              id="settings.automations.modal.templateTitle"
              defaultMessage="Automation templates"
              description="Title shown in the automation modal when template mode is active"
            />
          </div>
        </div>
      }
      overlayHeightOffset={AUTOMATION_TEMPLATE_HEIGHT_OFFSET}
      minHeight={AUTOMATION_TEMPLATE_MIN_HEIGHT}
      overlayFadeDurationMs={AUTOMATION_TEMPLATE_GRID_FADE_MS}
      overlayHeaderClassName="pointer-events-none"
    >
      {({ isOverlayOpen, openOverlay, closeOverlay }): ReactNode => {
        if (!isOverlayOpen) {
          return null;
        }

        return (
          <div className="absolute top-5 right-4 z-20">
            {renderTemplateToggleButton({
              isOverlayOpen,
              openOverlay,
              closeOverlay,
            })}
          </div>
        );
      }}
    </AnimatedOverlaySwitch>
  );
}

export function AutomationDialog({
  open,
  onOpenChange,
  ...formProps
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: AutomationDraft;
  setDraft: Dispatch<SetStateAction<AutomationDraft>>;
  canSave: boolean;
  isEditing: boolean;
  isSaving: boolean;
  onDelete?: () => void;
  roots: Array<string>;
  formatRootLabel: (root: string) => string;
  workspaceGroups?: Array<RepositoryTaskGroups>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  formId?: string;
}): ReactElement {
  return (
    <AutomationForm
      {...formProps}
      variant="dialog"
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}

export function AutomationForm({
  draft,
  setDraft,
  canSave,
  isEditing,
  isSaving,
  onDelete,
  roots,
  formatRootLabel,
  workspaceGroups,
  onSubmit,
  onCancel,
  formId,
  variant = "inline",
  open,
  onOpenChange,
  forceShowNameInput,
  dialogSize = "xxwide",
  expandPrompt = false,
  allowedKinds,
}: {
  draft: AutomationDraft;
  setDraft: Dispatch<SetStateAction<AutomationDraft>>;
  canSave: boolean;
  isEditing: boolean;
  isSaving: boolean;
  onDelete?: () => void;
  roots: Array<string>;
  formatRootLabel: (root: string) => string;
  workspaceGroups?: Array<RepositoryTaskGroups>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  formId?: string;
  variant?: "dialog" | "inline";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  forceShowNameInput?: boolean;
  dialogSize?: "compact" | "wide" | "xwide" | "xxwide";
  expandPrompt?: boolean;
  allowedKinds?: Array<AutomationKind>;
}): ReactElement {
  const intl = useIntl();
  const formRef = useRef<HTMLFormElement>(null);
  const automationNameInputId = useId();
  const showNameInput =
    forceShowNameInput ?? (!isEditing || variant === "dialog");
  const [promptEditor] = useState(() => {
    // ProseMirror view must stay stable; we sync content via `setPromptText`.
    return createPromptEditorController("", {
      defaultTextKind: "prompt",
      enableFileMentions: false,
      enableSkillMentions: true,
      enterBehavior: "newline",
    });
  });
  const skillMentionAutocomplete = useSkillMentionAutocomplete(promptEditor);
  const debouncedSkillMentionQuery = useDebouncedValue(
    skillMentionAutocomplete.ui?.query ?? "",
    100,
  );
  const availableApps = useEnabledInstalledApps();
  const { skills: availableSkills } = useSkills(
    draft.cwds.length ? draft.cwds : undefined,
  );

  useEffect(() => {
    promptEditor.syncMentionMetadata({
      skills: availableSkills,
      apps: availableApps,
    });
  }, [availableApps, availableSkills, promptEditor]);

  useEffect(() => {
    if (promptEditor.getText() !== draft.prompt) {
      promptEditor.setPromptText(draft.prompt);
    }
  }, [draft.prompt, promptEditor]);

  useEffect(() => {
    return addTransactionListener(promptEditor.view, () => {
      const text = promptEditor.getText();
      setDraft((prev): AutomationDraft => {
        if (prev.prompt === text) {
          return prev;
        }
        return { ...prev, prompt: text };
      });
    });
  }, [promptEditor, setDraft]);

  const submitForm = (): void => {
    formRef.current?.requestSubmit();
  };

  const sortedRoots = [...roots].sort((a, b) =>
    formatRootLabel(a).localeCompare(formatRootLabel(b)),
  );
  const workspacePlaceholder = intl.formatMessage({
    id: "settings.automations.cwdPlaceholder",
    defaultMessage: "Choose a folder",
    description: "Placeholder for cwd select input",
  });
  const workspaceOptions = buildWorkspaceOptions({
    workspaceGroups,
    sortedRoots,
    formatRootLabel,
  });
  const { data: listModelsData } = useListModels();
  const modelsByType = listModelsData?.modelsByType;
  const { data: userConfigData } = useUserConfig();
  const heartbeatAutomationsEnabled = useGate(
    __statsigName("codex-app-automation-heartbeat"),
  );
  const allowedAutomationKinds =
    allowedKinds ??
    (heartbeatAutomationsEnabled
      ? (["cron", "heartbeat"] as Array<AutomationKind>)
      : (["cron"] as Array<AutomationKind>));
  const { options: heartbeatThreadOptions, hasPinnedThreads } =
    useHeartbeatAutomationThreadOptions(draft.targetThreadId);
  const isReadOnlySandbox = userConfigData?.config.sandbox_mode === "read-only";
  const isDangerFullAccess =
    userConfigData?.config.sandbox_mode === "danger-full-access";
  const scheduleConfig = draft.scheduleConfig;
  const scheduleMode = scheduleConfig.mode;
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showReasoningDropdown, setShowReasoningDropdown] = useState(false);
  const hideExecutionEnvironmentLabel =
    showModelDropdown || showReasoningDropdown;
  const hideReasoningLabel = showModelDropdown && showReasoningDropdown;
  const saveTooltipContent = canSave
    ? null
    : getAutomationSubmitTooltipContent({
        draft,
        intl,
        action: isEditing ? "save" : "create",
      });
  const isHeartbeatDraft = draft.kind === "heartbeat";
  const showKindControl = allowedAutomationKinds.includes("heartbeat");

  const updateScheduleDraft = (nextConfig: ScheduleConfig): void => {
    setDraft(
      (prev): AutomationDraft => ({
        ...prev,
        rawRrule: null,
        scheduleConfig: nextConfig,
        scheduleDirty: true,
      }),
    );
  };

  const Section = variant === "dialog" ? DialogSection : "div";
  const Body = variant === "dialog" ? DialogBody : "div";
  const bodyClassName =
    variant === "dialog" ? undefined : "flex flex-col gap-4";
  const promptInputClassName = expandPrompt
    ? EXPANDED_PROMPT_INPUT_CLASSNAME
    : variant === "dialog"
      ? DIALOG_PROMPT_INPUT_CLASSNAME
      : INLINE_PROMPT_INPUT_CLASSNAME;
  const renderNameInput = (autoFocus: boolean): ReactElement => (
    <AutomationTitleInput
      id={automationNameInputId}
      autoFocus={autoFocus}
      value={draft.name}
      onChange={(nextValue): void => {
        setDraft(
          (prev): AutomationDraft => ({
            ...prev,
            name: nextValue,
          }),
        );
      }}
    />
  );
  const hasDraftText = draft.name.length > 0 || draft.prompt.length > 0;
  const clearDraftText = (): void => {
    setDraft(
      (prev): AutomationDraft => ({
        ...prev,
        name: "",
        prompt: "",
      }),
    );
  };
  const renderForm = (createHeaderAction?: ReactNode): ReactElement => (
    <form
      id={formId}
      ref={formRef}
      className="flex flex-col gap-0"
      onSubmit={onSubmit}
    >
      <Body className={bodyClassName}>
        {variant === "dialog" && isEditing ? (
          <Section className="gap-1">
            <DialogHeader
              title={
                <FormattedMessage
                  id="settings.automations.dialog.editTitle"
                  defaultMessage="Edit automation"
                  description="Dialog title for editing an automation"
                />
              }
              subtitle={null}
            />
          </Section>
        ) : null}
        {variant === "dialog" && !isEditing && showNameInput ? (
          <Section className="gap-1">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">{renderNameInput(true)}</div>
              <div className="flex items-center gap-2">
                <AutomationSandboxTooltipButton
                  isReadOnlySandbox={isReadOnlySandbox}
                  isDangerFullAccess={isDangerFullAccess}
                />
                {hasDraftText ? (
                  <Button color="ghost" size="toolbar" onClick={clearDraftText}>
                    <FormattedMessage
                      id="settings.automations.clear"
                      defaultMessage="Clear"
                      description="Button label for clearing the automation title and prompt"
                    />
                  </Button>
                ) : null}
                {createHeaderAction}
              </div>
            </div>
          </Section>
        ) : null}
        {showNameInput && variant !== "dialog" ? (
          <Section className={SECTION_CLASSNAME}>
            {renderNameInput(!isEditing)}
          </Section>
        ) : null}
        <Section className={SECTION_CLASSNAME}>
          <div className="relative">
            <SkillMentionAutocompleteOverlay
              autocomplete={skillMentionAutocomplete}
              query={debouncedSkillMentionQuery}
              roots={draft.cwds.length ? draft.cwds : undefined}
              composerController={promptEditor}
              portalRoot="body"
              zIndexClassName="z-[10000]"
            />
            <RichTextInput
              className={promptInputClassName}
              composerController={promptEditor}
              ariaLabel={intl.formatMessage({
                id: "settings.automations.promptLabel",
                defaultMessage: "Prompt",
                description: "Label for automation prompt input",
              })}
              minHeight="14rem"
              disableAutoFocus={showNameInput && !isEditing}
              placeholder={intl.formatMessage({
                id: "settings.automations.promptPlaceholder",
                defaultMessage: "Add prompt e.g. look for crashes in $sentry",
                description: "Placeholder text for automations prompt input",
              })}
              onSkillMentionHandler={
                skillMentionAutocomplete.handleMentionEvent
              }
              onSubmit={submitForm}
            />
          </div>
        </Section>
        {variant === "dialog" ? (
          <Section>
            <DialogFooter className={clsx(DIALOG_FOOTER_COMPACT, "min-w-0")}>
              {isEditing && onDelete ? (
                <Button color="ghost" size="toolbar" onClick={onDelete}>
                  <FormattedMessage
                    id="settings.automations.delete"
                    defaultMessage="Delete"
                    description="Button label for deleting an automation"
                  />
                </Button>
              ) : null}
              <div className="flex items-center gap-2">
                {showKindControl ? (
                  <AutomationKindDropdown
                    selectedKind={draft.kind}
                    className="shrink-0"
                    disabled={isEditing}
                    onSelect={(nextKind): void => {
                      setDraft(
                        (prev): AutomationDraft =>
                          getDraftForAutomationKind(prev, nextKind),
                      );
                    }}
                  />
                ) : null}
                {isHeartbeatDraft ? (
                  <HeartbeatThreadDropdown
                    selectedThreadId={draft.targetThreadId}
                    options={heartbeatThreadOptions}
                    hasPinnedThreads={hasPinnedThreads}
                    className="shrink-0"
                    disabled={isEditing}
                    onSelect={(nextThreadId): void => {
                      setDraft(
                        (prev): AutomationDraft => ({
                          ...prev,
                          targetThreadId: nextThreadId,
                        }),
                      );
                    }}
                  />
                ) : (
                  <>
                    <ExecutionEnvironmentDropdown
                      selectedId={draft.executionEnvironment ?? "worktree"}
                      className="shrink-0"
                      showLabel={!hideExecutionEnvironmentLabel}
                      onSelect={(nextEnvironment): void => {
                        setDraft(
                          (prev): AutomationDraft => ({
                            ...prev,
                            executionEnvironment: nextEnvironment,
                          }),
                        );
                      }}
                      ariaLabel={intl.formatMessage({
                        id: "settings.automations.executionEnvironment.ariaLabel",
                        defaultMessage: "Execution environment",
                        description:
                          "Aria label for execution environment dropdown",
                      })}
                    />
                    <ProjectDropdown
                      selectedRoots={draft.cwds}
                      options={workspaceOptions}
                      placeholder={workspacePlaceholder}
                      className="shrink-0"
                      onChange={(nextRoots): void => {
                        setDraft(
                          (prev): AutomationDraft => ({
                            ...prev,
                            cwds: nextRoots,
                          }),
                        );
                      }}
                    />
                  </>
                )}
                <ScheduleSummaryPopoverTrigger
                  scheduleMode={scheduleMode}
                  scheduleConfig={scheduleConfig}
                  className="shrink-0"
                  allowedModes={isHeartbeatDraft ? ["hourly"] : undefined}
                  intervalStyle={isHeartbeatDraft ? "heartbeat" : "default"}
                  onUpdateScheduleDraft={updateScheduleDraft}
                />
                {!isHeartbeatDraft && showModelDropdown ? (
                  <AutomationModelDropdown
                    selectedModel={draft.model}
                    className="shrink-0"
                    onSelect={(nextModel): void => {
                      setDraft(
                        (prev): AutomationDraft => ({
                          ...prev,
                          model: nextModel,
                          reasoningEffort: getAutomationReasoningEffort({
                            model: getAutomationModelDetails(
                              modelsByType?.models ?? [],
                              nextModel,
                            ),
                            reasoningEffort: prev.reasoningEffort,
                          }),
                        }),
                      );
                    }}
                  />
                ) : null}
                {!isHeartbeatDraft && showReasoningDropdown ? (
                  <AutomationReasoningEffortDropdown
                    model={draft.model}
                    reasoningEffort={draft.reasoningEffort}
                    className="shrink-0"
                    showLabel={!hideReasoningLabel}
                    onSelect={(nextReasoningEffort): void => {
                      setDraft(
                        (prev): AutomationDraft => ({
                          ...prev,
                          reasoningEffort: nextReasoningEffort,
                        }),
                      );
                    }}
                  />
                ) : null}
                {!isHeartbeatDraft ? (
                  <AutomationExtraControlsDropdown
                    showModelDropdown={showModelDropdown}
                    showReasoningDropdown={showReasoningDropdown}
                    onToggleModelDropdown={setShowModelDropdown}
                    onToggleReasoningDropdown={setShowReasoningDropdown}
                  />
                ) : null}
              </div>
              <div className="flex-1" />
              <div className="flex shrink-0 items-center gap-2">
                <Button color="ghost" onClick={onCancel}>
                  <FormattedMessage
                    id="settings.automations.cancel"
                    defaultMessage="Cancel"
                    description="Cancel button label for automations dialog"
                  />
                </Button>
                <Tooltip
                  tooltipContent={saveTooltipContent}
                  disabled={canSave || isSaving || saveTooltipContent == null}
                >
                  <span className="inline-flex">
                    <Button
                      color="primary"
                      type="submit"
                      loading={isSaving}
                      disabled={!canSave}
                      className="disabled:cursor-default"
                    >
                      <FormattedMessage
                        id="settings.automations.save"
                        defaultMessage="Save"
                        description="Save button label for automations dialog"
                      />
                    </Button>
                  </span>
                </Tooltip>
              </div>
            </DialogFooter>
          </Section>
        ) : null}
      </Body>
    </form>
  );

  if (variant === "dialog") {
    const dialogOpen = open ?? false;
    const handleTemplateSelection = (
      selectedTemplateDraft: AutomationTemplateSelection,
    ): void => {
      setDraft((prev): AutomationDraft => {
        return applyAutomationTemplateToDraft(prev, selectedTemplateDraft);
      });
    };

    return (
      <AutomationDialogShell
        open={dialogOpen}
        onOpenChange={onOpenChange ?? ((): void => {})}
        size={dialogSize}
        showDialogClose
        contentProps={{
          onEscapeKeyDown: (event): void => {
            if (skillMentionAutocomplete.ui?.active) {
              event.preventDefault();
            }
          },
          style: isEditing ? undefined : { height: "auto" },
        }}
      >
        {isEditing ? (
          renderForm()
        ) : (
          <AutomationCreateFlow
            composer={renderForm}
            open={dialogOpen}
            onSelectTemplateDraft={handleTemplateSelection}
          />
        )}
      </AutomationDialogShell>
    );
  }

  return renderForm();
}

function AutomationCreationPolicyBannerContent({
  isReadOnlySandbox,
  isDangerFullAccess,
}: {
  isReadOnlySandbox: boolean;
  isDangerFullAccess: boolean;
}): ReactElement {
  if (isDangerFullAccess) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-token-error-foreground">
          <FormattedMessage
            id="settings.automations.banner.danger"
            defaultMessage="Automations run with your default sandbox settings, which are currently set to Full Access. Running background automations with Full Access carries elevated risk, as Codex may modify files, run commands, and access network without asking. Consider updating sandbox settings to workspace write, and using <rulesDocsLink>rules</rulesDocsLink> to selectively define which commands the agent can run with full access."
            description="Warning shown in the automation create modal when dangerous sandbox mode is enabled"
            values={{
              rulesDocsLink: (chunks: ReactNode): ReactElement => {
                const linkText = Array.isArray(chunks)
                  ? chunks.join("")
                  : chunks;
                return (
                  <a
                    className="text-token-error-foreground underline underline-offset-2 hover:underline"
                    href={CODEX_RULES_URL}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {linkText}
                  </a>
                );
              },
            }}
          />
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <p>
        {isReadOnlySandbox ? (
          <FormattedMessage
            id="settings.automations.banner.defaultHowTo.readOnly"
            defaultMessage="Automations run with your default sandbox settings, which are set to read-only. Tool calls will fail if they require modifying files, accessing network, or working with apps on your computer. Consider updating sandbox settings to workspace write."
            description="Follow-up guidance shown in the automation create modal when default sandbox mode is read-only"
          />
        ) : (
          <FormattedMessage
            id="settings.automations.banner.defaultHowTo.default"
            defaultMessage="Automations run with your default sandbox settings. Tool calls will fail if they require modifying files outside the workspace, accessing network, or working with apps on your computer. You can selectively allowlist commands to run outside the sandbox using <rulesDocsLink>rules</rulesDocsLink>."
            description="Follow-up guidance shown in the automation create modal when default sandbox mode is workspace write"
            values={{
              rulesDocsLink: (chunks: ReactNode): ReactElement => {
                const linkText = Array.isArray(chunks)
                  ? chunks.join("")
                  : chunks;
                return (
                  <a
                    className="text-token-link underline-offset-2 hover:underline"
                    href={CODEX_RULES_URL}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {linkText}
                  </a>
                );
              },
            }}
          />
        )}
      </p>
    </div>
  );
}

export function ScheduleSummaryPopoverTrigger({
  scheduleMode,
  scheduleConfig,
  className,
  showIcon = true,
  allowedModes,
  intervalStyle = "default",
  onUpdateScheduleDraft,
}: {
  scheduleMode: ScheduleMode;
  scheduleConfig: ScheduleConfig;
  className?: string;
  showIcon?: boolean;
  allowedModes?: Array<ScheduleMode>;
  intervalStyle?: "default" | "heartbeat";
  onUpdateScheduleDraft: (nextConfig: ScheduleConfig) => void;
}): ReactElement {
  const intl = useIntl();
  const scheduleSummaryLabel = buildScheduleSummaryLabel({
    scheduleConfig,
    intl,
  });
  const selectedWeeklyDay = scheduleConfig.weekdays[0] ?? WEEKDAY_OPTIONS[0].id;
  const selectedWeeklyDayOption =
    WEEKDAY_OPTIONS.find((weekday) => weekday.id === selectedWeeklyDay) ??
    WEEKDAY_OPTIONS[0];
  const scheduleTimeLabel = intl.formatMessage({
    id: "settings.automations.scheduleTime",
    defaultMessage: "Time",
    description: "Accessible label for the automation schedule time input",
  });

  const updateSchedule = (nextConfig: Partial<ScheduleConfig>): void => {
    onUpdateScheduleDraft({
      ...scheduleConfig,
      ...nextConfig,
    });
  };
  const scheduleModeOptions = SCHEDULE_MODE_OPTIONS.filter((option): boolean =>
    allowedModes == null ? true : allowedModes.includes(option.id),
  );
  const showScheduleModeDropdown = scheduleModeOptions.length > 1;
  const isHeartbeatIntervalOnly =
    intervalStyle === "heartbeat" &&
    allowedModes?.length === 1 &&
    allowedModes[0] === "hourly";
  const showIntervalInput =
    allowedModes?.length === 1 && allowedModes[0] === "hourly";
  const intervalValue = isHeartbeatIntervalOnly
    ? (scheduleConfig.intervalMinutes ?? 30)
    : scheduleConfig.intervalHours;
  const intervalUnitLabel = isHeartbeatIntervalOnly
    ? intervalValue === 1
      ? intl.formatMessage({
          id: "settings.automations.scheduleIntervalMinuteSuffix",
          defaultMessage: "minute",
          description:
            "Singular suffix label for the heartbeat automation interval minutes input",
        })
      : intl.formatMessage({
          id: "settings.automations.scheduleIntervalMinutesSuffix",
          defaultMessage: "minutes",
          description:
            "Plural suffix label for the heartbeat automation interval minutes input",
        })
    : intl.formatMessage({
        id: "settings.automations.scheduleIntervalHoursSuffix",
        defaultMessage: "hours",
        description: "Suffix label for the automation interval hours input",
      });
  const intervalAriaLabel = isHeartbeatIntervalOnly
    ? intl.formatMessage({
        id: "settings.automations.scheduleIntervalMinutes",
        defaultMessage: "Interval minutes",
        description:
          "Accessible label for the heartbeat interval minutes input",
      })
    : intl.formatMessage({
        id: "settings.automations.scheduleIntervalHours",
        defaultMessage: "Interval hours",
        description: "Accessible label for the automation interval hours input",
      });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          color="ghost"
          size="composerSm"
          className={clsx("min-w-0", className)}
        >
          {showIcon ? <ClockIcon className="icon-xs shrink-0" /> : null}
          <span className="truncate text-left text-token-foreground">
            {scheduleSummaryLabel}
          </span>
          <ChevronDownIcon className="icon-2xs shrink-0 text-token-input-placeholder-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="!w-40 min-w-40">
        <div className="flex w-full flex-col gap-1">
          <Dropdown.Title>
            {isHeartbeatIntervalOnly ? (
              <FormattedMessage
                id="settings.automations.intervalPopoverTitle"
                defaultMessage="Interval"
                description="Header label above heartbeat automation interval controls"
              />
            ) : (
              <FormattedMessage
                id="settings.automations.schedulePopoverTitle"
                defaultMessage="Schedule"
                description="Header label above automation schedule controls"
              />
            )}
          </Dropdown.Title>
          {showScheduleModeDropdown ? (
            <ScheduleDropdown
              ariaLabel={intl.formatMessage({
                id: "settings.automations.scheduleModeLabel",
                defaultMessage: "Schedule type",
                description: "Aria label for schedule type dropdown",
              })}
              className="w-full"
              options={scheduleModeOptions.map((option) => ({
                id: option.id,
                label: intl.formatMessage(option.labelMessage),
              }))}
              selectedId={scheduleMode}
              selectedLabel={intl.formatMessage(
                (
                  scheduleModeOptions.find(
                    (option) => option.id === scheduleMode,
                  ) ?? scheduleModeOptions[0]
                ).labelMessage,
              )}
              onSelect={(nextMode): void => {
                onUpdateScheduleDraft(
                  changeScheduleMode(scheduleConfig, nextMode),
                );
              }}
            />
          ) : null}
          {scheduleMode === "hourly" && showIntervalInput ? (
            <label className="text-token-secondary flex items-center gap-2 text-sm">
              <span className="shrink-0">
                <FormattedMessage
                  id="settings.automations.scheduleIntervalLabel"
                  defaultMessage="Every"
                  description="Label for the automation interval input"
                />
              </span>
              <input
                aria-label={intervalAriaLabel}
                className={clsx(FIELD_CLASSNAME, "w-20 text-sm")}
                inputMode="numeric"
                pattern="[0-9]*"
                type="text"
                value={String(intervalValue)}
                onChange={(event): void => {
                  const rawValue = event.currentTarget.value.replaceAll(
                    /[^0-9]/g,
                    "",
                  );
                  if (rawValue.length === 0) {
                    return;
                  }
                  if (isHeartbeatIntervalOnly) {
                    const nextIntervalMinutes = normalizeIntervalMinutes(
                      Number(rawValue),
                    );
                    if (nextIntervalMinutes == null) {
                      return;
                    }
                    updateSchedule({ intervalMinutes: nextIntervalMinutes });
                    return;
                  }
                  const nextIntervalHours = normalizeIntervalHours(
                    Number(rawValue),
                  );
                  if (nextIntervalHours == null) {
                    return;
                  }
                  updateSchedule({ intervalHours: nextIntervalHours });
                }}
              />
              <span className="shrink-0">{intervalUnitLabel}</span>
            </label>
          ) : null}
          {scheduleMode === "weekly" ? (
            <ScheduleDropdown
              ariaLabel={intl.formatMessage({
                id: "settings.automations.scheduleWeekday",
                defaultMessage: "Day",
                description:
                  "Accessible label for the weekly automation day selector",
              })}
              className="w-full"
              options={WEEKDAY_OPTIONS.map((weekday) => ({
                id: weekday.id,
                label: intl.formatMessage(weekday.longLabelMessage),
              }))}
              selectedId={selectedWeeklyDayOption.id}
              selectedLabel={intl.formatMessage(
                selectedWeeklyDayOption.longLabelMessage,
              )}
              onSelect={(weekday): void => {
                updateSchedule({ weekdays: [weekday] });
              }}
            />
          ) : null}
          {scheduleMode === "daily" ||
          scheduleMode === "weekdays" ||
          scheduleMode === "weekly" ? (
            <input
              aria-label={scheduleTimeLabel}
              className={clsx(FIELD_CLASSNAME, "w-full text-sm")}
              type="time"
              value={scheduleConfig.time}
              onChange={(event): void => {
                updateSchedule({ time: event.target.value });
              }}
            />
          ) : null}
          {scheduleMode === "custom" ? (
            <input
              aria-label={intl.formatMessage({
                id: "settings.automations.scheduleCustomLabel",
                defaultMessage: "Custom RRULE",
                description:
                  "Accessible label for the custom RRULE automation schedule editor",
              })}
              className={clsx(FIELD_CLASSNAME, "w-full text-sm font-mono")}
              placeholder={intl.formatMessage({
                id: "settings.automations.scheduleCustomPlaceholder",
                defaultMessage:
                  "RRULE:FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=9;BYMINUTE=0",
                description:
                  "Placeholder text for the custom automation RRULE editor",
              })}
              spellCheck={false}
              value={scheduleConfig.customRrule}
              onChange={(event): void => {
                updateSchedule({ customRrule: event.currentTarget.value });
              }}
            />
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function buildScheduleSummaryLabel({
  scheduleConfig,
  intl,
}: {
  scheduleConfig: ScheduleConfig;
  intl: IntlShape;
}): string {
  if (scheduleConfig.mode === "custom") {
    return intl.formatMessage({
      id: "settings.automations.scheduleMode.custom",
      defaultMessage: "Custom",
      description: "Dropdown label for a custom automation schedule",
    });
  }
  const fallbackLabel = intl.formatMessage({
    id: "settings.automations.rruleSummaryFallback",
    defaultMessage: "Custom schedule",
    description: "Fallback label when RRULE summary cannot be generated",
  });
  return formatScheduleSummary(scheduleConfig, intl) ?? fallbackLabel;
}

export function AutomationModelDropdown({
  selectedModel,
  className,
  showLabel = true,
  showIcon = true,
  onSelect,
}: {
  selectedModel: string | null;
  className?: string;
  showLabel?: boolean;
  showIcon?: boolean;
  onSelect: (value: string) => void;
}): ReactElement {
  const intl = useIntl();
  const { data: listModelsData } = useListModels();
  const modelsByType = listModelsData?.modelsByType;
  const showModelTooltips = isEnglishLocaleCode(intl.locale);

  return (
    <BasicDropdown
      contentWidth="workspace"
      contentMaxHeight="tall"
      disabled={modelsByType == null}
      triggerButton={
        <Button
          aria-label={intl.formatMessage({
            id: "settings.automations.model.ariaLabel",
            defaultMessage: "Model",
            description: "Aria label for automation model dropdown",
          })}
          size="composerSm"
          color="ghost"
          className={clsx("min-w-0", className)}
        >
          {showIcon ? <CubeIcon className="icon-xs shrink-0" /> : null}
          {showLabel ? (
            <span className="truncate text-left text-token-foreground">
              {selectedModel != null && selectedModel.trim().length > 0
                ? getAutomationModelLabel({
                    model: selectedModel,
                    modelsByType,
                  })
                : intl.formatMessage({
                    id: "settings.automations.model.loading",
                    defaultMessage: "Loading model",
                    description:
                      "Fallback label while automation model options are loading",
                  })}
            </span>
          ) : null}
          <ChevronDownIcon className="icon-2xs shrink-0 text-token-input-placeholder-foreground" />
        </Button>
      }
    >
      <Dropdown.Title>
        <FormattedMessage
          id="settings.automations.model.title"
          defaultMessage="Model"
          description="Header label above automation model options"
        />
      </Dropdown.Title>
      <Dropdown.Section className="flex flex-col [--edge-fade-distance:1.5rem]">
        {modelsByType?.models.map((model) => {
          return (
            <Dropdown.Item
              key={model.model}
              LeftIcon={CubeIcon}
              RightIcon={model.model === selectedModel ? CheckIcon : undefined}
              tooltipText={
                showModelTooltips ? (model.description ?? undefined) : undefined
              }
              onSelect={() => {
                onSelect(model.model);
              }}
            >
              <span className="truncate">
                {formatModelDisplayName(model.displayName || model.model)}
              </span>
            </Dropdown.Item>
          );
        })}
      </Dropdown.Section>
    </BasicDropdown>
  );
}

export function AutomationReasoningEffortDropdown({
  model,
  reasoningEffort,
  className,
  showLabel = true,
  showIcon = true,
  onSelect,
}: {
  model: string | null;
  reasoningEffort: AppServer.ReasoningEffort | null;
  className?: string;
  showLabel?: boolean;
  showIcon?: boolean;
  onSelect: (value: AppServer.ReasoningEffort | null) => void;
}): ReactElement {
  const intl = useIntl();
  const { data: listModelsData } = useListModels();
  const modelsByType = listModelsData?.modelsByType;
  const resolvedReasoningEffort = getAutomationReasoningEffort({
    model: getAutomationModelDetails(modelsByType?.models ?? [], model),
    reasoningEffort,
  });
  const SelectedIcon =
    resolvedReasoningEffort != null
      ? REASONING_ICON_BY_EFFORT[resolvedReasoningEffort]
      : ReasoningMediumIcon;
  const reasoningOptions = getAutomationReasoningOptions(
    modelsByType?.models ?? [],
    model,
  );
  const compactTooltipContent =
    resolvedReasoningEffort != null ? (
      <FormattedMessage
        id="settings.automations.reasoning.compactTooltip"
        defaultMessage="{reasoning} reasoning"
        description="Tooltip shown for the compact automation reasoning trigger"
        values={{
          reasoning: (
            <ReasoningEffortLabelMessage effort={resolvedReasoningEffort} />
          ),
        }}
      />
    ) : (
      <FormattedMessage
        id="settings.automations.reasoning.loading"
        defaultMessage="Loading reasoning"
        description="Fallback label while automation reasoning options are loading"
      />
    );
  const triggerButton = (
    <Button
      aria-label={intl.formatMessage({
        id: "settings.automations.reasoning.ariaLabel",
        defaultMessage: "Reasoning",
        description: "Aria label for automation reasoning effort dropdown",
      })}
      size="composerSm"
      color="ghost"
      className={clsx("min-w-0", className)}
    >
      {showIcon ? <SelectedIcon className="icon-xs shrink-0" /> : null}
      {showLabel ? (
        <span className="truncate text-left text-token-foreground">
          {resolvedReasoningEffort != null ? (
            <ReasoningEffortLabelMessage effort={resolvedReasoningEffort} />
          ) : (
            intl.formatMessage({
              id: "settings.automations.reasoning.loading",
              defaultMessage: "Loading reasoning",
              description:
                "Fallback label while automation reasoning options are loading",
            })
          )}
        </span>
      ) : null}
      <ChevronDownIcon className="icon-2xs shrink-0 text-token-input-placeholder-foreground" />
    </Button>
  );

  return (
    <BasicDropdown
      contentWidth="sm"
      disabled={model == null || reasoningOptions.length === 0}
      triggerButton={
        showLabel ? (
          triggerButton
        ) : (
          <Tooltip tooltipContent={compactTooltipContent}>
            {triggerButton}
          </Tooltip>
        )
      }
    >
      <Dropdown.Title>
        <FormattedMessage
          id="settings.automations.reasoning.title"
          defaultMessage="Reasoning"
          description="Header label above automation reasoning options"
        />
      </Dropdown.Title>
      <Dropdown.Section className="flex flex-col [--edge-fade-distance:1.5rem]">
        {reasoningOptions.map((option) => {
          const Icon = REASONING_ICON_BY_EFFORT[option.reasoningEffort];
          return (
            <Dropdown.Item
              key={option.reasoningEffort}
              LeftIcon={Icon}
              RightIcon={
                option.reasoningEffort === resolvedReasoningEffort
                  ? CheckIcon
                  : undefined
              }
              onSelect={() => {
                onSelect(option.reasoningEffort);
              }}
            >
              <ReasoningEffortLabelMessage effort={option.reasoningEffort} />
            </Dropdown.Item>
          );
        })}
      </Dropdown.Section>
    </BasicDropdown>
  );
}

export function AutomationExtraControlsDropdown({
  showModelDropdown,
  showReasoningDropdown,
  onToggleModelDropdown,
  onToggleReasoningDropdown,
}: {
  showModelDropdown: boolean;
  showReasoningDropdown: boolean;
  onToggleModelDropdown: Dispatch<SetStateAction<boolean>>;
  onToggleReasoningDropdown: Dispatch<SetStateAction<boolean>>;
}): ReactElement {
  const intl = useIntl();

  return (
    <BasicDropdown
      align="end"
      triggerButton={
        <MoreMenuTrigger
          label={intl.formatMessage({
            id: "settings.automations.extraControls.ariaLabel",
            defaultMessage: "More automation controls",
            description:
              "Aria label for the automation footer overflow controls menu",
          })}
        />
      }
    >
      <Dropdown.Item
        LeftIcon={CubeIcon}
        RightIcon={showModelDropdown ? CheckIcon : undefined}
        onSelect={() => {
          onToggleModelDropdown((previous): boolean => !previous);
        }}
      >
        <FormattedMessage
          id="settings.automations.extraControls.model"
          defaultMessage="Model"
          description="Menu item for showing or hiding the automation model dropdown"
        />
      </Dropdown.Item>
      <Dropdown.Item
        LeftIcon={ReasoningMediumIcon}
        RightIcon={showReasoningDropdown ? CheckIcon : undefined}
        onSelect={() => {
          onToggleReasoningDropdown((previous): boolean => !previous);
        }}
      >
        <FormattedMessage
          id="settings.automations.extraControls.reasoning"
          defaultMessage="Reasoning"
          description="Menu item for showing or hiding the automation reasoning dropdown"
        />
      </Dropdown.Item>
    </BasicDropdown>
  );
}

export function AutomationKindDropdown({
  selectedKind,
  className,
  disabled = false,
  onSelect,
}: {
  selectedKind: AutomationKind;
  className?: string;
  disabled?: boolean;
  onSelect: (value: AutomationKind) => void;
}): ReactElement {
  const intl = useIntl();

  return (
    <BasicDropdown
      contentWidth="sm"
      triggerButton={
        <Button
          aria-label={intl.formatMessage({
            id: "settings.automations.kind.ariaLabel",
            defaultMessage: "Automation type",
            description: "Aria label for automation type dropdown",
          })}
          size="composerSm"
          color="ghost"
          className={clsx("min-w-0", className)}
          disabled={disabled}
        >
          {selectedKind === "heartbeat" ? (
            <HeartIcon className="icon-xs shrink-0" />
          ) : (
            <ClockIcon className="icon-xs shrink-0" />
          )}
          <span className="truncate text-left text-token-foreground">
            {selectedKind === "heartbeat"
              ? intl.formatMessage({
                  id: "settings.automations.kind.heartbeat",
                  defaultMessage: "Heartbeat",
                  description: "Label for heartbeat automation kind",
                })
              : intl.formatMessage({
                  id: "settings.automations.kind.cron",
                  defaultMessage: "Cron job",
                  description: "Label for cron automation kind",
                })}
          </span>
          <ChevronDownIcon className="icon-2xs shrink-0 text-token-input-placeholder-foreground" />
        </Button>
      }
    >
      <Dropdown.Title>
        <FormattedMessage
          id="settings.automations.kind.title"
          defaultMessage="Automation type"
          description="Header label above automation type options"
        />
      </Dropdown.Title>
      <Dropdown.Item
        LeftIcon={ClockIcon}
        RightIcon={selectedKind === "cron" ? CheckIcon : undefined}
        onSelect={() => {
          onSelect("cron");
        }}
      >
        <FormattedMessage
          id="settings.automations.kind.cron"
          defaultMessage="Cron job"
          description="Label for cron automation kind"
        />
      </Dropdown.Item>
      <Dropdown.Item
        LeftIcon={HeartIcon}
        RightIcon={selectedKind === "heartbeat" ? CheckIcon : undefined}
        onSelect={() => {
          onSelect("heartbeat");
        }}
      >
        <FormattedMessage
          id="settings.automations.kind.heartbeat"
          defaultMessage="Heartbeat"
          description="Label for heartbeat automation kind"
        />
      </Dropdown.Item>
    </BasicDropdown>
  );
}

export function HeartbeatThreadDropdown({
  selectedThreadId,
  options,
  hasPinnedThreads,
  className,
  showIcon = true,
  disabled = false,
  onSelect,
}: {
  selectedThreadId: string | null;
  options: Array<{
    threadId: string;
    title: string;
    createdAt: number | null;
    isPinned: boolean;
    isUnavailable: boolean;
  }>;
  hasPinnedThreads: boolean;
  className?: string;
  showIcon?: boolean;
  disabled?: boolean;
  onSelect: (threadId: string) => void;
}): ReactElement {
  const intl = useIntl();
  const selectedOption =
    options.find((option) => option.threadId === selectedThreadId) ?? null;
  const selectedLabel =
    selectedOption?.title ??
    intl.formatMessage({
      id: "settings.automations.heartbeatThread.placeholder",
      defaultMessage: "Choose a pinned thread",
      description: "Placeholder for heartbeat automation thread selector",
    });

  return (
    <BasicDropdown
      contentWidth="workspace"
      contentMaxHeight="tall"
      disabled={disabled || options.length === 0}
      triggerButton={
        <Button
          aria-label={intl.formatMessage({
            id: "settings.automations.heartbeatThread.ariaLabel",
            defaultMessage: "Target thread",
            description: "Aria label for heartbeat automation thread selector",
          })}
          size="composerSm"
          color="ghost"
          className={clsx("min-w-0", className)}
          disabled={disabled || options.length === 0}
        >
          {showIcon ? <PinIcon className="icon-xs shrink-0" /> : null}
          <span className="truncate text-left text-token-foreground">
            {selectedLabel}
          </span>
          <ChevronDownIcon className="icon-2xs shrink-0 text-token-input-placeholder-foreground" />
        </Button>
      }
    >
      <Dropdown.Title>
        <FormattedMessage
          id="settings.automations.heartbeatThread.title"
          defaultMessage="Target thread"
          description="Header label above heartbeat automation thread options"
        />
      </Dropdown.Title>
      <Dropdown.Section className="flex flex-col [--edge-fade-distance:1.5rem]">
        {options.map((option) => (
          <Dropdown.Item
            key={option.threadId}
            LeftIcon={PinIcon}
            RightIcon={
              option.threadId === selectedThreadId ? CheckIcon : undefined
            }
            disabled={option.isUnavailable}
            onSelect={() => {
              onSelect(option.threadId);
            }}
            SubText={
              option.isUnavailable ? (
                <span className="text-xs text-token-description-foreground">
                  <FormattedMessage
                    id="settings.automations.heartbeatThread.unavailable"
                    defaultMessage="already has heartbeat"
                    description="Subtext for pinned threads that already have an active heartbeat automation"
                  />
                </span>
              ) : null
            }
          >
            <div className="flex min-w-0 items-center gap-1">
              <span className="truncate">{option.title}</span>
              {option.isPinned ? null : (
                <span className="truncate text-sm text-token-description-foreground">
                  <FormattedMessage
                    id="settings.automations.heartbeatThread.unpinned"
                    defaultMessage="unpinned"
                    description="Label for a selected heartbeat thread that is no longer pinned"
                  />
                </span>
              )}
              {option.createdAt != null ? (
                <span className="truncate text-sm text-token-description-foreground">
                  {intl.formatDate(new Date(option.createdAt), {
                    dateStyle: "medium",
                  })}
                </span>
              ) : null}
            </div>
          </Dropdown.Item>
        ))}
        {!hasPinnedThreads ? (
          <div className="text-token-muted-foreground px-3 py-2 text-sm">
            <FormattedMessage
              id="settings.automations.heartbeatThread.empty"
              defaultMessage="Pin a local thread first to use heartbeat automations."
              description="Empty-state label when no pinned local threads are available for heartbeat automations"
            />
          </div>
        ) : null}
      </Dropdown.Section>
    </BasicDropdown>
  );
}

export function ExecutionEnvironmentDropdown({
  selectedId,
  className,
  showLabel = true,
  showIcon = true,
  ariaLabel,
  onSelect,
}: {
  selectedId: AutomationExecutionEnvironment;
  className?: string;
  showLabel?: boolean;
  showIcon?: boolean;
  ariaLabel: string;
  onSelect: (value: AutomationExecutionEnvironment) => void;
}): ReactElement {
  const intl = useIntl();
  const selectedOption =
    EXECUTION_ENVIRONMENT_OPTIONS.find((option) => option.id === selectedId) ??
    EXECUTION_ENVIRONMENT_OPTIONS[0];
  const SelectedIcon = selectedId === "worktree" ? WorktreeIcon : LaptopIcon;
  const compactTooltipContent = intl.formatMessage(
    {
      id: "settings.automations.executionEnvironment.compactTooltip",
      defaultMessage: "Run in {environment}",
      description:
        "Tooltip shown for the compact automation execution environment trigger",
    },
    {
      environment: intl.formatMessage(selectedOption.labelMessage),
    },
  );
  const triggerButton = (
    <Button
      aria-label={ariaLabel}
      size="composerSm"
      color="ghost"
      className={clsx("min-w-0", className)}
    >
      {showIcon ? <SelectedIcon className="icon-xs shrink-0" /> : null}
      {showLabel ? (
        <span className="truncate text-left text-token-foreground">
          {intl.formatMessage(selectedOption.labelMessage)}
        </span>
      ) : null}
      <ChevronDownIcon className="icon-2xs shrink-0 text-token-input-placeholder-foreground" />
    </Button>
  );

  return (
    <BasicDropdown
      contentWidth="sm"
      triggerButton={
        showLabel ? (
          triggerButton
        ) : (
          <Tooltip tooltipContent={compactTooltipContent}>
            {triggerButton}
          </Tooltip>
        )
      }
    >
      <div className="flex flex-col">
        <Dropdown.Title>
          <FormattedMessage
            id="settings.automations.executionEnvironment.menuTitle"
            defaultMessage="Run in"
            description="Header label above automation execution environment options"
          />
        </Dropdown.Title>
        {EXECUTION_ENVIRONMENT_OPTIONS.map((option) => {
          const OptionIcon =
            option.id === "worktree" ? WorktreeIcon : LaptopIcon;
          return (
            <Dropdown.Item
              key={option.id}
              onSelect={() => {
                onSelect(option.id);
              }}
              LeftIcon={OptionIcon}
              RightIcon={option.id === selectedId ? CheckIcon : undefined}
              tooltipText={intl.formatMessage(option.tooltipMessage)}
            >
              {intl.formatMessage(option.labelMessage)}
            </Dropdown.Item>
          );
        })}
      </div>
    </BasicDropdown>
  );
}

export function ProjectDropdown({
  selectedRoots,
  options,
  placeholder,
  className,
  showIcon = true,
  onChange,
}: {
  selectedRoots: Array<GitCwd>;
  options: Array<Option>;
  placeholder: string;
  className?: string;
  showIcon?: boolean;
  onChange: (nextRoots: Array<GitCwd>) => void;
}): ReactElement {
  const intl = useIntl();
  const optionByValue = new Map(
    options.map((option) => [option.value, option]),
  );
  const selectedRootSet = new Set(selectedRoots);
  const selectedOption = selectedRoots[0]
    ? optionByValue.get(selectedRoots[0])
    : undefined;
  const selectedLabel =
    selectedRoots.length > 1
      ? intl.formatMessage(
          {
            id: "settings.automations.projectDropdown.multiple",
            defaultMessage: "{count} projects",
            description:
              "Label shown in the automation project dropdown when multiple projects are selected",
          },
          { count: selectedRoots.length },
        )
      : (selectedOption?.label ?? selectedRoots[0] ?? placeholder);
  const SelectedIcon =
    selectedOption?.isCodexWorktree === true ? WorktreeIcon : FolderIcon;

  return (
    <BasicDropdown
      contentWidth="workspace"
      contentMaxHeight="tall"
      contentClassName="pb-2"
      disabled={options.length === 0}
      triggerButton={
        <Button
          aria-label={intl.formatMessage({
            id: "settings.automations.projectDropdown.ariaLabel",
            defaultMessage: "Project",
            description: "Aria label for automation project dropdown",
          })}
          size="composerSm"
          color="ghost"
          className={clsx("min-w-0", className)}
        >
          {showIcon ? <SelectedIcon className="icon-xs shrink-0" /> : null}
          <span className="truncate text-left text-token-foreground">
            {selectedLabel}
          </span>
          <ChevronDownIcon className="icon-2xs shrink-0 text-token-input-placeholder-foreground" />
        </Button>
      }
    >
      <Dropdown.Title>
        <FormattedMessage
          id="settings.automations.projectDropdown.title"
          defaultMessage="Project"
          description="Header label above automation project options"
        />
      </Dropdown.Title>
      <Dropdown.Section className="flex flex-col [--edge-fade-distance:1.5rem]">
        {options.map((option) => {
          const OptionIcon =
            option.isCodexWorktree === true ? WorktreeIcon : FolderIcon;
          const nextRoot = createGitCwd(option.value);
          const isSelected = selectedRootSet.has(nextRoot);
          return (
            <Dropdown.Item
              key={option.value}
              LeftIcon={OptionIcon}
              RightIcon={isSelected ? CheckIcon : undefined}
              onSelect={() => {
                onChange(
                  isSelected
                    ? selectedRoots.filter((root) => root !== nextRoot)
                    : [...selectedRoots, nextRoot],
                );
              }}
            >
              <div className="flex items-center gap-1">
                <span>{option.label}</span>
                {option.description ? (
                  <span className="truncate text-sm text-token-description-foreground">
                    {option.description}
                  </span>
                ) : null}
              </div>
            </Dropdown.Item>
          );
        })}
        {options.length === 0 ? (
          <div className="text-token-muted-foreground px-3 py-2 text-sm">
            <FormattedMessage
              id="settings.automations.cwdEmpty"
              defaultMessage="No project folders available"
              description="Fallback label when no cwd options exist"
            />
          </div>
        ) : null}
      </Dropdown.Section>
    </BasicDropdown>
  );
}

function ScheduleDropdown<T extends string>({
  ariaLabel,
  className,
  options,
  selectedId,
  selectedLabel,
  onSelect,
}: {
  ariaLabel: string;
  className?: string;
  options: Array<{
    id: T;
    label: string;
  }>;
  selectedId: T;
  selectedLabel: string;
  onSelect: (value: T) => void;
}): ReactElement {
  return (
    <BasicDropdown
      contentWidth="sm"
      contentClassName="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]"
      triggerButton={
        <button
          aria-label={ariaLabel}
          className={clsx(
            FIELD_CLASSNAME,
            "flex items-center justify-between gap-2 text-left text-sm",
            className,
          )}
          type="button"
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDownIcon className="icon-xxs shrink-0 text-token-description-foreground" />
        </button>
      }
    >
      {options.map((option) => (
        <Dropdown.Item
          key={option.id}
          onSelect={() => {
            onSelect(option.id);
          }}
          RightIcon={option.id === selectedId ? CheckIcon : undefined}
        >
          {option.label}
        </Dropdown.Item>
      ))}
    </BasicDropdown>
  );
}

function buildWorkspaceOptions({
  workspaceGroups,
  sortedRoots,
  formatRootLabel,
}: {
  workspaceGroups?: Array<RepositoryTaskGroups>;
  sortedRoots: Array<string>;
  formatRootLabel: (root: string) => string;
}): Array<Option> {
  if (workspaceGroups) {
    return workspaceGroups
      .filter((group) => {
        return group.projectKind === "local";
      })
      .map((localGroup) => {
        const rootFolder = localGroup.repositoryData?.rootFolder ?? undefined;
        const isSubfolder = rootFolder && rootFolder !== localGroup.label;
        return {
          value: localGroup.path,
          label: localGroup.label,
          description: isSubfolder ? rootFolder : undefined,
          isCodexWorktree: localGroup.isCodexWorktree,
        };
      });
  }

  return sortedRoots.map((root) => ({
    value: root,
    label: formatRootLabel(root),
  }));
}
