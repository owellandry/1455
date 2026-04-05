import { useSetAtom } from "jotai";
import { useScope } from "maitai";
import { lookup } from "mime-types";
import type { ConversationId, FileDescriptor } from "protocol";
import { useRef } from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import { toast$ } from "@/components/toaster/toast-signal";
import { Toggle } from "@/components/toggle";
import { Tooltip } from "@/components/tooltip";
import { useCanUseFastMode } from "@/hooks/use-is-fast-mode-enabled";
import { useServiceTierSettings } from "@/hooks/use-service-tier-settings";
import { useWindowType } from "@/hooks/use-window-type";
import CheckMdIcon from "@/icons/check-md.svg";
import ClickIcon from "@/icons/click.svg";
import LightningBoltIcon from "@/icons/lightning-bolt.svg";
import PaperclipIcon from "@/icons/paperclip.svg";
import PlanIcon from "@/icons/plan.svg";
import PlusIcon from "@/icons/plus.svg";
import { AppScope } from "@/scopes/app-scope";
import {
  USER_VISIBLE_SERVICE_TIER_OPTIONS,
  type UserVisibleServiceTier,
} from "@/utils/user-visible-service-tier-options";
import { fetchFromVSCode } from "@/vscode-api";

import { aDefaultComposerAutoContext } from "./composer-atoms";
import type { ComposerImageDataUrl } from "./composer-image-data-url";
import { isLikelyImageFile, isLikelyImageName } from "./is-likely-image-file";
import { PluginsSubmenuItem } from "./plugins-submenu-item";
import { useCollaborationMode } from "./use-collaboration-mode";
import { useDropdownTooltipSuppression } from "./use-dropdown-tooltip-suppression";
import { usePickFiles } from "./use-file-picker";

const speedDropdownMessages = defineMessages({
  label: {
    id: "settings.agent.speed.label",
    defaultMessage: "Speed",
    description: "Label for the Fast mode speed setting",
  },
  optionFast: {
    id: "settings.agent.speed.option.fast",
    defaultMessage: "Fast",
    description: "Label for the fast Speed setting option",
  },
  optionFastDescription: {
    id: "composer.addContext.speed.option.fast.description",
    defaultMessage: "About 1.5x faster, with credits used at 2x",
    description: "Subtitle for the fast Speed setting option",
  },
  optionStandard: {
    id: "settings.agent.speed.option.standard",
    defaultMessage: "Standard",
    description: "Label for the standard Speed setting option",
  },
  optionStandardDescription: {
    id: "composer.addContext.speed.option.standard.description",
    defaultMessage: "Default speed with normal credit usage",
    description: "Subtitle for the standard Speed setting option",
  },
});

const COMPOSER_SPEED_OPTIONS: Array<{
  label: keyof typeof speedDropdownMessages;
  description: keyof typeof speedDropdownMessages;
  value: UserVisibleServiceTier;
}> = USER_VISIBLE_SERVICE_TIER_OPTIONS.map((value) => ({
  label: getComposerSpeedOptionLabel(value),
  description: getComposerSpeedOptionDescription(value),
  value,
}));

function getComposerSpeedOptionLabel(
  value: UserVisibleServiceTier,
): keyof typeof speedDropdownMessages {
  switch (value) {
    case null:
      return "optionStandard";
    case "fast":
      return "optionFast";
  }
}

function getComposerSpeedOptionDescription(
  value: UserVisibleServiceTier,
): keyof typeof speedDropdownMessages {
  switch (value) {
    case null:
      return "optionStandardDescription";
    case "fast":
      return "optionFastDescription";
  }
}

