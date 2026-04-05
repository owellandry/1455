import type { ServiceTier } from "app-server-types";
import type { AgentMode, RemoteHostKind } from "protocol";
import { useCallback, useEffect, useEffectEvent, useRef } from "react";

import type { WorkspaceOnboardingExperimentArm } from "./onboarding/workspace-onboarding-experiment";
import { useAnalyticsEnabled } from "./queries/config-queries";
import { useStatsigEventLogger } from "./statsig/statsig";
import { logger } from "./utils/logger";

const MAX_PENDING_ANALYTICS_EVENTS = 50;

type OnboardingStep = "login" | "welcome" | "workspace";
type OnboardingLoginMethod = "chatgpt" | "apikey" | "ssh";
type OnboardingErrorKind = "abort" | "network" | "auth" | "unknown";
type ComposerRuntimeMode = "local" | "cloud" | "worktree";
type RequestInputKind = "approval" | "implement_plan" | "user_input";
type ApprovalRequestKind = "exec" | "network" | "file_change";
type ApprovalRequestChoice =
  | "accept"
  | "accept_for_session"
  | "accept_with_execpolicy_amendment"
  | "apply_network_policy_amendment"
  | "decline";
type OnboardingTelemetrySource = "onboarding_modal" | "sidebar_cta";
type ModelAnnouncementSource = "new_model" | "upgrade";
type OnboardingExperimentTelemetry = {
  experiment_arm?: WorkspaceOnboardingExperimentArm;
};
export type ServiceTierAnalyticsValue = ServiceTier | "standard";
export type ServiceTierChangeSource =
  | "fast_mode_announcement"
  | "home_banner"
  | "settings"
  | "slash_command"
  | "composer_menu";

export type ProductEvents = {
  codex_turn_completed: undefined;
  codex_model_announcement_viewed: {
    source: ModelAnnouncementSource;
    model: string;
  };
  codex_model_announcement_dismissed: {
    source: ModelAnnouncementSource;
    model: string;
  };
  codex_model_announcement_cta_clicked: {
    source: ModelAnnouncementSource;
    model: string;
  };
  codex_thread_opened: {
    kind: "local" | "remote" | "pending_worktree";
  };
  codex_app_nav_clicked: {
    item:
      | "new_thread"
      | "pull_requests"
      | "automations"
      | "skills"
      | "remote_connections"
      | "add_workspace"
      | "toggle_recent";
  };
  codex_app_workspace_root_selected: undefined;
  codex_app_workspace_root_add_clicked: undefined;
  codex_composer_runtime_changed: {
    mode: ComposerRuntimeMode;
  };
  codex_composer_model_changed: {
    model: string;
  };
  codex_composer_reasoning_effort_changed: {
    reasoning_effort: string;
  };
  codex_fast_mode_announcement_viewed: undefined;
  codex_fast_mode_announcement_cta_clicked: undefined;
  codex_fast_mode_announcement_dismissed: undefined;
  codex_fast_mode_banner_viewed: undefined;
  codex_fast_mode_banner_cta_clicked: undefined;
  codex_fast_mode_banner_dismissed: undefined;
  codex_multi_agent_banner_viewed: undefined;
  codex_multi_agent_banner_cta_clicked: {
    action: "try_now";
  };
  codex_multi_agent_banner_dismissed: undefined;
  codex_service_tier_changed: {
    previous_service_tier: ServiceTierAnalyticsValue;
    service_tier: ServiceTierAnalyticsValue;
    source: ServiceTierChangeSource;
  };
  codex_composer_permissions_mode_changed: {
    start_agent_mode: AgentMode;
    end_agent_mode: AgentMode;
  };
  codex_patch_action_result: {
    action: "stage" | "unstage" | "revert";
    scope: "file" | "hunk" | "section";
    status: "success" | "partial-success" | "error";
  };
  codex_undo_clicked: {
    source: "turn_diff";
  };
  codex_git_commit_succeeded: undefined;
  codex_git_push_succeeded: {
    forced: boolean;
  };
  codex_git_create_pr_succeeded: undefined;
  codex_automation_created: undefined;
  codex_automation_updated: undefined;
  codex_skill_new_clicked: undefined;
  codex_skill_try_clicked: undefined;
  codex_onboarding_step_viewed: {
    step: OnboardingStep;
  } & OnboardingExperimentTelemetry;
  codex_onboarding_login_method_selected: {
    method: OnboardingLoginMethod;
  };
  codex_onboarding_login_completed: {
    method: Exclude<OnboardingLoginMethod, "ssh">;
    success: boolean;
    error_kind?: OnboardingErrorKind;
  };
  codex_onboarding_welcome_continue_clicked: {
    workspaces_count: number;
  } & OnboardingExperimentTelemetry;
  codex_onboarding_workspace_add_clicked: {
    has_existing_workspaces: boolean;
    source?: OnboardingTelemetrySource;
  } & OnboardingExperimentTelemetry;
  codex_onboarding_workspace_selection_changed: {
    action: "toggle_root" | "select_all";
    selected_workspaces_count: number;
    total_workspaces_count: number;
  } & OnboardingExperimentTelemetry;
  codex_onboarding_workspace_continue_clicked: {
    selected_workspaces_count: number;
    total_workspaces_count: number;
    auto_navigated: boolean;
  } & OnboardingExperimentTelemetry;
  codex_onboarding_completed: {
    selected_workspaces_count: number;
  } & OnboardingExperimentTelemetry;
  codex_slash_commands_menu_opened: undefined;
  codex_slash_command_selected: {
    command_id: string;
  };
  codex_request_input_submitted: {
    kind: RequestInputKind;
    question_count: number;
  };
  codex_request_input_dismissed: {
    kind: RequestInputKind;
  };
  codex_approval_request_responded: {
    kind: ApprovalRequestKind;
    agent_mode: AgentMode;
    choice: ApprovalRequestChoice;
    has_feedback: boolean;
  };
  codex_review_target_selected: {
    target: "unstaged" | "base_branch";
  };
  codex_message_sent: {
    mode: "local" | "cloud" | "worktree";
    image_count: number;
    file_count: number;
    context_file_count: number;
    comment_attachment_count: number;
    has_prior_conversation: boolean;
    is_follow_up: boolean;
    isResponseInProgress: boolean;
    inProgressMessageType: "steer" | "queue" | "stop";
    service_tier: ServiceTierAnalyticsValue;
  };
  codex_app_window_opened: undefined;
  codex_app_remote_host_window_opened: {
    kind: RemoteHostKind;
  };
  codex_app_window_closed: undefined;
};

