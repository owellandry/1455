import { keepPreviousData, useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Command } from "cmdk";
import { useAtom, useAtomValue } from "jotai";

import "@/composer/slash-commands/cmdk.css";
import { CODEX_COMMANDS, type CodexCommandSurface } from "protocol";
import type React from "react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  defineMessage,
  FormattedMessage,
  useIntl,
  type MessageDescriptor,
} from "react-intl";

import {
  useConversationsMeta,
  useDefaultAppServerManager,
} from "@/app-server/app-server-manager-hooks";
import type {
  AppServerConversationState,
  ThreadSearchResult,
} from "@/app-server/app-server-manager-types";
import {
  DialogDescription,
  DialogTitle,
  DIALOG_OVERLAY_CLASS_NAME,
} from "@/components/dialog";
import { KeybindingLabel } from "@/components/keybinding-label";
import { SlashCommandItem } from "@/composer/slash-commands/slash-command-item";
import { useIsThreadSearchEnabled } from "@/hooks/use-is-thread-search-enabled";
import ArrowLeftIcon from "@/icons/arrow-left.svg";
import ArrowUpIcon from "@/icons/arrow-up.svg";
import AvatarIcon from "@/icons/avatar.svg";
import CommentIcon from "@/icons/comment.svg";
import ComposeIcon from "@/icons/compose.svg";
import DiffIcon from "@/icons/diff.svg";
import FolderOpenIcon from "@/icons/folder-open.svg";
import LogOutIcon from "@/icons/log-out.svg";
import MacbookIcon from "@/icons/macbook.svg";
import McpIcon from "@/icons/mcp.svg";
import PopInMacIcon from "@/icons/pop-in-mac.svg";
import RegenerateIcon from "@/icons/regenerate.svg";
import SearchIcon from "@/icons/search.svg";
import SettingsCogIcon from "@/icons/settings.cog.svg";
import SidebarIcon from "@/icons/sidebar.svg";
import SkillsIcon from "@/icons/skills.svg";
import TerminalIcon from "@/icons/terminal.svg";
import {
  getMenuShortcutLabel,
  isElectronMenuAcceleratorId,
} from "@/keyboard-shortcuts/electron-menu-shortcuts";
import { useHotkey } from "@/keyboard-shortcuts/use-hotkey";
import { getLocalConversationTitle } from "@/local-conversation/get-local-conversation-title";
import { useMessage } from "@/message-bus";
import { DEFAULT_HOST_ID } from "@/shared-objects/use-host-config";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { useDebouncedValue } from "@/utils/use-debounced-value";
import { useNavigateToLocalConversation } from "@/utils/use-navigate-to-local-conversation";
import { useFetchFromVSCode } from "@/vscode-api";

import { aCommandMenuEntries } from "./command-menu-entries";
import { aIsCommandMenuOpen } from "./command-menu-state";
import { runCommand } from "./run-command";

type TitleKey = (typeof CODEX_COMMANDS)[number]["titleKey"];
type GroupKey = Exclude<(typeof CODEX_COMMANDS)[number]["groupKey"], undefined>;
type CodexCommand = (typeof CODEX_COMMANDS)[number];
type CodexCommandId = CodexCommand["id"];
type CommandIcon = React.ComponentType<{ className?: string }>;

const COMMAND_MENU_SURFACE: CodexCommandSurface = "commandMenu";
const RECENT_THREAD_SHORTCUT_IDS = [
  "thread1",
  "thread2",
  "thread3",
  "thread4",
  "thread5",
  "thread6",
  "thread7",
  "thread8",
  "thread9",
] as const;

const SUGGESTED_COMMAND_IDS: Array<CodexCommandId> = [
  "newThread",
  "openFolder",
  "settings",
];

const COMMAND_ICONS: Partial<Record<CodexCommandId, CommandIcon>> = {
  newThread: ComposeIcon,
  openThreadOverlay: PopInMacIcon,
  settings: SettingsCogIcon,
  mcpSettings: McpIcon,
  personalitySettings: AvatarIcon,
  forceReloadSkills: RegenerateIcon,
  openSkills: SkillsIcon,
  openFolder: FolderOpenIcon,
  toggleSidebar: SidebarIcon,
  toggleTerminal: TerminalIcon,
  toggleDiffPanel: DiffIcon,
  findInThread: SearchIcon,
  navigateBack: ArrowLeftIcon,
  navigateForward: ArrowForwardIcon,
  previousThread: ArrowUpIcon,
  nextThread: ArrowDownIcon,
  logOut: LogOutIcon,
  feedback: CommentIcon,
};

