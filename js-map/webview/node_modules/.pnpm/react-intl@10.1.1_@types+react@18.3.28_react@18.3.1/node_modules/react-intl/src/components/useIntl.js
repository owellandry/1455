import * as React from "react";
import "../types.js";
import { invariantIntlContext } from "../utils.js";
import { Context } from "./context.js";
export default function useIntl() {
	const intl = React.useContext(Context);
	invariantIntlContext(intl);
	return intl;
}