export function AddContextButton({
  onAddImages,
  onAddImageDataUrls,
  getAttachmentGen,
  fileAttachments,
  setFileAttachments,
  conversationId,
  isAutoContextOn,
  setIsAutoContextOn,
  ideContextStatus,
  disabled = false,
}: {
  onAddImages: (files: Array<File>) => void;
  onAddImageDataUrls: (images: Array<ComposerImageDataUrl>) => void;
  getAttachmentGen: () => number;
  fileAttachments: Array<FileDescriptor>;
  setFileAttachments: (
    attachments:
      | Array<FileDescriptor>
      | ((prev: Array<FileDescriptor>) => Array<FileDescriptor>),
  ) => void;
  conversationId: ConversationId | null;
  isAutoContextOn: boolean;
  setIsAutoContextOn: (on: boolean) => void;
  ideContextStatus: "no-connection" | "connected" | "loading";
  disabled?: boolean;
}): React.ReactElement {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const pickFiles = usePickFiles();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const togglingSwitchRef = useRef(false);
  const setDefaultEnabled = useSetAtom(aDefaultComposerAutoContext);
  const windowType = useWindowType();
  const {
    isOpen: isDropdownOpen,
    setIsOpen: setIsDropdownOpen,
    tooltipOpen,
    triggerRef,
    onTriggerBlur,
    onTriggerPointerLeave,
    handleSelectAndClose,
  } = useDropdownTooltipSuppression();
  const {
    activeMode,
    modes: collaborationModes,
    setSelectedMode,
    isLoading: isCollaborationModeLoading,
  } = useCollaborationMode(conversationId);
  const isFastModeEnabled = useCanUseFastMode();
  const { serviceTierSettings, setServiceTier } =
    useServiceTierSettings(conversationId);
  const isIdeContextConnected = ideContextStatus === "connected";
  const isPlanModeOn = activeMode.mode === "plan";
  const hasPlanMode = collaborationModes.some((mode) => mode.mode === "plan");
  const hasDefaultMode = collaborationModes.some(
    (mode) => mode.mode === "default",
  );
  const includeIdeContextAriaLabel = intl.formatMessage({
    id: "composer.includeIdeContextDropdown.ariaLabel",
    defaultMessage: "Include IDE context",
    description:
      "Aria label for the include IDE context switch in the add context dropdown",
  });
  const planModeAriaLabel = intl.formatMessage({
    id: "composer.planModeDropdown.ariaLabel",
    defaultMessage: "Plan mode",
    description:
      "Aria label for the plan mode switch in the add context dropdown",
  });
  const addContextTooltipLabel = intl.formatMessage({
    id: "composer.addContextDropdown.ariaLabel",
    defaultMessage: "Add files and more",
    description: "Accessible label for the add context dropdown trigger button",
  });

  function updateAutoContext(nextValue: boolean): void {
    if (disabled) {
      return;
    }
    setIsAutoContextOn(nextValue);
    setDefaultEnabled(nextValue);
  }

  function toggleAutoContext(): void {
    updateAutoContext(!isAutoContextOn);
  }

  function handlePlanModeChange(nextChecked: boolean): void {
    if (disabled) {
      return;
    }
    if (!hasPlanMode) {
      return;
    }
    if (nextChecked) {
      setSelectedMode("plan");
      return;
    }
    if (hasDefaultMode) {
      setSelectedMode("default");
      return;
    }
    setSelectedMode(null);
  }

  function handleDropdownOpenChange(nextOpen: boolean): void {
    if (!nextOpen && togglingSwitchRef.current) {
      return;
    }
    setIsDropdownOpen(nextOpen);
  }
  // todo(dylan.hurd) - actually use this when we start supporting file uploads
  // const openAttachments = (): void => {
  //   if (!imageUploadEnabled) {
  //     return;
  //   }
  //   setAttachTooltipOpen(false);
  //   fileInputRef.current?.click();
  // };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const { images, others } = classifyFiles(files);
      if (images.length > 0) {
        // Delegate image processing to the composer so paste and + share logic
        onAddImages(images);
      }
      if (others.length > 0) {
        const newFileAttachments = others.map((file) => {
          const filename = file.name;
          const lastDotIndex = filename.lastIndexOf(".");
          const name =
            lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
          // TODO: actually get paths
          return { label: name, path: filename, fsPath: filename };
        });
        setFileAttachments([...fileAttachments, ...newFileAttachments]);
      }
    }
    if (event.target) {
      event.target.value = "";
    }
  };

  async function handleAddFiles(): Promise<void> {
    if (disabled) {
      return;
    }
    if (windowType === "browser") {
      fileInputRef.current?.click();
      return;
    }
    try {
      const gen = getAttachmentGen();
      const pickedFiles = await pickFiles();
      if (pickedFiles.length === 0) {
        return;
      }
      const { images, others } = classifyFileDescriptors(pickedFiles);
      let imageDataUrls: Array<ComposerImageDataUrl> = [];
      if (images.length > 0) {
        imageDataUrls = await loadImageDataUrls(images);
      }
      if (getAttachmentGen() !== gen) {
        return;
      }
      if (imageDataUrls.length > 0) {
        onAddImageDataUrls(imageDataUrls);
      }
      if (others.length > 0) {
        setFileAttachments((prev) => [...prev, ...others]);
      }
    } catch {
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "composer.addContext.openFilePickerError",
          defaultMessage: "Unable to open file picker",
          description:
            "Toast shown when the host file picker fails to open for attachments",
        }),
      );
    }
  }

  async function loadImageDataUrls(
    files: Array<FileDescriptor>,
  ): Promise<Array<ComposerImageDataUrl>> {
    const responses: Array<ComposerImageDataUrl | null> = await Promise.all(
      files.map(async (file) => {
        try {
          const response = await fetchFromVSCode("read-file-binary", {
            params: { path: file.fsPath },
          });
          if (!response.contentsBase64) {
            return null;
          }
          const dataUrl = buildDataUrlForFile({
            contentsBase64: response.contentsBase64,
            fsPath: file.fsPath,
          });
          if (!dataUrl) {
            return null;
          }
          return {
            dataUrl,
            localPath: file.fsPath,
            filename: file.label,
          };
        } catch {
          return null;
        }
      }),
    );
    return responses.filter(
      (item): item is ComposerImageDataUrl => item != null,
    );
  }

  return (
    <>
      {/* Keep the file input mounted outside the button so it persists across renders */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        className="hidden"
      />
      <BasicDropdown
        open={isDropdownOpen}
        disabled={disabled}
        onOpenChange={handleDropdownOpenChange}
        side="top"
        align="start"
        alignOffset={-8}
        contentWidth="icon"
        triggerButton={
          <Tooltip
            open={tooltipOpen}
            triggerRef={triggerRef}
            tooltipContent={
              <div className="flex items-center gap-1">
                <FormattedMessage
                  id="composer.addContextDropdown.tooltipText"
                  defaultMessage="Add files and more"
                  description="Tooltip text for the add context dropdown trigger button"
                />
                <Badge className="px-1 py-0 text-[10px] leading-none">
                  <FormattedMessage
                    id="composer.addContextDropdown.tooltipSlash"
                    defaultMessage="/"
                    description="Slash badge shown in the add context tooltip"
                  />
                </Badge>
              </div>
            }
            side="top"
            align="center"
            sideOffset={4}
          >
            <Button
              size="composer"
              color="ghost"
              uniform={true}
              aria-label={addContextTooltipLabel}
              disabled={disabled}
              onPointerLeave={onTriggerPointerLeave}
              onBlur={onTriggerBlur}
            >
              <PlusIcon className="icon-sm" />
            </Button>
          </Tooltip>
        }
      >
        <Dropdown.Item
          LeftIcon={PaperclipIcon}
          leftIconClassName="icon-xs"
          onSelect={() => {
            if (disabled) {
              return;
            }
            handleSelectAndClose();
            void handleAddFiles();
          }}
        >
          <FormattedMessage
            id="composer.addPhotosAndFiles"
            defaultMessage="Add photos & files"
            description="Dropdown item label to add photos and files to the composer"
          />
        </Dropdown.Item>
        <Dropdown.Separator />
        {isIdeContextConnected ? (
          <>
            <Dropdown.Item
              LeftIcon={ClickIcon}
              leftIconClassName="icon-sm"
              onSelect={() => {
                if (togglingSwitchRef.current) {
                  return;
                }
                toggleAutoContext();
                handleSelectAndClose();
              }}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <FormattedMessage
                  id="composer.includeIdeContextDropdown"
                  defaultMessage="Include IDE context"
                  description="Dropdown item label to include IDE context in the composer"
                />
                <Toggle
                  ariaLabel={includeIdeContextAriaLabel}
                  size="sm"
                  checked={isAutoContextOn}
                  disabled={disabled}
                  onPointerDownCapture={(event) => {
                    togglingSwitchRef.current = true;
                    event.stopPropagation();
                  }}
                  onPointerUpCapture={(event) => {
                    event.stopPropagation();
                    window.setTimeout(() => {
                      togglingSwitchRef.current = false;
                    }, 0);
                  }}
                  onChange={(nextChecked) => {
                    updateAutoContext(nextChecked);
                    setIsDropdownOpen(true);
                    window.setTimeout(() => {
                      togglingSwitchRef.current = false;
                    }, 0);
                  }}
                />
              </div>
            </Dropdown.Item>
          </>
        ) : null}
        <Dropdown.Item
          LeftIcon={PlanIcon}
          leftIconClassName="icon-xs"
          onSelect={() => {
            if (togglingSwitchRef.current) {
              return;
            }
            handlePlanModeChange(!isPlanModeOn);
            handleSelectAndClose();
          }}
        >
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FormattedMessage
                id="composer.planModeDropdown"
                defaultMessage="Plan mode"
                description="Dropdown item label for plan mode in the add context menu"
              />
            </div>
            <Toggle
              ariaLabel={planModeAriaLabel}
              size="sm"
              checked={isPlanModeOn}
              disabled={disabled || isCollaborationModeLoading || !hasPlanMode}
              onPointerDownCapture={(event) => {
                togglingSwitchRef.current = true;
                event.stopPropagation();
              }}
              onPointerUpCapture={(event) => {
                event.stopPropagation();
                window.setTimeout(() => {
                  togglingSwitchRef.current = false;
                }, 0);
              }}
              onChange={(nextChecked) => {
                handlePlanModeChange(nextChecked);
                setIsDropdownOpen(true);
                window.setTimeout(() => {
                  togglingSwitchRef.current = false;
                }, 0);
              }}
            />
          </div>
        </Dropdown.Item>
        {isFastModeEnabled ? (
          <Dropdown.FlyoutSubmenuItem
            LeftIcon={LightningBoltIcon}
            leftIconClassName="icon-xs"
            label={<FormattedMessage {...speedDropdownMessages.label} />}
            contentClassName="min-w-[160px]"
            disabled={serviceTierSettings.isLoading}
          >
            {COMPOSER_SPEED_OPTIONS.map((option) => {
              const isSelected =
                option.value === serviceTierSettings.serviceTier;
              return (
                <Dropdown.Item
                  key={option.label}
                  disabled={serviceTierSettings.isLoading}
                  RightIcon={isSelected ? CheckMdIcon : undefined}
                  SubText={
                    <span className="text-token-description-foreground">
                      <FormattedMessage
                        {...speedDropdownMessages[option.description]}
                      />
                    </span>
                  }
                  onSelect={() => {
                    void setServiceTier(option.value, "composer_menu");
                    handleSelectAndClose();
                  }}
                >
                  <FormattedMessage {...speedDropdownMessages[option.label]} />
                </Dropdown.Item>
              );
            })}
          </Dropdown.FlyoutSubmenuItem>
        ) : null}
        {!disabled ? (
          <PluginsSubmenuItem handleSelectAndClose={handleSelectAndClose} />
        ) : null}
      </BasicDropdown>
    </>
  );
}

