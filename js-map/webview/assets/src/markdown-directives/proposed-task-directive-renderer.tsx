import clsx from "clsx";
import type React from "react";
import type { ReactNode } from "react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router";

import { Button } from "@/components/button";
import type { HomeLocationState } from "@/home-page";

export function ProposedTaskDirectiveRenderer({
  title,
  prompt,
}: {
  title: ReactNode;
  prompt: string;
}): React.ReactElement {
  const navigate = useNavigate();

  return (
    <div className="mt-1 mb-3 flex w-full items-center rounded-xl border border-token-input-border bg-token-bg-primary px-3 py-3">
      <div className="flex flex-1 flex-col">
        <span className="text-sm text-token-text-tertiary">
          <FormattedMessage
            id="wham.whamProposedTask.title"
            defaultMessage="Suggested task"
            description="Label for a card that suggests a follow up Codex task"
          />
        </span>
        <span className={clsx("text-sm font-medium")}>{title}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Button
          color="outline"
          onClick={() => {
            const state: HomeLocationState = {
              prefillPrompt: prompt,
            };
            void navigate("/", {
              state,
            });
          }}
        >
          <FormattedMessage
            id="wham.whamProposedTask.useSuggestion"
            defaultMessage="Use suggestion"
            description="Button to open the Composer with a prefilled prompt from a suggestion"
          />
        </Button>
      </div>
    </div>
  );
}
