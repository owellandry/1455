import type { PropsWithChildren, ReactElement } from "react";
import { Navigate } from "react-router";

import { AppPreloader } from "@/loading-page/app-preloader";

import { useNux } from "./use-nux";

export function NuxGate({ children }: PropsWithChildren): ReactElement {
  const nux = useNux();

  if (nux == null) {
    return <AppPreloader />;
  }

  if (nux !== "none") {
    return <Navigate to="/first-run" replace />;
  }

  return <>{children}</>;
}
