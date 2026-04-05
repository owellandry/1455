import { signal } from "maitai";

import { AppScope } from "@/scopes/app-scope";

import type { ProductEventLogger } from "./product-events";

export type ProductEventService = {
  log: ProductEventLogger;
};

const noopProductEventService: ProductEventService = {
  log: () => {},
};

export const productEventLogger$ = signal(AppScope, noopProductEventService);
