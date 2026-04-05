import { useScope } from "maitai";
import type React from "react";
import { useIntl } from "react-intl";

import { Button } from "@/components/button";
import XIcon from "@/icons/x.svg";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";

import { closeContentSearch } from "./search-model";

export function SearchBarClose(): React.ReactElement {
  const scope = useScope(ThreadRouteScope);
  const intl = useIntl();

  return (
    <div className="col-[3/4] row-[1] flex h-[44px] items-center pr-4">
      <div className="mr-3 h-2 w-px bg-token-border" />
      <Button
        className="p-0"
        size="icon"
        color="ghost"
        uniform
        onClick={(): void => {
          closeContentSearch(scope);
        }}
        aria-label={intl.formatMessage({
          id: "codex.threadFindBar.close",
          defaultMessage: "Close find",
          description: "Button label to close the find bar",
        })}
      >
        <XIcon className="size-4 text-token-foreground" />
      </Button>
    </div>
  );
}
