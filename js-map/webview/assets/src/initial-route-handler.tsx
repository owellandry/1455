import { useEffect, useEffectEvent, useState } from "react";
import { Navigate, useLocation } from "react-router";

import { initialRoute } from "./initial-route-atom";

export function InitialRouteHandler({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode | null {
  const [hasNavigated, setHasNavigated] = useState(false);
  const location = useLocation();

  const isOnInitialRoute = initialRoute === location.pathname;
  const seHasNavigationEvent = useEffectEvent(setHasNavigated);
  useEffect(() => {
    if (!initialRoute || hasNavigated || !isOnInitialRoute) {
      return;
    }
    seHasNavigationEvent(true);
  }, [hasNavigated, isOnInitialRoute]);

  if (!initialRoute || hasNavigated || isOnInitialRoute) {
    return children;
  }
  return <Navigate to={initialRoute} replace />;
}