export type ProductEventName = keyof ProductEvents;

export type ProductEventPayload = {
  [EventName in ProductEventName]: ProductEvents[EventName] extends undefined
    ? { eventName: EventName; metadata?: undefined }
    : { eventName: EventName; metadata: ProductEvents[EventName] };
}[ProductEventName];

export type ProductEventLogger = (payload: ProductEventPayload) => void;

export function useProductEvents(): ProductEventLogger {
  const { data: analyticsEnabled, status: analyticsSettingStatus } =
    useAnalyticsEnabled();
  const { logEventWithStatsig } = useStatsigEventLogger();
  const pendingEventsRef = useRef<Array<ProductEventPayload>>([]);

  const logProductEvent = useCallback(
    (payload: ProductEventPayload): void => {
      try {
        logEventWithStatsig(payload.eventName, payload.metadata);
      } catch (error) {
        logger.error("Failed to log product event", {
          safe: {
            eventName: payload.eventName,
          },
          sensitive: {
            error,
            metadata: payload.metadata,
          },
        });
      }
    },
    [logEventWithStatsig],
  );

  const analyticsEventsAllowed =
    analyticsSettingStatus === "success" && analyticsEnabled;
  const flushPendingEventsEvent = useEffectEvent(() => {
    // Flush any queued events:
    const queued = pendingEventsRef.current;
    pendingEventsRef.current = [];
    queued.forEach((payload) => {
      logProductEvent(payload);
    });
  });

  useEffect(() => {
    if (analyticsEventsAllowed) {
      flushPendingEventsEvent();
    }
  }, [analyticsEventsAllowed]);

  return useCallback(
    (payload: ProductEventPayload): void => {
      if (analyticsEnabled === false) {
        // If we know analytics is disabled, drop the queued events and bail out.
        pendingEventsRef.current = [];
        return;
      }
      switch (analyticsSettingStatus) {
        case "error": // Even if we failed, it may change to success later...
        case "pending": {
          // Queue a small number of events so early UI interactions are not lost
          // while analytics config resolves.
          if (pendingEventsRef.current.length >= MAX_PENDING_ANALYTICS_EVENTS) {
            pendingEventsRef.current.shift();
          }
          pendingEventsRef.current.push(payload);
          return;
        }
        case "success": {
          // Analytics config is ready and enabled, so log the event.
          logProductEvent(payload);
          return;
        }
      }
    },
    [analyticsEnabled, analyticsSettingStatus, logProductEvent],
  );
}