const DIALOG_TITLE = defineMessage({
  id: "codex.commandMenu.title",
  defaultMessage: "Command menu",
  description: "Title for the global command menu dialog",
});

const SEARCH_PLACEHOLDER = defineMessage({
  id: "codex.commandMenu.searchPlaceholder",
  defaultMessage: "Type command or search threads",
  description: "Placeholder text for the command menu search input",
});

const THREADS_GROUP_LABEL = defineMessage({
  id: "codex.commandMenu.threadsGroup",
  defaultMessage: "Threads",
  description: "Group label for thread search results in the command menu",
});

const UNTITLED_THREAD = defineMessage({
  id: "codex.commandMenu.untitledThread",
  defaultMessage: "Untitled thread",
  description:
    "Fallback title for a thread without a title in the command menu",
});

const THREAD_SEARCH_LIMIT = RECENT_THREAD_SHORTCUT_IDS.length;
const THREAD_RESULT_TOOLTIP_DELAY_MS = 2000;
const THREAD_RESULT_DESCRIPTION_CLASS_NAME = "w-24 shrink-0 text-right";

const DIALOG_DESCRIPTION = defineMessage({
  id: "codex.commandMenu.dialogDescription",
  defaultMessage: "Search commands and past threads.",
  description: "Accessible description for the global command menu dialog",
});

const GROUP_LABELS = {
  "codex.commandGroup.thread": defineMessage({
    id: "codex.commandGroup.thread",
    defaultMessage: "Thread",
    description: "Command group label in the command menu",
  }),
  "codex.commandGroup.navigation": defineMessage({
    id: "codex.commandGroup.navigation",
    defaultMessage: "Navigation",
    description: "Command group label in the command menu",
  }),
  "codex.commandGroup.panels": defineMessage({
    id: "codex.commandGroup.panels",
    defaultMessage: "Panels",
    description: "Command group label in the command menu",
  }),
  "codex.commandGroup.workspace": defineMessage({
    id: "codex.commandGroup.workspace",
    defaultMessage: "Project",
    description: "Command group label in the command menu",
  }),
  "codex.commandGroup.configure": defineMessage({
    id: "codex.commandGroup.configure",
    defaultMessage: "Configure",
    description: "Command group label in the command menu",
  }),
  "codex.commandGroup.app": defineMessage({
    id: "codex.commandGroup.app",
    defaultMessage: "App",
    description: "Command group label in the command menu",
  }),
  "codex.commandGroup.skills": defineMessage({
    id: "codex.commandGroup.skills",
    defaultMessage: "Skills",
    description: "Command group label in the command menu",
  }),
} satisfies Record<GroupKey, MessageDescriptor>;

const GROUP_ORDER: Array<GroupKey> = [
  "codex.commandGroup.thread",
  "codex.commandGroup.navigation",
  "codex.commandGroup.panels",
  "codex.commandGroup.workspace",
  "codex.commandGroup.skills",
  "codex.commandGroup.configure",
  "codex.commandGroup.app",
];

function getThreadShortcutLabel(index: number): string | null {
  const acceleratorId = RECENT_THREAD_SHORTCUT_IDS[index];
  if (acceleratorId == null) {
    return null;
  }
  return getMenuShortcutLabel(acceleratorId);
}

