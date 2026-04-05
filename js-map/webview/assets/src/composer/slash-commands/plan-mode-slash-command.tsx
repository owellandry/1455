import type { ConversationId } from "protocol";
import { useIntl } from "react-intl";

import PlanIcon from "@/icons/plan.svg";

import { useCollaborationMode } from "../use-collaboration-mode";
import { useProvideSlashCommand } from "./slash-command";

export function PlanModeSlashCommand({
  conversationId,
}: {
  conversationId: ConversationId | null;
}): null {
  const intl = useIntl();
  const {
    activeMode,
    modes: collaborationModes,
    setSelectedMode,
    isLoading,
  } = useCollaborationMode(conversationId);

  const isPlanMode = activeMode.mode === "plan";
  const hasPlanMode = collaborationModes.some((mode) => mode.mode === "plan");
  const hasDefaultMode = collaborationModes.some(
    (mode) => mode.mode === "default",
  );

  function togglePlanMode(): void {
    if (isLoading) {
      return;
    }
    if (!hasPlanMode) {
      return;
    }
    if (isPlanMode) {
      if (hasDefaultMode) {
        setSelectedMode("default");
        return;
      }
      setSelectedMode(null);
      return;
    }
    setSelectedMode("plan");
  }

  useProvideSlashCommand({
    id: "plan-mode",
    title: intl.formatMessage({
      id: "composer.planSlashCommand.title",
      defaultMessage: "Plan mode",
      description: "Title for the plan mode slash command",
    }),
    description: isPlanMode
      ? intl.formatMessage({
          id: "composer.planSlashCommand.disableDescription",
          defaultMessage: "Turn plan mode off",
          description:
            "Description for the plan mode slash command when plan mode is on",
        })
      : intl.formatMessage({
          id: "composer.planSlashCommand.enableDescription",
          defaultMessage: "Turn plan mode on",
          description:
            "Description for the plan mode slash command when plan mode is off",
        }),
    requiresEmptyComposer: false,
    Icon: PlanIcon,
    enabled: !isLoading && hasPlanMode,
    onSelect: async () => {
      togglePlanMode();
    },
    dependencies: [
      conversationId,
      isLoading,
      hasPlanMode,
      hasDefaultMode,
      isPlanMode,
      setSelectedMode,
    ],
  });

  return null;
}
