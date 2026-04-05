import clsx from "clsx";
import { useScope, useSignal } from "maitai";
import type React from "react";
import { useIntl } from "react-intl";

import { Button } from "@/components/button";
import ChatIcon from "@/icons/chat.svg";
import DiffIcon from "@/icons/diff.svg";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";

import { contentSearchDomain$, setContentSearchDomain } from "./search-model";

export function SearchBarDomainToggle(): React.ReactElement {
  const scope = useScope(ThreadRouteScope);
  const intl = useIntl();
  const domain = useSignal(contentSearchDomain$);

  return (
    <div className="col-[2/3] row-[1] flex h-[44px] items-center gap-3">
      <Button
        className={clsx(
          domain === "conversation"
            ? "text-token-text-link-foreground"
            : "text-token-description-foreground",
          "p-0",
        )}
        size="icon"
        color="ghost"
        uniform
        onClick={(): void => {
          setContentSearchDomain(scope, "conversation");
        }}
        aria-pressed={domain === "conversation"}
        aria-label={intl.formatMessage({
          id: "codex.threadFindBar.chatFilter",
          defaultMessage: "Search chat",
          description: "Button label to scope find results to chat",
        })}
      >
        <ChatIcon className="size-4" />
      </Button>
      <Button
        className={clsx(
          domain === "diff"
            ? "text-token-text-link-foreground"
            : "text-token-description-foreground",
          "p-0",
        )}
        size="icon"
        color="ghost"
        uniform
        onClick={(): void => {
          setContentSearchDomain(scope, "diff");
        }}
        aria-pressed={domain === "diff"}
        aria-label={intl.formatMessage({
          id: "codex.threadFindBar.diffFilter",
          defaultMessage: "Search diffs",
          description: "Button label to scope find results to diffs",
        })}
      >
        <DiffIcon className="size-4" />
      </Button>
    </div>
  );
}
