import { signal } from "maitai";
import { createIntl } from "react-intl";

import { AppScope } from "@/scopes/app-scope";

const fallbackIntl = createIntl({
  locale: "en",
  messages: {},
});

export const intl$ = signal(AppScope, fallbackIntl);
