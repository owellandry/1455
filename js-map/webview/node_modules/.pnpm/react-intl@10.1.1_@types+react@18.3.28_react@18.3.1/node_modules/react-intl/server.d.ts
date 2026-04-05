import { type MessageDescriptor } from "@formatjs/intl";
export { createIntlCache, type IntlCache, type MessageDescriptor } from "@formatjs/intl";
export { createIntl } from "./src/components/createIntl.js";
export type { IntlConfig, IntlShape, ResolvedIntlConfig } from "./src/types.js";
export declare function defineMessages<
	K extends keyof any,
	T = MessageDescriptor,
	U extends Record<K, T> = Record<K, T>
>(msgs: U): U;
export declare function defineMessage<T extends MessageDescriptor>(msg: T): T;
