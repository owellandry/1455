import { useAtom } from "jotai";
import { useScope } from "maitai";
import { useEffect, useRef, useState } from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import { OnboardingBanner } from "@/components/onboarding-banner";
import TeamIcon from "@/icons/team.svg";
import XIcon from "@/icons/x.svg";
import { productEventLogger$ } from "@/product-event-signal";
import { useSetExperimentalFeatureEnabled } from "@/queries/experimental-features-queries";
import { AppScope } from "@/scopes/app-scope";
import { useSharedObject } from "@/shared-objects/use-shared-object";

import { aHasSeenMultiAgentComposerBanner } from "./multi-agent-home-announcement-state";

const MULTI_AGENT_FEATURE_NAME = "multi_agent";

const messages = defineMessages({
  title: {
    id: "codex.multiAgentComposerBanner.title",
    defaultMessage: "Subagents in Codex",
    description: "Title shown in the multi-agent composer banner",
  },
  body: {
    id: "codex.multiAgentComposerBanner.body",
    defaultMessage:
      "Delegate work to subagents that work in parallel. Note: may increase token usage.",
    description: "Body shown in the multi-agent composer banner",
  },
  ctaPrimary: {
    id: "codex.multiAgentComposerBanner.cta.primary",
    defaultMessage: "Try now",
    description: "Primary CTA shown in the multi-agent composer banner",
  },
  tryNowPrompt: {
    id: "composer.multiAgentBanner.tryNow.prompt",
    defaultMessage: "Spawn a subagent to explore this repo.",
    description:
      "Prompt inserted when the user clicks Try now on the multi-agent composer banner",
  },
  dismissLabel: {
    id: "codex.multiAgentComposerBanner.dismissLabel",
    defaultMessage: "Dismiss subagent banner",
    description:
      "Accessible label for dismissing the multi-agent composer banner",
  },
});

export function MultiAgentComposerBanner({
  onTryNow,
}: {
  onTryNow?: () => void;
}): React.ReactElement | null {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const setExperimentalFeatureEnabled = useSetExperimentalFeatureEnabled();
  const [, setComposerPrefill] = useSharedObject("composer_prefill");
  const [hasSeenMultiAgentComposerBanner, setHasSeenMultiAgentComposerBanner] =
    useAtom(aHasSeenMultiAgentComposerBanner);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasLoggedViewRef = useRef(false);
  const isVisible = !hasSeenMultiAgentComposerBanner;

  useEffect(() => {
    if (!isVisible || hasLoggedViewRef.current) {
      return;
    }
    hasLoggedViewRef.current = true;
    scope.get(productEventLogger$).log({
      eventName: "codex_multi_agent_banner_viewed",
    });
  }, [scope, isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <OnboardingBanner
      title={<FormattedMessage {...messages.title} />}
      description={<FormattedMessage {...messages.body} />}
      leadingVisual={<TeamIcon className="icon-sm" />}
      primaryAction={{
        label: <FormattedMessage {...messages.ctaPrimary} />,
        onClick: () => {
          setIsSubmitting(true);
          const tryNowPrompt = intl.formatMessage(messages.tryNowPrompt);
          scope.get(productEventLogger$).log({
            eventName: "codex_multi_agent_banner_cta_clicked",
            metadata: { action: "try_now" },
          });
          void setExperimentalFeatureEnabled
            .mutateAsync({
              featureName: MULTI_AGENT_FEATURE_NAME,
              enabled: true,
            })
            .finally(() => {
              if (onTryNow) {
                onTryNow();
              } else {
                setComposerPrefill({ text: tryNowPrompt });
              }
              if (!__STORYBOOK__) {
                setHasSeenMultiAgentComposerBanner(true);
              }
              setIsSubmitting(false);
            });
        },
        disabled: isSubmitting,
        className: "px-3 max-[400px]:flex-1 max-[400px]:justify-center",
      }}
      dismissAction={{
        ariaLabel: intl.formatMessage(messages.dismissLabel),
        color: "ghost",
        icon: XIcon,
        onClick: () => {
          scope.get(productEventLogger$).log({
            eventName: "codex_multi_agent_banner_dismissed",
          });
          if (!__STORYBOOK__) {
            setHasSeenMultiAgentComposerBanner(true);
          }
        },
        disabled: isSubmitting,
        uniform: true,
        className:
          "!border-transparent text-token-description-foreground hover:text-token-foreground",
      }}
    />
  );
}
