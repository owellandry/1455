import { scope } from "maitai";

import { AppScope } from "@/scopes/app-scope";

export type RouteScopeValue = {
  pathname: string;
  routeTemplate: string;
};

export const RouteScope = scope<"RouteScope", RouteScopeValue, typeof AppScope>(
  "RouteScope",
  {
    parent: AppScope,
  },
);
