import { signal } from "maitai";

import { AppScope } from "@/scopes/app-scope";

export const appShellSidebarOpen$ = signal<typeof AppScope, boolean>(
  AppScope,
  true,
);