const COMMAND_TITLES: Record<TitleKey, MessageDescriptor> = {
  "codex.command.newThread": defineMessage({
    id: "codex.command.newThread",
    defaultMessage: "New thread",
    description: "Command menu item to start a new thread",
  }),
  "codex.command.settings": defineMessage({
    id: "codex.command.settings",
    defaultMessage: "Settings",
    description: "Command menu item to open settings",
  }),
  "codex.command.mcpSettings": defineMessage({
    id: "codex.command.mcpSettings",
    defaultMessage: "MCP",
    description: "Command menu item to open MCP settings",
  }),
  "codex.command.personalitySettings": defineMessage({
    id: "codex.command.personalitySettings",
    defaultMessage: "Personality",
    description: "Command menu item to open personality settings",
  }),
  "codex.command.manageTasks": defineMessage({
    id: "codex.command.manageTasks",
    defaultMessage: "Manage tasks",
    description: "Command menu item to manage tasks",
  }),
  "codex.command.forceReloadSkills": defineMessage({
    id: "codex.command.forceReloadSkills",
    defaultMessage: "Force reload skills",
    description: "Command menu item to force reload skills",
  }),
  "codex.command.openSkills": defineMessage({
    id: "codex.command.openSkills",
    defaultMessage: "Go to skills",
    description: "Command menu item to open skills",
  }),
  "codex.command.openFolder": defineMessage({
    id: "codex.command.openFolder",
    defaultMessage: "Open folder",
    description: "Command menu item to open a folder/workspace",
  }),
  "codex.command.toggleSidebar": defineMessage({
    id: "codex.command.toggleSidebar",
    defaultMessage: "Toggle sidebar",
    description: "Command menu item to toggle the sidebar",
  }),
  "codex.command.toggleTerminal": defineMessage({
    id: "codex.command.toggleTerminal",
    defaultMessage: "Toggle terminal",
    description: "Command menu item to toggle the terminal panel",
  }),
  "codex.command.toggleDiffPanel": defineMessage({
    id: "codex.command.toggleDiffPanel",
    defaultMessage: "Toggle diff panel",
    description: "Command menu item to toggle the diff panel",
  }),
  "codex.command.findInThread": defineMessage({
    id: "codex.command.findInThread",
    defaultMessage: "Find",
    description: "Command menu item to find in the current thread",
  }),
  "codex.command.navigateBack": defineMessage({
    id: "codex.command.navigateBack",
    defaultMessage: "Back",
    description: "Command menu item to navigate back",
  }),
  "codex.command.navigateForward": defineMessage({
    id: "codex.command.navigateForward",
    defaultMessage: "Forward",
    description: "Command menu item to navigate forward",
  }),
  "codex.command.openThreadOverlay": defineMessage({
    id: "codex.command.openThreadOverlay",
    defaultMessage: "Open in mini window",
    description:
      "Command menu item to open the current thread in a mini window",
  }),
  "codex.command.previousThread": defineMessage({
    id: "codex.command.previousThread",
    defaultMessage: "Previous thread",
    description: "Command menu item to go to the previous thread",
  }),
  "codex.command.nextThread": defineMessage({
    id: "codex.command.nextThread",
    defaultMessage: "Next thread",
    description: "Command menu item to go to the next thread",
  }),
  "codex.command.logOut": defineMessage({
    id: "codex.command.logOut",
    defaultMessage: "Log out",
    description: "Command menu item to log out of ChatGPT",
  }),
  "codex.command.feedback": defineMessage({
    id: "codex.command.feedback",
    defaultMessage: "Feedback",
    description: "Command menu item to open the feedback dialog",
  }),
} satisfies Record<TitleKey, MessageDescriptor>;

function hasOpenDialog(): boolean {
  return document.querySelector('[role="dialog"][data-state="open"]') != null;
}

function isCommandSupportedByHost(command: CodexCommand): boolean {
  switch (__WINDOW_TYPE__) {
    case "electron": {
      return command.host.electron != null;
    }
    case "extension": {
      return "extension" in command.host;
    }
    case "browser": {
      return "browser" in command.host;
    }
  }
}

