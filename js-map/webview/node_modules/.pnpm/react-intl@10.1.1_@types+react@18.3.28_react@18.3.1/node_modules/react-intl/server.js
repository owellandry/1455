import "@formatjs/intl";
export { createIntlCache } from "@formatjs/intl";
export { createIntl } from "./src/components/createIntl.js";
// Identity functions — duplicated here to avoid importing from "use client" index
export function defineMessages(msgs) {
	return msgs;
}
export function defineMessage(msg) {
	return msg;
}
