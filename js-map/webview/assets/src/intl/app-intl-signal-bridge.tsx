import { useScope } from "maitai";
import { useLayoutEffect } from "react";
import { useIntl } from "react-intl";

import { AppScope } from "@/scopes/app-scope";

import { intl$ } from "./app-intl-signal";

export function AppIntlSignalBridge(): null {
  const scope = useScope(AppScope);
  const intl = useIntl();

  useLayoutEffect(() => {
    scope.set(intl$, intl);
  }, [intl, scope]);

  return null;
}