export function CommandMenu(): React.ReactElement {
  const appServerManager = useDefaultAppServerManager();
  const intl = useIntl();
  const navigateToLocalConversation = useNavigateToLocalConversation();
  const { data: conversations } = useConversationsMeta();
  const { data: pinnedThreadsResponse } = useFetchFromVSCode(
    "list-pinned-threads",
  );
  const entries = useAtomValue(aCommandMenuEntries);
  const [open, setOpen] = useAtom(aIsCommandMenuOpen);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const deferredSearch = useDeferredValue(search);
  const debouncedDeferredSearch = useDebouncedValue(deferredSearch, 100);
  const trimmedSearch = search.trim();
  const trimmedDeferredSearch = debouncedDeferredSearch.trim();
  const isThreadSearchEnabled = useIsThreadSearchEnabled();
  const untitledThreadLabel = intl.formatMessage(UNTITLED_THREAD);
  const pinnedLocalThreads = getPinnedLocalThreads({
    conversations: conversations ?? [],
    pinnedThreadIds: pinnedThreadsResponse?.threadIds ?? [],
  });

  const commands = useMemo((): Array<CodexCommand> => {
    return CODEX_COMMANDS.filter((command) => {
      if (
        !(command.surfaces as Array<CodexCommandSurface>).includes(
          COMMAND_MENU_SURFACE,
        )
      ) {
        return false;
      }
      return isCommandSupportedByHost(command);
    });
  }, []);

  useMessage(
    "command-menu",
    (payload) => {
      if (payload.query !== undefined) {
        setSearch(payload.query);
        setOpen(true);
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }
      if (open) {
        close();
        return;
      }
      setSearch("");
      setOpen(true);
      inputRef.current?.focus();
      inputRef.current?.select();
    },
    [open],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [open]);

  const openFromShortcut = (event: KeyboardEvent): void => {
    if (event.defaultPrevented) {
      return;
    }
    if (open) {
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
      return;
    }
    if (hasOpenDialog()) {
      return;
    }
    event.preventDefault();
    setSearch("");
    setOpen(true);
  };

  const toggleFromShortcut = (event: KeyboardEvent): void => {
    if (event.defaultPrevented) {
      return;
    }
    if (open) {
      event.preventDefault();
      close();
      return;
    }
    if (hasOpenDialog()) {
      return;
    }
    if (isEditableTarget(event.target)) {
      return;
    }
    event.preventDefault();
    setSearch("");
    setOpen(true);
  };

  useHotkey({
    accelerator: "CmdOrCtrl+K",
    enabled: __WINDOW_TYPE__ === "browser",
    onKeyDown: (event) => {
      toggleFromShortcut(event);
    },
  });

  useHotkey({
    accelerator: "CmdOrCtrl+Shift+P",
    enabled: __WINDOW_TYPE__ === "browser",
    ignoreWithin: "input, textarea, select, [contenteditable='true']",
    onKeyDown: (event) => {
      openFromShortcut(event);
    },
  });

  const close = (): void => {
    setSearch("");
    setOpen(false);
  };

  const threadSearchResults = useQuery({
    queryKey: [
      "command-menu-thread-search",
      appServerManager.getHostId(),
      isThreadSearchEnabled,
      trimmedDeferredSearch,
    ],
    queryFn: () =>
      appServerManager.searchThreads({
        query: trimmedDeferredSearch,
        limit: THREAD_SEARCH_LIMIT,
      }),
    enabled: isThreadSearchEnabled && open && trimmedDeferredSearch.length > 0,
    placeholderData: keepPreviousData,
    staleTime: QUERY_STALE_TIME.THIRTY_SECONDS,
  });

  const renderCommand = (command: CodexCommand): React.ReactElement => {
    const title = intl.formatMessage(COMMAND_TITLES[command.titleKey]);
    let acceleratorId = command.host.electron?.acceleratorId;
    if (acceleratorId == null && isElectronMenuAcceleratorId(command.id)) {
      acceleratorId = command.id;
    }
    const shortcut = acceleratorId ? getMenuShortcutLabel(acceleratorId) : null;
    const LeftIcon = COMMAND_ICONS[command.id];

    const value = [title, ...(command.keywords ?? [])].join(" ");

    return (
      <SlashCommandItem
        key={command.id}
        value={value}
        title={title}
        onSelect={() => {
          runCommand(command.id);
          close();
        }}
        LeftIcon={LeftIcon}
        rightAccessory={
          shortcut ? <KeybindingLabel keysLabel={shortcut} /> : null
        }
      />
    );
  };

  const renderedItems: Array<React.ReactElement> = [];
  const threadResults = isThreadSearchEnabled
    ? (threadSearchResults.data ?? []).slice(
        0,
        RECENT_THREAD_SHORTCUT_IDS.length,
      )
    : [];
  const visibleThreadShortcutTargets = isThreadSearchEnabled
    ? trimmedSearch.length > 0
      ? threadResults
      : pinnedLocalThreads
    : [];
  useMessage(
    "go-to-thread-index",
    ({ index }) => {
      if (!open) {
        return;
      }
      const target = visibleThreadShortcutTargets[index];
      if (!target) {
        return;
      }
      navigateToLocalConversation(
        "threadId" in target ? target.threadId : target.id,
      );
      close();
    },
    [navigateToLocalConversation, open, visibleThreadShortcutTargets],
  );
  const renderedPinnedThreadsGroup =
    isThreadSearchEnabled &&
    trimmedSearch.length === 0 &&
    pinnedLocalThreads.length > 0 ? (
      <Command.Group
        key="group-pinned-threads"
        heading={
          <span className="block px-2 pt-2 text-sm text-token-description-foreground">
            <FormattedMessage {...THREADS_GROUP_LABEL} />
          </span>
        }
        className="flex flex-col"
        style={{ gap: "var(--spacing)" }}
      >
        {pinnedLocalThreads.map((conversation, index) => {
          const shortcutLabel = getThreadShortcutLabel(index);
          const title =
            getLocalConversationTitle(conversation) ?? untitledThreadLabel;
          const pathLabel = getPathLabel(conversation.cwd ?? "");

          return (
            <SlashCommandItem
              key={conversation.id}
              value={[title, conversation.cwd ?? ""].join(" ")}
              title={title}
              description={pathLabel}
              titleTooltipContent={title}
              descriptionTooltipContent={pathLabel}
              descriptionClassName={THREAD_RESULT_DESCRIPTION_CLASS_NAME}
              tooltipDelayDuration={THREAD_RESULT_TOOLTIP_DELAY_MS}
              onSelect={() => {
                navigateToLocalConversation(conversation.id);
                close();
              }}
              LeftIcon={MacbookIcon}
              rightAccessory={
                shortcutLabel ? (
                  <KeybindingLabel keysLabel={shortcutLabel} />
                ) : null
              }
            />
          );
        })}
      </Command.Group>
    ) : null;
  const renderedThreadGroup =
    isThreadSearchEnabled &&
    trimmedSearch.length > 0 &&
    threadResults.length > 0 ? (
      <Command.Group
        key="group-threads"
        heading={
          <span className="block px-2 pt-2 text-sm text-token-description-foreground">
            <FormattedMessage {...THREADS_GROUP_LABEL} />
          </span>
        }
        className="flex flex-col"
        style={{ gap: "var(--spacing)" }}
      >
        {threadResults.map((result, index) => {
          const shortcutLabel = getThreadShortcutLabel(index);

          return (
            <SlashCommandItem
              key={result.threadId}
              value={[result.title, result.cwd, trimmedSearch].join(" ")}
              title={result.title}
              description={getThreadSearchDescription(result)}
              titleTooltipContent={result.title}
              descriptionTooltipContent={getThreadSearchDescription(result)}
              descriptionClassName={THREAD_RESULT_DESCRIPTION_CLASS_NAME}
              tooltipDelayDuration={THREAD_RESULT_TOOLTIP_DELAY_MS}
              onSelect={() => {
                navigateToLocalConversation(result.threadId);
                close();
              }}
              LeftIcon={MacbookIcon}
              rightAccessory={
                shortcutLabel ? (
                  <KeybindingLabel keysLabel={shortcutLabel} />
                ) : null
              }
            />
          );
        })}
      </Command.Group>
    ) : null;

  const showSuggested = trimmedSearch.length === 0;
  const suggestedCommands: Array<CodexCommand> = [];
  if (showSuggested) {
    for (const id of SUGGESTED_COMMAND_IDS) {
      const command = commands.find((c) => c.id === id);
      if (command) {
        suggestedCommands.push(command);
      }
    }
  }
  const visibleCommandsForQuery = showSuggested
    ? commands.filter((c) => !SUGGESTED_COMMAND_IDS.includes(c.id))
    : commands;

  if (showSuggested && suggestedCommands.length > 0) {
    renderedItems.push(
      <Command.Group
        key="group-suggested"
        heading={
          <span className="block px-2 pt-2 text-sm text-token-description-foreground">
            <FormattedMessage
              id="codex.commandMenu.suggestedGroup"
              defaultMessage="Suggested"
              description="Command group label in the command menu when no search query is entered"
            />
          </span>
        }
        className="flex flex-col"
        style={{ gap: "var(--spacing)" }}
      >
        {suggestedCommands.map(renderCommand)}
      </Command.Group>,
    );
  }

  if (renderedPinnedThreadsGroup) {
    renderedItems.push(renderedPinnedThreadsGroup);
  }

  if (renderedThreadGroup) {
    renderedItems.push(renderedThreadGroup);
  }

  const grouped = new Map<GroupKey, Array<CodexCommand>>();
  const ungrouped: Array<CodexCommand> = [];

  for (const command of visibleCommandsForQuery) {
    const groupKey = command.groupKey;
    if (!groupKey) {
      ungrouped.push(command);
      continue;
    }
    const group = grouped.get(groupKey);
    if (group) {
      group.push(command);
    } else {
      grouped.set(groupKey, [command]);
    }
  }

  renderedItems.push(...ungrouped.map(renderCommand));
  for (const groupKey of GROUP_ORDER) {
    const group = grouped.get(groupKey);
    if (!group?.length) {
      continue;
    }
    renderedItems.push(
      <Command.Group
        key={`group-${groupKey}`}
        heading={
          <span className="block px-2 pt-2 text-sm text-token-description-foreground">
            <FormattedMessage {...GROUP_LABELS[groupKey]} />
          </span>
        }
        className="flex flex-col"
        style={{ gap: "var(--spacing)" }}
      >
        {group.map(renderCommand)}
      </Command.Group>,
    );
  }

  for (const entry of entries) {
    const element = entry.render(close);
    if (element) {
      renderedItems.push(element);
    }
  }

  return (
    <Command.Dialog
      title={intl.formatMessage(DIALOG_TITLE)}
      open={open}
      shouldFilter
      label={intl.formatMessage(DIALOG_TITLE)}
      overlayClassName={DIALOG_OVERLAY_CLASS_NAME}
      contentClassName="codex-dialog command-menu-dialog bg-transparent h-[500px] p-0 shadow-none outline-none focus-visible:outline-none fixed left-1/2 top-1/2 z-50 w-[520px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2"
      onOpenChange={(o) => {
        if (o) {
          setOpen(true);
        } else {
          close();
        }
      }}
    >
      <DialogTitle className="sr-only">
        {intl.formatMessage(DIALOG_TITLE)}
      </DialogTitle>
      <DialogDescription className="sr-only">
        {intl.formatMessage(DIALOG_DESCRIPTION)}
      </DialogDescription>
      <Command.Input
        ref={inputRef}
        placeholder={intl.formatMessage(SEARCH_PLACEHOLDER)}
        value={search}
        onValueChange={setSearch}
      />
      <Command.List>
        {renderedItems}
        <Command.Empty>
          <FormattedMessage
            id="codex.commandMenu.noResults"
            defaultMessage="No matches"
            description="Shown when no commands or workspaces match in the command menu"
          />
        </Command.Empty>
      </Command.List>
    </Command.Dialog>
  );
}

