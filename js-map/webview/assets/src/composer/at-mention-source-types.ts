import type { CSSProperties } from "react";
import type { MessageDescriptor } from "react-intl";

import type { IconComponent } from "./mention-icons";
import type { ProseMirrorComposerController } from "./prosemirror/composer-controller";
import type { MentionUiState } from "./prosemirror/mentions-shared";

export type AtMentionMenuItem = {
  key: string;
  label: string;
  detail: string | null;
  icon?: IconComponent;
  labelClassName?: string;
  labelStyle?: CSSProperties;
  insertMention: ({
    composerController,
    mentionState,
  }: {
    composerController: ProseMirrorComposerController;
    mentionState: MentionUiState;
  }) => void;
};

export type AtMentionMenuSection = {
  id: string;
  title: MessageDescriptor;
  items: Array<AtMentionMenuItem>;
  emptyState: MessageDescriptor | null;
  isLoading: boolean;
  pinToBottom?: boolean;
};

export type AtMentionSourceState = {
  sections: Array<AtMentionMenuSection>;
};

export function combineAtMentionSections(
  sources: Array<AtMentionSourceState | null>,
): Array<AtMentionMenuSection> {
  return sources.flatMap((source) => source?.sections ?? []);
}
