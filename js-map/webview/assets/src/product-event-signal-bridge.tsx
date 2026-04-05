import { useScope } from "maitai";
import { useLayoutEffect } from "react";

import { AppScope } from "@/scopes/app-scope";

import { productEventLogger$ } from "./product-event-signal";
import { useProductEvents } from "./product-events";

export function ProductEventSignalBridge(): null {
  const scope = useScope(AppScope);
  const logProductEvent = useProductEvents();

  useLayoutEffect(() => {
    scope.set(productEventLogger$, { log: logProductEvent });
  }, [logProductEvent, scope]);

  return null;
}
