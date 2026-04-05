import { signal } from "maitai";

import { AppScope } from "@/scopes/app-scope";

export const canGoBack$ = signal(AppScope, false);
export const canGoForward$ = signal(AppScope, false);
