import { useScope } from "maitai";
import type { ReactElement, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { FormattedMessage } from "react-intl";

import gradientBackground from "@/assets/gradient.png";
import type {
  ModelUpgradeAnnouncement,
  NewModelAnnouncement,
} from "@/hooks/use-announcement";
import { useModelSettings } from "@/hooks/use-model-settings";
import { productEventLogger$ } from "@/product-event-signal";
import { AppScope } from "@/scopes/app-scope";
import { formatModelDisplayName } from "@/utils/format-model-display-name";
import { getModelUpgradeLinkUrl } from "@/utils/get-model-upgrade-link-url";

import { AnnouncementModal } from "./announcement-modal";

const GPT_54_MODEL_UPGRADE_LINK_URL =
  "https://openai.com/index/introducing-gpt-5-4";
type ModelAnnouncementSource = "new_model" | "upgrade";

export function NewModelAnnouncementModal({
  newModelAnnouncement,
  dismissAnnouncement,
}: {
  newModelAnnouncement: NewModelAnnouncement;
  dismissAnnouncement: () => void;
}): ReactElement {
  const scope = useScope(AppScope);
  const { modelSettings, setModelAndReasoningEffort } = useModelSettings();
  const modelName = formatModelDisplayName(newModelAnnouncement.model);

  const handleTryNewModel = (): void => {
    scope.get(productEventLogger$).log({
      eventName: "codex_model_announcement_cta_clicked",
      metadata: {
        source: "new_model",
        model: newModelAnnouncement.model,
      },
    });
    void setModelAndReasoningEffort(
      newModelAnnouncement.model,
      modelSettings.reasoningEffort,
    );

    dismissAnnouncement();
  };

  return (
    <ModelAnnouncementModal
      announcementSource="new_model"
      dismissAnnouncement={dismissAnnouncement}
      modelName={modelName}
      model={newModelAnnouncement.model}
      body={
        <p className="text-base leading-normal tracking-normal text-token-description-foreground">
          {newModelAnnouncement.message}
        </p>
      }
      onTryModel={handleTryNewModel}
    />
  );
}

export function ModelUpgradeAnnouncementModal({
  modelUpgradeInfo,
  dismissAnnouncement,
}: {
  modelUpgradeInfo: ModelUpgradeAnnouncement;
  dismissAnnouncement: () => void;
}): ReactElement {
  const scope = useScope(AppScope);
  const { setModelAndReasoningEffort } = useModelSettings();
  const isGpt54Upgrade = modelUpgradeInfo.model === "gpt-5.4";
  const modelName = formatModelDisplayName(modelUpgradeInfo.model);
  const announcementLinkUrl = isGpt54Upgrade
    ? GPT_54_MODEL_UPGRADE_LINK_URL
    : getModelUpgradeLinkUrl(modelUpgradeInfo);

  const handleTryNewModel = async (): Promise<void> => {
    scope.get(productEventLogger$).log({
      eventName: "codex_model_announcement_cta_clicked",
      metadata: {
        source: "upgrade",
        model: modelUpgradeInfo.model,
      },
    });
    await setModelAndReasoningEffort(
      modelUpgradeInfo.model,
      modelUpgradeInfo.reasoningEffort,
    );

    dismissAnnouncement();
  };

  return (
    <ModelAnnouncementModal
      announcementSource="upgrade"
      dismissAnnouncement={dismissAnnouncement}
      modelName={modelName}
      model={modelUpgradeInfo.model}
      body={
        <p className="text-base leading-normal tracking-normal text-token-description-foreground">
          {announcementLinkUrl == null ? (
            <FormattedMessage
              id="codexUpgradeModal.bodyWithoutLink"
              defaultMessage="Our latest frontier agentic coding model — smarter, faster, and more capable at general technical work."
              description="Body copy explaining that Codex uses the upgraded model when no announcement link is available"
            />
          ) : isGpt54Upgrade ? (
            <FormattedMessage
              id="codexUpgradeModal.bodyWithLinkGpt54"
              defaultMessage="The most capable model for complex, professional work, coding and agentic workflows — smarter, faster, and more reliable. {link}"
              description="Body copy explaining that Codex uses the gpt-5.4 upgraded model when an announcement link is available"
              values={{
                link: (
                  <a
                    href={announcementLinkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-token-text-link-foreground"
                  >
                    <FormattedMessage
                      id="codexUpgradeModal.smarterAndFaster"
                      defaultMessage="Learn more"
                      description="Link text to open the upgraded model announcement"
                    />
                  </a>
                ),
              }}
            />
          ) : (
            <FormattedMessage
              id="codexUpgradeModal.bodyWithLink"
              defaultMessage="Our latest frontier agentic coding model — smarter, faster, and more capable at general technical work. {link}"
              description="Body copy explaining that Codex uses the upgraded model when an announcement link is available"
              values={{
                link: (
                  <a
                    href={announcementLinkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-token-text-link-foreground"
                  >
                    <FormattedMessage
                      id="codexUpgradeModal.smarterAndFaster"
                      defaultMessage="Learn more"
                      description="Link text to open the upgraded model announcement"
                    />
                  </a>
                ),
              }}
            />
          )}
        </p>
      }
      onTryModel={handleTryNewModel}
    />
  );
}

function ModelAnnouncementModal({
  announcementSource,
  body,
  dismissAnnouncement,
  model,
  modelName,
  onTryModel,
}: {
  announcementSource: ModelAnnouncementSource;
  body: ReactNode;
  dismissAnnouncement: () => void;
  model: string;
  modelName: string;
  onTryModel: () => void | Promise<void>;
}): ReactElement {
  const scope = useScope(AppScope);
  const hasLoggedViewRef = useRef(false);

  useEffect(() => {
    if (hasLoggedViewRef.current) {
      return;
    }

    hasLoggedViewRef.current = true;
    scope.get(productEventLogger$).log({
      eventName: "codex_model_announcement_viewed",
      metadata: {
        source: announcementSource,
        model,
      },
    });
  }, [announcementSource, model, scope]);

  return (
    <AnnouncementModal
      title={
        <FormattedMessage
          id="codexUpgradeModal.title"
          defaultMessage="Introducing {modelName}"
          description="Title for the Codex upgrade modal"
          values={{ modelName }}
        />
      }
      body={body}
      media={
        <img
          src={gradientBackground}
          alt={modelName}
          className="h-full w-full object-cover"
        />
      }
      dismissLabel={
        <FormattedMessage
          id="codexUpgradeModal.useExistingModel"
          defaultMessage="Continue with current model"
          description="Secondary action that dismisses the Codex upgrade modal"
        />
      }
      primaryActionLabel={
        <FormattedMessage
          id="codexUpgradeModal.tryNewModel"
          defaultMessage="Try {modelName} now"
          description="Primary CTA encouraging users to adopt the upgraded model"
          values={{ modelName }}
        />
      }
      onDismiss={() => {
        scope.get(productEventLogger$).log({
          eventName: "codex_model_announcement_dismissed",
          metadata: {
            source: announcementSource,
            model,
          },
        });
        dismissAnnouncement();
      }}
      onPrimaryAction={onTryModel}
    />
  );
}
