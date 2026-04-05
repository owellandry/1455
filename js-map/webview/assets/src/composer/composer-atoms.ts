import type { ModeKind, Personality } from "app-server-types";
import { atom } from "jotai";
import {
  PERSONALITY_PERSISTED_ATOM_KEY,
  type AgentMode,
  type BuiltInNonFullAccessAgentMode,
  type ComposerEnterBehavior,
} from "protocol";

import { persistedAtom } from "@/utils/persisted-atom";

export const aAgentMode = persistedAtom<AgentMode>("agent-mode", "auto");
export const aHasSetInitialAgentMode = atom(false);

export const aPreferredNonFullAccessMode =
  persistedAtom<BuiltInNonFullAccessAgentMode | null>(
    "preferred-non-full-access-agent-mode",
    null,
  );

export const aSkipFullAccessConfirm = persistedAtom<boolean>(
  "skip-full-access-confirm",
  false,
);

export const aSkipThreadBranchMismatchConfirm = persistedAtom<boolean>(
  "skip-thread-branch-mismatch-confirm",
  false,
);

export const aComposerBestOfN = persistedAtom<number>("composer-best-of-n", 1);

export const aPromptHistory = persistedAtom<Array<string>>(
  "prompt-history",
  [],
);

export const aDefaultComposerAutoContext = persistedAtom<boolean>(
  "composer-auto-context-enabled",
  true,
);

export const aPersonality = persistedAtom<Personality | null>(
  PERSONALITY_PERSISTED_ATOM_KEY,
  null,
);

export const aEnterBehavior = persistedAtom<ComposerEnterBehavior>(
  "enter-behavior",
  "enter",
);

export const aCurrentCollaborationMode = atom<ModeKind | null>(null);

export const aDismissedAboveComposerSuggestionIdsByScope = atom<
  Record<string, Array<string>>
>({});