function classifyFiles(files: ArrayLike<File> | Array<File>): {
  images: Array<File>;
  others: Array<File>;
} {
  const images: Array<File> = [];
  const others: Array<File> = [];
  for (const file of Array.from(files as ArrayLike<File>)) {
    if (isLikelyImageFile(file)) {
      images.push(file);
    } else {
      others.push(file);
    }
  }
  return { images, others };
}

function classifyFileDescriptors(files: Array<FileDescriptor>): {
  images: Array<FileDescriptor>;
  others: Array<FileDescriptor>;
} {
  const images: Array<FileDescriptor> = [];
  const others: Array<FileDescriptor> = [];
  for (const file of files) {
    if (isLikelyImageDescriptor(file)) {
      images.push(file);
    } else {
      others.push(file);
    }
  }
  return { images, others };
}

function isLikelyImageDescriptor(file: FileDescriptor): boolean {
  const name = file.fsPath || file.path || file.label;
  return isLikelyImageName(name);
}

function buildDataUrlForFile({
  contentsBase64,
  fsPath,
}: {
  contentsBase64: string;
  fsPath: string;
}): string | null {
  const mimeType = lookup(fsPath);
  if (typeof mimeType !== "string") {
    return null;
  }
  return `data:${mimeType};base64,${contentsBase64}`;
}
