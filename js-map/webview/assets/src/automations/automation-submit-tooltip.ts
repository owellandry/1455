import type { IntlShape } from "react-intl";

import {
  getAutomationDraftSaveState,
  type AutomationDraft,
  type AutomationDraftSaveRequirement,
} from "./automation-shared";

type TooltipRequirementPosition = "initial" | "continuation";

type AutomationSubmitAction = "create" | "save";

export function getAutomationSubmitTooltipContent({
  draft,
  intl,
  action,
}: {
  draft: AutomationDraft;
  intl: IntlShape;
  action: AutomationSubmitAction;
}): string | null {
  const { missingRequirements } = getAutomationDraftSaveState(draft);

  if (missingRequirements.length === 0) {
    return null;
  }

  const requirementLabels = missingRequirements.map((requirement, index) => {
    return getAutomationSubmitRequirementLabel({
      intl,
      requirement,
      position: index === 0 ? "initial" : "continuation",
    });
  });

  return intl.formatMessage(
    action === "create"
      ? {
          id: "settings.automations.saveTooltip.combined.create",
          defaultMessage: "{requirements} to create",
          description:
            "Tooltip on the disabled automation create button combining all missing requirements",
        }
      : {
          id: "settings.automations.saveTooltip.combined.save",
          defaultMessage: "{requirements} to save",
          description:
            "Tooltip on the disabled automation save button combining all missing requirements",
        },
    {
      requirements: intl.formatList(requirementLabels, {
        type: "conjunction",
      }),
    },
  );
}

function getAutomationSubmitRequirementLabel({
  intl,
  requirement,
  position,
}: {
  intl: IntlShape;
  requirement: AutomationDraftSaveRequirement;
  position: TooltipRequirementPosition;
}): string {
  switch (requirement) {
    case "name":
      return position === "initial"
        ? intl.formatMessage({
            id: "settings.automations.saveTooltip.name.initial",
            defaultMessage: "Create title",
            description:
              "Tooltip requirement shown first when the automation title is missing",
          })
        : intl.formatMessage({
            id: "settings.automations.saveTooltip.name.continuation",
            defaultMessage: "create title",
            description:
              "Tooltip requirement shown after the first item when the automation title is missing",
          });
    case "prompt":
      return position === "initial"
        ? intl.formatMessage({
            id: "settings.automations.saveTooltip.prompt.initial",
            defaultMessage: "Add prompt",
            description:
              "Tooltip requirement shown first when the automation prompt is missing",
          })
        : intl.formatMessage({
            id: "settings.automations.saveTooltip.prompt.continuation",
            defaultMessage: "add prompt",
            description:
              "Tooltip requirement shown after the first item when the automation prompt is missing",
          });
    case "cwd":
      return position === "initial"
        ? intl.formatMessage({
            id: "settings.automations.saveTooltip.cwd.initial",
            defaultMessage: "Select project",
            description:
              "Tooltip requirement shown first when the automation project selection is missing",
          })
        : intl.formatMessage({
            id: "settings.automations.saveTooltip.cwd.continuation",
            defaultMessage: "select project",
            description:
              "Tooltip requirement shown after the first item when the automation project selection is missing",
          });
    case "thread":
      return position === "initial"
        ? intl.formatMessage({
            id: "settings.automations.saveTooltip.thread.initial",
            defaultMessage: "Select thread",
            description:
              "Tooltip requirement shown first when the heartbeat automation thread selection is missing",
          })
        : intl.formatMessage({
            id: "settings.automations.saveTooltip.thread.continuation",
            defaultMessage: "select thread",
            description:
              "Tooltip requirement shown after the first item when the heartbeat automation thread selection is missing",
          });
    case "executionEnvironment":
      return position === "initial"
        ? intl.formatMessage({
            id: "settings.automations.saveTooltip.executionEnvironment.initial",
            defaultMessage: "Choose where to run it",
            description:
              "Tooltip requirement shown first when the automation execution environment is missing",
          })
        : intl.formatMessage({
            id: "settings.automations.saveTooltip.executionEnvironment.continuation",
            defaultMessage: "choose where to run it",
            description:
              "Tooltip requirement shown after the first item when the automation execution environment is missing",
          });
    case "model":
      return position === "initial"
        ? intl.formatMessage({
            id: "settings.automations.saveTooltip.model.initial",
            defaultMessage: "Choose a model",
            description:
              "Tooltip requirement shown first when the automation model is missing",
          })
        : intl.formatMessage({
            id: "settings.automations.saveTooltip.model.continuation",
            defaultMessage: "choose a model",
            description:
              "Tooltip requirement shown after the first item when the automation model is missing",
          });
    case "schedule":
      return position === "initial"
        ? intl.formatMessage({
            id: "settings.automations.saveTooltip.schedule.initial",
            defaultMessage: "Fix the schedule",
            description:
              "Tooltip requirement shown first when the automation schedule is invalid",
          })
        : intl.formatMessage({
            id: "settings.automations.saveTooltip.schedule.continuation",
            defaultMessage: "fix the schedule",
            description:
              "Tooltip requirement shown after the first item when the automation schedule is invalid",
          });
  }
}
