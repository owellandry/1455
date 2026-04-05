import { scope, type Scope } from "maitai";

export const AppScope = scope<"AppScope", {}>("AppScope");

export type AppScopeHandle = Scope<typeof AppScope>;
