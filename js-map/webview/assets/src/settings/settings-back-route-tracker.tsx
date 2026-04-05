import { useSetAtom } from "jotai";
import { useEffect } from "react";
import { useLocation } from "react-router";

import { settingsBackRouteAtom } from "./settings-back-route";

export function SettingsBackRouteTracker(): null {
  const location = useLocation();
  const setBackRoute = useSetAtom(settingsBackRouteAtom);

  useEffect(() => {
    if (!location.pathname.startsWith("/settings")) {
      setBackRoute(`${location.pathname}${location.search}${location.hash}`);
    }
  }, [location.pathname, location.search, location.hash, setBackRoute]);

  return null;
}
