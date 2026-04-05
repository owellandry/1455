import { ConfigurationKeys, type ConversationDetailMode } from "protocol";

import { useConfiguration } from "@/hooks/use-configuration";

export type ThreadDetailLevel = ConversationDetailMode;

export const THREAD_DETAIL_LEVEL_STEPS_PROSE: ThreadDetailLevel = "STEPS_PROSE";
export const DEFAULT_THREAD_DETAIL_LEVEL: ThreadDetailLevel = "STEPS_COMMANDS";

export function useThreadDetailLevel(): ThreadDetailLevel {
  const { data } = useConfiguration(ConfigurationKeys.CONVERSATION_DETAIL_MODE);
  return data ?? DEFAULT_THREAD_DETAIL_LEVEL;
}
