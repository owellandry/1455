import type { ConversationId } from "protocol";
import type { ReactElement } from "react";
import { useMemo } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";

import { useAppServerManagerForConversationId } from "@/app-server/app-server-manager-hooks";
import { useAuth } from "@/auth/use-auth";
import { ProgressionDonut } from "@/components/progression-donut";
import { Tooltip } from "@/components/tooltip";
import { useSavedUserconfig } from "@/utils/use-saved-user-configuration";

import { useTokenUsageInfo } from "../utils/use-token-usage-info";
import { getContextUsageStats } from "./context-usage-stats";

export function TokenUsageIndicator({
  conversationId,
  cwd,
  showFallbackWhenUnavailable = false,
}: {
  conversationId: ConversationId | null;
  cwd: string | null;
  showFallbackWhenUnavailable?: boolean;
}): ReactElement | null {
  const { authMethod } = useAuth();
  const appServerManager = useAppServerManagerForConversationId(conversationId);
  const { data: userSavedConfig } = useSavedUserconfig(appServerManager, cwd);
  const tokenUsageInfo = useTokenUsageInfo(conversationId);
  const shouldShowAutoCompactMessage =
    authMethod === "chatgpt" && !userSavedConfig?.model_provider;

  const { percent, usedTokens, contextWindow } = useMemo(() => {
    return getContextUsageStats(tokenUsageInfo);
  }, [tokenUsageInfo]);

  if (percent == null) {
    if (!showFallbackWhenUnavailable) {
      return null;
    }

    return (
      <Tooltip
        tooltipContent={
          <div className="flex flex-col gap-0.5">
            <FormattedMessage
              id="composer.contextWindowUsageLabel"
              defaultMessage="Context window:"
              description="Label describing the context window usage tooltip content"
            >
              {(text) => (
                <span className="whitespace-pre-line text-token-input-placeholder-foreground">
                  {text}
                </span>
              )}
            </FormattedMessage>
            <span>
              <FormattedMessage
                id="composer.contextWindowUsageStatusLeft"
                defaultMessage="{usage}% used ({remaining}% left)"
                description="Context window usage percent indicating how much is left"
                values={{
                  usage: <FormattedNumber value={0} />,
                  remaining: <FormattedNumber value={100} />,
                }}
              />
            </span>
          </div>
        }
      >
        <div className="ml-2 flex items-center gap-1 text-token-description-foreground">
          <ProgressionDonut percent={0} />
          <span className="composer-footer__label--sm text-sm whitespace-nowrap text-token-input-placeholder-foreground opacity-60 select-none">
            <FormattedMessage
              id="composer.contextWindow.usagePercent"
              defaultMessage="{usage}%"
              description="Context window usage percent"
              values={{ usage: 0 }}
            />
          </span>
        </div>
      </Tooltip>
    );
  }

  const usedK = usedTokens != null ? Math.round(usedTokens / 1000) : 0;
  const windowK = contextWindow != null ? Math.round(contextWindow / 1000) : 0;
  const roundedPercent = Math.round(percent);
  const remainingPercent = Math.max(0, 100 - roundedPercent);
  const showFull = roundedPercent >= 50;

  return (
    <Tooltip
      tooltipContent={
        <div className="flex w-38 flex-col gap-0.5 text-center">
          <FormattedMessage
            id="composer.contextWindowUsageLabel"
            defaultMessage="Context window:"
            description="Label describing the context window usage tooltip content"
          >
            {(text) => (
              <span className="whitespace-pre-line text-token-input-placeholder-foreground">
                {text}
              </span>
            )}
          </FormattedMessage>
          <span
            className={
              showFull ? "text-token-input-placeholder-foreground" : undefined
            }
          >
            {showFull ? (
              <FormattedMessage
                id="composer.contextWindowUsageStatusFull"
                defaultMessage="{usage}% full"
                description="Context window usage percent indicating how full it is"
                values={{
                  usage: <FormattedNumber value={roundedPercent} />,
                }}
              />
            ) : (
              <FormattedMessage
                id="composer.contextWindowUsageStatusLeft"
                defaultMessage="{usage}% used ({remaining}% left)"
                description="Context window usage percent indicating how much is left"
                values={{
                  usage: <FormattedNumber value={roundedPercent} />,
                  remaining: <FormattedNumber value={remainingPercent} />,
                }}
              />
            )}
          </span>
          <FormattedMessage
            id="composer.contextWindowUsageTooltip"
            defaultMessage="{usedTokens}k / {contextWindow}k tokens used"
            description="Tooltip shown in the composer footer indicating context window usage in thousands"
            values={{
              usedTokens: <FormattedNumber value={usedK} />,
              contextWindow: <FormattedNumber value={windowK} />,
            }}
          />
          {shouldShowAutoCompactMessage ? (
            <p className="mt-2 font-medium">
              <FormattedMessage
                id="composer.contextWindow.autoCompactionTooltipLine1"
                defaultMessage="Codex automatically compacts its context"
                description="Tooltip shown in the composer footer indicating that Codex will automatically compact the context as it fills up."
              />
            </p>
          ) : null}
        </div>
      }
    >
      <div className="ml-2 text-token-description-foreground">
        <ProgressionDonut percent={percent} />
      </div>
    </Tooltip>
  );
}