function ArrowForwardIcon({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return <ArrowLeftIcon className={clsx(className, "-scale-x-100")} />;
}

function ArrowDownIcon({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return <ArrowUpIcon className={clsx(className, "rotate-180")} />;
}

function getPinnedLocalThreads({
  conversations,
  pinnedThreadIds,
}: {
  conversations: Array<AppServerConversationState>;
  pinnedThreadIds: Array<string>;
}): Array<AppServerConversationState> {
  const localConversations = conversations.filter(
    (conversation) =>
      (conversation.hostId ?? DEFAULT_HOST_ID) === DEFAULT_HOST_ID,
  );
  const localConversationById = new Map(
    localConversations.map(
      (conversation): [string, AppServerConversationState] => [
        conversation.id,
        conversation,
      ],
    ),
  );
  const pinnedThreads = new Set<AppServerConversationState>();

  for (const threadId of pinnedThreadIds) {
    const conversation = localConversationById.get(threadId);
    if (!conversation) {
      continue;
    }
    pinnedThreads.add(conversation);
    if (pinnedThreads.size === RECENT_THREAD_SHORTCUT_IDS.length) {
      return Array.from(pinnedThreads);
    }
  }

  return Array.from(pinnedThreads);
}

function getThreadSearchDescription(result: ThreadSearchResult): string {
  return getPathLabel(result.cwd);
}

function getPathLabel(path: string): string {
  const segments = path.split(/[\\/]/).filter(Boolean);
  const lastSegment = segments.at(-1);

  if (lastSegment) {
    return lastSegment;
  }

  return path;
}

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest("input, textarea, select, [contenteditable='true']") != null
  );
}
