/*
* Copyright 2015, Yahoo Inc.
* Copyrights licensed under the New BSD License.
* See the accompanying LICENSE file for terms.
*/
import { createIntlCache } from "@formatjs/intl";
import * as React from "react";
import { DEFAULT_INTL_CONFIG, invariantIntlContext, shallowEqual } from "../utils.js";
import { createIntl } from "./createIntl.js";
import { Provider } from "./context.js";
import { jsx as _jsx } from "react/jsx-runtime";
function processIntlConfig(config) {
	return {
		locale: config.locale,
		timeZone: config.timeZone,
		fallbackOnEmptyString: config.fallbackOnEmptyString,
		formats: config.formats,
		textComponent: config.textComponent,
		messages: config.messages,
		defaultLocale: config.defaultLocale,
		defaultFormats: config.defaultFormats,
		onError: config.onError,
		onWarn: config.onWarn,
		wrapRichTextChunksInFragment: config.wrapRichTextChunksInFragment,
		defaultRichTextElements: config.defaultRichTextElements
	};
}
function IntlProviderImpl(props) {
	const cacheRef = React.useRef(createIntlCache());
	const prevConfigRef = React.useRef(undefined);
	const intlRef = React.useRef(undefined);
	// Filter out undefined values from props so they don't override defaults.
	// React's defaultProps treated `prop={undefined}` as "not provided"; we
	// replicate that behaviour here after converting to a function component.
	const filteredProps = {};
	for (const key in props) {
		if (props[key] !== undefined) {
			filteredProps[key] = props[key];
		}
	}
	const config = processIntlConfig({
		...DEFAULT_INTL_CONFIG,
		...filteredProps
	});
	if (!prevConfigRef.current || !shallowEqual(prevConfigRef.current, config)) {
		prevConfigRef.current = config;
		intlRef.current = createIntl(config, cacheRef.current);
	}
	invariantIntlContext(intlRef.current);
	return /* @__PURE__ */ _jsx(Provider, {
		value: intlRef.current,
		children: props.children
	});
}
IntlProviderImpl.displayName = "IntlProvider";
const IntlProvider = IntlProviderImpl;
export default IntlProvider;
