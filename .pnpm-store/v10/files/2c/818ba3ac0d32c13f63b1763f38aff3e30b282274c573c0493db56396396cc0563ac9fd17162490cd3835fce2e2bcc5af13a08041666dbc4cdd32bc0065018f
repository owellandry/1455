"use client";
var ReactIntl = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined")
      return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value) => {
    __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
    return value;
  };

  // packages/react-intl/index.ts
  var react_intl_exports = {};
  __export(react_intl_exports, {
    FormattedDate: () => FormattedDate,
    FormattedDateParts: () => FormattedDateParts,
    FormattedDateTimeRange: () => dateTimeRange_default,
    FormattedDisplayName: () => FormattedDisplayName,
    FormattedList: () => FormattedList,
    FormattedListParts: () => FormattedListParts,
    FormattedMessage: () => message_default,
    FormattedNumber: () => FormattedNumber,
    FormattedNumberParts: () => FormattedNumberParts,
    FormattedPlural: () => plural_default,
    FormattedRelativeTime: () => relative_default,
    FormattedTime: () => FormattedTime,
    FormattedTimeParts: () => FormattedTimeParts,
    IntlContext: () => IntlContext,
    IntlProvider: () => provider_default,
    InvalidConfigError: () => InvalidConfigError,
    MessageFormatError: () => MessageFormatError,
    MissingDataError: () => MissingDataError,
    MissingTranslationError: () => MissingTranslationError,
    RawIntlProvider: () => Provider,
    ReactIntlError: () => IntlError,
    ReactIntlErrorCode: () => IntlErrorCode,
    UnsupportedFormatterError: () => UnsupportedFormatterError,
    createIntl: () => createIntl2,
    createIntlCache: () => createIntlCache,
    defineMessage: () => defineMessage,
    defineMessages: () => defineMessages,
    useIntl: () => useIntl
  });

  // packages/react-intl/src/components/createFormattedComponent.tsx
  var React4 = __toESM(window.React);

  // packages/react-intl/src/components/useIntl.ts
  var React3 = __toESM(window.React);

  // packages/react-intl/src/utils.tsx
  var React = __toESM(window.React);

  // node_modules/.aspect_rules_js/@formatjs+icu-skeleton-parser@0.0.0/node_modules/@formatjs/icu-skeleton-parser/date-time.js
  var DATE_TIME_REGEX = /(?:[Eec]{1,6}|G{1,5}|[Qq]{1,5}|(?:[yYur]+|U{1,5})|[ML]{1,5}|d{1,2}|D{1,3}|F{1}|[abB]{1,5}|[hkHK]{1,2}|w{1,2}|W{1}|m{1,2}|s{1,2}|[zZOvVxX]{1,4})(?=([^']*'[^']*')*[^']*$)/g;
  function parseDateTimeSkeleton(skeleton) {
    const result = {};
    skeleton.replace(DATE_TIME_REGEX, (match) => {
      const len = match.length;
      switch (match[0]) {
        case "G":
          result.era = len === 4 ? "long" : len === 5 ? "narrow" : "short";
          break;
        case "y":
          result.year = len === 2 ? "2-digit" : "numeric";
          break;
        case "Y":
        case "u":
        case "U":
        case "r":
          throw new RangeError("`Y/u/U/r` (year) patterns are not supported, use `y` instead");
        case "q":
        case "Q":
          throw new RangeError("`q/Q` (quarter) patterns are not supported");
        case "M":
        case "L":
          result.month = [
            "numeric",
            "2-digit",
            "short",
            "long",
            "narrow"
          ][len - 1];
          break;
        case "w":
        case "W":
          throw new RangeError("`w/W` (week) patterns are not supported");
        case "d":
          result.day = ["numeric", "2-digit"][len - 1];
          break;
        case "D":
        case "F":
        case "g":
          throw new RangeError("`D/F/g` (day) patterns are not supported, use `d` instead");
        case "E":
          result.weekday = len === 4 ? "long" : len === 5 ? "narrow" : "short";
          break;
        case "e":
          if (len < 4) {
            throw new RangeError("`e..eee` (weekday) patterns are not supported");
          }
          result.weekday = [
            "short",
            "long",
            "narrow",
            "short"
          ][len - 4];
          break;
        case "c":
          if (len < 4) {
            throw new RangeError("`c..ccc` (weekday) patterns are not supported");
          }
          result.weekday = [
            "short",
            "long",
            "narrow",
            "short"
          ][len - 4];
          break;
        case "a":
          result.hour12 = true;
          break;
        case "b":
        case "B":
          throw new RangeError("`b/B` (period) patterns are not supported, use `a` instead");
        case "h":
          result.hourCycle = "h12";
          result.hour = ["numeric", "2-digit"][len - 1];
          break;
        case "H":
          result.hourCycle = "h23";
          result.hour = ["numeric", "2-digit"][len - 1];
          break;
        case "K":
          result.hourCycle = "h11";
          result.hour = ["numeric", "2-digit"][len - 1];
          break;
        case "k":
          result.hourCycle = "h24";
          result.hour = ["numeric", "2-digit"][len - 1];
          break;
        case "j":
        case "J":
        case "C":
          throw new RangeError("`j/J/C` (hour) patterns are not supported, use `h/H/K/k` instead");
        case "m":
          result.minute = ["numeric", "2-digit"][len - 1];
          break;
        case "s":
          result.second = ["numeric", "2-digit"][len - 1];
          break;
        case "S":
        case "A":
          throw new RangeError("`S/A` (second) patterns are not supported, use `s` instead");
        case "z":
          result.timeZoneName = len < 4 ? "short" : "long";
          break;
        case "Z":
        case "O":
        case "v":
        case "V":
        case "X":
        case "x":
          throw new RangeError("`Z/O/v/V/X/x` (timeZone) patterns are not supported, use `z` instead");
      }
      return "";
    });
    return result;
  }

  // node_modules/.aspect_rules_js/@formatjs+icu-skeleton-parser@0.0.0/node_modules/@formatjs/icu-skeleton-parser/regex.generated.js
  var WHITE_SPACE_REGEX = /[\t-\r \x85\u200E\u200F\u2028\u2029]/i;

  // node_modules/.aspect_rules_js/@formatjs+icu-skeleton-parser@0.0.0/node_modules/@formatjs/icu-skeleton-parser/number.js
  function parseNumberSkeletonFromString(skeleton) {
    if (skeleton.length === 0) {
      throw new Error("Number skeleton cannot be empty");
    }
    const stringTokens = skeleton.split(WHITE_SPACE_REGEX).filter((x) => x.length > 0);
    const tokens = [];
    for (const stringToken of stringTokens) {
      let stemAndOptions = stringToken.split("/");
      if (stemAndOptions.length === 0) {
        throw new Error("Invalid number skeleton");
      }
      const [stem, ...options] = stemAndOptions;
      for (const option of options) {
        if (option.length === 0) {
          throw new Error("Invalid number skeleton");
        }
      }
      tokens.push({
        stem,
        options
      });
    }
    return tokens;
  }
  function icuUnitToEcma(unit) {
    return unit.replace(/^(.*?)-/, "");
  }
  var FRACTION_PRECISION_REGEX = /^\.(?:(0+)(\*)?|(#+)|(0+)(#+))$/g;
  var SIGNIFICANT_PRECISION_REGEX = /^(@+)?(\+|#+)?[rs]?$/g;
  var INTEGER_WIDTH_REGEX = /(\*)(0+)|(#+)(0+)|(0+)/g;
  var CONCISE_INTEGER_WIDTH_REGEX = /^(0+)$/;
  function parseSignificantPrecision(str) {
    const result = {};
    if (str[str.length - 1] === "r") {
      result.roundingPriority = "morePrecision";
    } else if (str[str.length - 1] === "s") {
      result.roundingPriority = "lessPrecision";
    }
    str.replace(SIGNIFICANT_PRECISION_REGEX, function(_, g1, g2) {
      if (typeof g2 !== "string") {
        result.minimumSignificantDigits = g1.length;
        result.maximumSignificantDigits = g1.length;
      } else if (g2 === "+") {
        result.minimumSignificantDigits = g1.length;
      } else if (g1[0] === "#") {
        result.maximumSignificantDigits = g1.length;
      } else {
        result.minimumSignificantDigits = g1.length;
        result.maximumSignificantDigits = g1.length + (typeof g2 === "string" ? g2.length : 0);
      }
      return "";
    });
    return result;
  }
  function parseSign(str) {
    switch (str) {
      case "sign-auto":
        return { signDisplay: "auto" };
      case "sign-accounting":
      case "()":
        return { currencySign: "accounting" };
      case "sign-always":
      case "+!":
        return { signDisplay: "always" };
      case "sign-accounting-always":
      case "()!":
        return {
          signDisplay: "always",
          currencySign: "accounting"
        };
      case "sign-except-zero":
      case "+?":
        return { signDisplay: "exceptZero" };
      case "sign-accounting-except-zero":
      case "()?":
        return {
          signDisplay: "exceptZero",
          currencySign: "accounting"
        };
      case "sign-never":
      case "+_":
        return { signDisplay: "never" };
    }
  }
  function parseConciseScientificAndEngineeringStem(stem) {
    let result;
    if (stem[0] === "E" && stem[1] === "E") {
      result = { notation: "engineering" };
      stem = stem.slice(2);
    } else if (stem[0] === "E") {
      result = { notation: "scientific" };
      stem = stem.slice(1);
    }
    if (result) {
      const signDisplay = stem.slice(0, 2);
      if (signDisplay === "+!") {
        result.signDisplay = "always";
        stem = stem.slice(2);
      } else if (signDisplay === "+?") {
        result.signDisplay = "exceptZero";
        stem = stem.slice(2);
      }
      if (!CONCISE_INTEGER_WIDTH_REGEX.test(stem)) {
        throw new Error("Malformed concise eng/scientific notation");
      }
      result.minimumIntegerDigits = stem.length;
    }
    return result;
  }
  function parseNotationOptions(opt) {
    const result = {};
    const signOpts = parseSign(opt);
    if (signOpts) {
      return signOpts;
    }
    return result;
  }
  function parseNumberSkeleton(tokens) {
    let result = {};
    for (const token of tokens) {
      switch (token.stem) {
        case "percent":
        case "%":
          result.style = "percent";
          continue;
        case "%x100":
          result.style = "percent";
          result.scale = 100;
          continue;
        case "currency":
          result.style = "currency";
          result.currency = token.options[0];
          continue;
        case "group-off":
        case ",_":
          result.useGrouping = false;
          continue;
        case "precision-integer":
        case ".":
          result.maximumFractionDigits = 0;
          continue;
        case "measure-unit":
        case "unit":
          result.style = "unit";
          result.unit = icuUnitToEcma(token.options[0]);
          continue;
        case "compact-short":
        case "K":
          result.notation = "compact";
          result.compactDisplay = "short";
          continue;
        case "compact-long":
        case "KK":
          result.notation = "compact";
          result.compactDisplay = "long";
          continue;
        case "scientific":
          result = {
            ...result,
            notation: "scientific",
            ...token.options.reduce((all, opt) => ({
              ...all,
              ...parseNotationOptions(opt)
            }), {})
          };
          continue;
        case "engineering":
          result = {
            ...result,
            notation: "engineering",
            ...token.options.reduce((all, opt) => ({
              ...all,
              ...parseNotationOptions(opt)
            }), {})
          };
          continue;
        case "notation-simple":
          result.notation = "standard";
          continue;
        case "unit-width-narrow":
          result.currencyDisplay = "narrowSymbol";
          result.unitDisplay = "narrow";
          continue;
        case "unit-width-short":
          result.currencyDisplay = "code";
          result.unitDisplay = "short";
          continue;
        case "unit-width-full-name":
          result.currencyDisplay = "name";
          result.unitDisplay = "long";
          continue;
        case "unit-width-iso-code":
          result.currencyDisplay = "symbol";
          continue;
        case "scale":
          result.scale = parseFloat(token.options[0]);
          continue;
        case "rounding-mode-floor":
          result.roundingMode = "floor";
          continue;
        case "rounding-mode-ceiling":
          result.roundingMode = "ceil";
          continue;
        case "rounding-mode-down":
          result.roundingMode = "trunc";
          continue;
        case "rounding-mode-up":
          result.roundingMode = "expand";
          continue;
        case "rounding-mode-half-even":
          result.roundingMode = "halfEven";
          continue;
        case "rounding-mode-half-down":
          result.roundingMode = "halfTrunc";
          continue;
        case "rounding-mode-half-up":
          result.roundingMode = "halfExpand";
          continue;
        case "integer-width":
          if (token.options.length > 1) {
            throw new RangeError("integer-width stems only accept a single optional option");
          }
          token.options[0].replace(INTEGER_WIDTH_REGEX, function(_, g1, g2, g3, g4, g5) {
            if (g1) {
              result.minimumIntegerDigits = g2.length;
            } else if (g3 && g4) {
              throw new Error("We currently do not support maximum integer digits");
            } else if (g5) {
              throw new Error("We currently do not support exact integer digits");
            }
            return "";
          });
          continue;
      }
      if (CONCISE_INTEGER_WIDTH_REGEX.test(token.stem)) {
        result.minimumIntegerDigits = token.stem.length;
        continue;
      }
      if (FRACTION_PRECISION_REGEX.test(token.stem)) {
        if (token.options.length > 1) {
          throw new RangeError("Fraction-precision stems only accept a single optional option");
        }
        token.stem.replace(FRACTION_PRECISION_REGEX, function(_, g1, g2, g3, g4, g5) {
          if (g2 === "*") {
            result.minimumFractionDigits = g1.length;
          } else if (g3 && g3[0] === "#") {
            result.maximumFractionDigits = g3.length;
          } else if (g4 && g5) {
            result.minimumFractionDigits = g4.length;
            result.maximumFractionDigits = g4.length + g5.length;
          } else {
            result.minimumFractionDigits = g1.length;
            result.maximumFractionDigits = g1.length;
          }
          return "";
        });
        const opt = token.options[0];
        if (opt === "w") {
          result = {
            ...result,
            trailingZeroDisplay: "stripIfInteger"
          };
        } else if (opt) {
          result = {
            ...result,
            ...parseSignificantPrecision(opt)
          };
        }
        continue;
      }
      if (SIGNIFICANT_PRECISION_REGEX.test(token.stem)) {
        result = {
          ...result,
          ...parseSignificantPrecision(token.stem)
        };
        continue;
      }
      const signOpts = parseSign(token.stem);
      if (signOpts) {
        result = {
          ...result,
          ...signOpts
        };
      }
      const conciseScientificAndEngineeringOpts = parseConciseScientificAndEngineeringStem(token.stem);
      if (conciseScientificAndEngineeringOpts) {
        result = {
          ...result,
          ...conciseScientificAndEngineeringOpts
        };
      }
    }
    return result;
  }

  // node_modules/.aspect_rules_js/@formatjs+icu-messageformat-parser@0.0.0/node_modules/@formatjs/icu-messageformat-parser/types.js
  var TYPE = function(TYPE2) {
    TYPE2[TYPE2["literal"] = 0] = "literal";
    TYPE2[TYPE2["argument"] = 1] = "argument";
    TYPE2[TYPE2["number"] = 2] = "number";
    TYPE2[TYPE2["date"] = 3] = "date";
    TYPE2[TYPE2["time"] = 4] = "time";
    TYPE2[TYPE2["select"] = 5] = "select";
    TYPE2[TYPE2["plural"] = 6] = "plural";
    TYPE2[TYPE2["pound"] = 7] = "pound";
    TYPE2[TYPE2["tag"] = 8] = "tag";
    return TYPE2;
  }({});
  var SKELETON_TYPE = function(SKELETON_TYPE2) {
    SKELETON_TYPE2[SKELETON_TYPE2["number"] = 0] = "number";
    SKELETON_TYPE2[SKELETON_TYPE2["dateTime"] = 1] = "dateTime";
    return SKELETON_TYPE2;
  }({});
  function isLiteralElement(el) {
    return el.type === TYPE.literal;
  }
  function isArgumentElement(el) {
    return el.type === TYPE.argument;
  }
  function isNumberElement(el) {
    return el.type === TYPE.number;
  }
  function isDateElement(el) {
    return el.type === TYPE.date;
  }
  function isTimeElement(el) {
    return el.type === TYPE.time;
  }
  function isSelectElement(el) {
    return el.type === TYPE.select;
  }
  function isPluralElement(el) {
    return el.type === TYPE.plural;
  }
  function isPoundElement(el) {
    return el.type === TYPE.pound;
  }
  function isTagElement(el) {
    return el.type === TYPE.tag;
  }
  function isNumberSkeleton(el) {
    return !!(el && typeof el === "object" && el.type === SKELETON_TYPE.number);
  }
  function isDateTimeSkeleton(el) {
    return !!(el && typeof el === "object" && el.type === SKELETON_TYPE.dateTime);
  }

  // node_modules/.aspect_rules_js/@formatjs+icu-messageformat-parser@0.0.0/node_modules/@formatjs/icu-messageformat-parser/error.js
  var ErrorKind = function(ErrorKind2) {
    ErrorKind2[ErrorKind2["EXPECT_ARGUMENT_CLOSING_BRACE"] = 1] = "EXPECT_ARGUMENT_CLOSING_BRACE";
    ErrorKind2[ErrorKind2["EMPTY_ARGUMENT"] = 2] = "EMPTY_ARGUMENT";
    ErrorKind2[ErrorKind2["MALFORMED_ARGUMENT"] = 3] = "MALFORMED_ARGUMENT";
    ErrorKind2[ErrorKind2["EXPECT_ARGUMENT_TYPE"] = 4] = "EXPECT_ARGUMENT_TYPE";
    ErrorKind2[ErrorKind2["INVALID_ARGUMENT_TYPE"] = 5] = "INVALID_ARGUMENT_TYPE";
    ErrorKind2[ErrorKind2["EXPECT_ARGUMENT_STYLE"] = 6] = "EXPECT_ARGUMENT_STYLE";
    ErrorKind2[ErrorKind2["INVALID_NUMBER_SKELETON"] = 7] = "INVALID_NUMBER_SKELETON";
    ErrorKind2[ErrorKind2["INVALID_DATE_TIME_SKELETON"] = 8] = "INVALID_DATE_TIME_SKELETON";
    ErrorKind2[ErrorKind2["EXPECT_NUMBER_SKELETON"] = 9] = "EXPECT_NUMBER_SKELETON";
    ErrorKind2[ErrorKind2["EXPECT_DATE_TIME_SKELETON"] = 10] = "EXPECT_DATE_TIME_SKELETON";
    ErrorKind2[ErrorKind2["UNCLOSED_QUOTE_IN_ARGUMENT_STYLE"] = 11] = "UNCLOSED_QUOTE_IN_ARGUMENT_STYLE";
    ErrorKind2[ErrorKind2["EXPECT_SELECT_ARGUMENT_OPTIONS"] = 12] = "EXPECT_SELECT_ARGUMENT_OPTIONS";
    ErrorKind2[ErrorKind2["EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE"] = 13] = "EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE";
    ErrorKind2[ErrorKind2["INVALID_PLURAL_ARGUMENT_OFFSET_VALUE"] = 14] = "INVALID_PLURAL_ARGUMENT_OFFSET_VALUE";
    ErrorKind2[ErrorKind2["EXPECT_SELECT_ARGUMENT_SELECTOR"] = 15] = "EXPECT_SELECT_ARGUMENT_SELECTOR";
    ErrorKind2[ErrorKind2["EXPECT_PLURAL_ARGUMENT_SELECTOR"] = 16] = "EXPECT_PLURAL_ARGUMENT_SELECTOR";
    ErrorKind2[ErrorKind2["EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT"] = 17] = "EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT";
    ErrorKind2[ErrorKind2["EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT"] = 18] = "EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT";
    ErrorKind2[ErrorKind2["INVALID_PLURAL_ARGUMENT_SELECTOR"] = 19] = "INVALID_PLURAL_ARGUMENT_SELECTOR";
    ErrorKind2[ErrorKind2["DUPLICATE_PLURAL_ARGUMENT_SELECTOR"] = 20] = "DUPLICATE_PLURAL_ARGUMENT_SELECTOR";
    ErrorKind2[ErrorKind2["DUPLICATE_SELECT_ARGUMENT_SELECTOR"] = 21] = "DUPLICATE_SELECT_ARGUMENT_SELECTOR";
    ErrorKind2[ErrorKind2["MISSING_OTHER_CLAUSE"] = 22] = "MISSING_OTHER_CLAUSE";
    ErrorKind2[ErrorKind2["INVALID_TAG"] = 23] = "INVALID_TAG";
    ErrorKind2[ErrorKind2["INVALID_TAG_NAME"] = 25] = "INVALID_TAG_NAME";
    ErrorKind2[ErrorKind2["UNMATCHED_CLOSING_TAG"] = 26] = "UNMATCHED_CLOSING_TAG";
    ErrorKind2[ErrorKind2["UNCLOSED_TAG"] = 27] = "UNCLOSED_TAG";
    return ErrorKind2;
  }({});

  // node_modules/.aspect_rules_js/@formatjs+icu-messageformat-parser@0.0.0/node_modules/@formatjs/icu-messageformat-parser/regex.generated.js
  var SPACE_SEPARATOR_REGEX = /[ \xA0\u1680\u2000-\u200A\u202F\u205F\u3000]/;

  // node_modules/.aspect_rules_js/@formatjs+icu-messageformat-parser@0.0.0/node_modules/@formatjs/icu-messageformat-parser/time-data.generated.js
  var timeData = {
    "001": ["H", "h"],
    "419": [
      "h",
      "H",
      "hB",
      "hb"
    ],
    "AC": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "AD": ["H", "hB"],
    "AE": [
      "h",
      "hB",
      "hb",
      "H"
    ],
    "AF": [
      "H",
      "hb",
      "hB",
      "h"
    ],
    "AG": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "AI": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "AL": [
      "h",
      "H",
      "hB"
    ],
    "AM": ["H", "hB"],
    "AO": ["H", "hB"],
    "AR": [
      "h",
      "H",
      "hB",
      "hb"
    ],
    "AS": ["h", "H"],
    "AT": ["H", "hB"],
    "AU": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "AW": ["H", "hB"],
    "AX": ["H"],
    "AZ": [
      "H",
      "hB",
      "h"
    ],
    "BA": [
      "H",
      "hB",
      "h"
    ],
    "BB": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "BD": [
      "h",
      "hB",
      "H"
    ],
    "BE": ["H", "hB"],
    "BF": ["H", "hB"],
    "BG": [
      "H",
      "hB",
      "h"
    ],
    "BH": [
      "h",
      "hB",
      "hb",
      "H"
    ],
    "BI": ["H", "h"],
    "BJ": ["H", "hB"],
    "BL": ["H", "hB"],
    "BM": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "BN": [
      "hb",
      "hB",
      "h",
      "H"
    ],
    "BO": [
      "h",
      "H",
      "hB",
      "hb"
    ],
    "BQ": ["H"],
    "BR": ["H", "hB"],
    "BS": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "BT": ["h", "H"],
    "BW": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "BY": ["H", "h"],
    "BZ": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "CA": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "CC": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "CD": ["hB", "H"],
    "CF": [
      "H",
      "h",
      "hB"
    ],
    "CG": ["H", "hB"],
    "CH": [
      "H",
      "hB",
      "h"
    ],
    "CI": ["H", "hB"],
    "CK": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "CL": [
      "h",
      "H",
      "hB",
      "hb"
    ],
    "CM": [
      "H",
      "h",
      "hB"
    ],
    "CN": [
      "H",
      "hB",
      "hb",
      "h"
    ],
    "CO": [
      "h",
      "H",
      "hB",
      "hb"
    ],
    "CP": ["H"],
    "CR": [
      "h",
      "H",
      "hB",
      "hb"
    ],
    "CU": [
      "h",
      "H",
      "hB",
      "hb"
    ],
    "CV": ["H", "hB"],
    "CW": ["H", "hB"],
    "CX": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "CY": [
      "h",
      "H",
      "hb",
      "hB"
    ],
    "CZ": ["H"],
    "DE": ["H", "hB"],
    "DG": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "DJ": ["h", "H"],
    "DK": ["H"],
    "DM": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "DO": [
      "h",
      "H",
      "hB",
      "hb"
    ],
    "DZ": [
      "h",
      "hB",
      "hb",
      "H"
    ],
    "EA": [
      "H",
      "h",
      "hB",
      "hb"
    ],
    "EC": [
      "h",
      "H",
      "hB",
      "hb"
    ],
    "EE": ["H", "hB"],
    "EG": [
      "h",
      "hB",
      "hb",
      "H"
    ],
    "EH": [
      "h",
      "hB",
      "hb",
      "H"
    ],
    "ER": ["h", "H"],
    "ES": [
      "H",
      "hB",
      "h",
      "hb"
    ],
    "ET": [
      "hB",
      "hb",
      "h",
      "H"
    ],
    "FI": ["H"],
    "FJ": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "FK": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "FM": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "FO": ["H", "h"],
    "FR": ["H", "hB"],
    "GA": ["H", "hB"],
    "GB": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "GD": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "GE": [
      "H",
      "hB",
      "h"
    ],
    "GF": ["H", "hB"],
    "GG": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "GH": ["h", "H"],
    "GI": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "GL": ["H", "h"],
    "GM": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "GN": ["H", "hB"],
    "GP": ["H", "hB"],
    "GQ": [
      "H",
      "hB",
      "h",
      "hb"
    ],
    "GR": [
      "h",
      "H",
      "hb",
      "hB"
    ],
    "GS": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "GT": [
      "h",
      "H",
      "hB",
      "hb"
    ],
    "GU": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "GW": ["H", "hB"],
    "GY": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "HK": [
      "h",
      "hB",
      "hb",
      "H"
    ],
    "HN": [
      "h",
      "H",
      "hB",
      "hb"
    ],
    "HR": ["H", "hB"],
    "HU": ["H", "h"],
    "IC": [
      "H",
      "h",
      "hB",
      "hb"
    ],
    "ID": ["H"],
    "IE": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "IL": ["H", "hB"],
    "IM": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "IN": ["h", "H"],
    "IO": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "IQ": [
      "h",
      "hB",
      "hb",
      "H"
    ],
    "IR": ["hB", "H"],
    "IS": ["H"],
    "IT": ["H", "hB"],
    "JE": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "JM": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "JO": [
      "h",
      "hB",
      "hb",
      "H"
    ],
    "JP": [
      "H",
      "K",
      "h"
    ],
    "KE": [
      "hB",
      "hb",
      "H",
      "h"
    ],
    "KG": [
      "H",
      "h",
      "hB",
      "hb"
    ],
    "KH": [
      "hB",
      "h",
      "H",
      "hb"
    ],
    "KI": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "KM": [
      "H",
      "h",
      "hB",
      "hb"
    ],
    "KN": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "KP": [
      "h",
      "H",
      "hB",
      "hb"
    ],
    "KR": [
      "h",
      "H",
      "hB",
      "hb"
    ],
    "KW": [
      "h",
      "hB",
      "hb",
      "H"
    ],
    "KY": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "KZ": ["H", "hB"],
    "LA": [
      "H",
      "hb",
      "hB",
      "h"
    ],
    "LB": [
      "h",
      "hB",
      "hb",
      "H"
    ],
    "LC": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "LI": [
      "H",
      "hB",
      "h"
    ],
    "LK": [
      "H",
      "h",
      "hB",
      "hb"
    ],
    "LR": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "LS": ["h", "H"],
    "LT": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "LU": [
      "H",
      "h",
      "hB"
    ],
    "LV": [
      "H",
      "hB",
      "hb",
      "h"
    ],
    "LY": [
      "h",
      "hB",
      "hb",
      "H"
    ],
    "MA": [
      "H",
      "h",
      "hB",
      "hb"
    ],
    "MC": ["H", "hB"],
    "MD": ["H", "hB"],
    "ME": [
      "H",
      "hB",
      "h"
    ],
    "MF": ["H", "hB"],
    "MG": ["H", "h"],
    "MH": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "MK": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "ML": ["H"],
    "MM": [
      "hB",
      "hb",
      "H",
      "h"
    ],
    "MN": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "MO": [
      "h",
      "hB",
      "hb",
      "H"
    ],
    "MP": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "MQ": ["H", "hB"],
    "MR": [
      "h",
      "hB",
      "hb",
      "H"
    ],
    "MS": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "MT": ["H", "h"],
    "MU": ["H", "h"],
    "MV": ["H", "h"],
    "MW": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "MX": [
      "h",
      "H",
      "hB",
      "hb"
    ],
    "MY": [
      "hb",
      "hB",
      "h",
      "H"
    ],
    "MZ": ["H", "hB"],
    "NA": [
      "h",
      "H",
      "hB",
      "hb"
    ],
    "NC": ["H", "hB"],
    "NE": ["H"],
    "NF": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "NG": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "NI": [
      "h",
      "H",
      "hB",
      "hb"
    ],
    "NL": ["H", "hB"],
    "NO": ["H", "h"],
    "NP": [
      "H",
      "h",
      "hB"
    ],
    "NR": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "NU": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "NZ": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "OM": [
      "h",
      "hB",
      "hb",
      "H"
    ],
    "PA": [
      "h",
      "H",
      "hB",
      "hb"
    ],
    "PE": [
      "h",
      "H",
      "hB",
      "hb"
    ],
    "PF": [
      "H",
      "h",
      "hB"
    ],
    "PG": ["h", "H"],
    "PH": [
      "h",
      "hB",
      "hb",
      "H"
    ],
    "PK": [
      "h",
      "hB",
      "H"
    ],
    "PL": ["H", "h"],
    "PM": ["H", "hB"],
    "PN": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "PR": [
      "h",
      "H",
      "hB",
      "hb"
    ],
    "PS": [
      "h",
      "hB",
      "hb",
      "H"
    ],
    "PT": ["H", "hB"],
    "PW": ["h", "H"],
    "PY": [
      "h",
      "H",
      "hB",
      "hb"
    ],
    "QA": [
      "h",
      "hB",
      "hb",
      "H"
    ],
    "RE": ["H", "hB"],
    "RO": ["H", "hB"],
    "RS": [
      "H",
      "hB",
      "h"
    ],
    "RU": ["H"],
    "RW": ["H", "h"],
    "SA": [
      "h",
      "hB",
      "hb",
      "H"
    ],
    "SB": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "SC": [
      "H",
      "h",
      "hB"
    ],
    "SD": [
      "h",
      "hB",
      "hb",
      "H"
    ],
    "SE": ["H"],
    "SG": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "SH": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "SI": ["H", "hB"],
    "SJ": ["H"],
    "SK": ["H"],
    "SL": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "SM": [
      "H",
      "h",
      "hB"
    ],
    "SN": [
      "H",
      "h",
      "hB"
    ],
    "SO": ["h", "H"],
    "SR": ["H", "hB"],
    "SS": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "ST": ["H", "hB"],
    "SV": [
      "h",
      "H",
      "hB",
      "hb"
    ],
    "SX": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "SY": [
      "h",
      "hB",
      "hb",
      "H"
    ],
    "SZ": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "TA": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "TC": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "TD": [
      "h",
      "H",
      "hB"
    ],
    "TF": [
      "H",
      "h",
      "hB"
    ],
    "TG": ["H", "hB"],
    "TH": ["H", "h"],
    "TJ": ["H", "h"],
    "TL": [
      "H",
      "hB",
      "hb",
      "h"
    ],
    "TM": ["H", "h"],
    "TN": [
      "h",
      "hB",
      "hb",
      "H"
    ],
    "TO": ["h", "H"],
    "TR": ["H", "hB"],
    "TT": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "TW": [
      "hB",
      "hb",
      "h",
      "H"
    ],
    "TZ": [
      "hB",
      "hb",
      "H",
      "h"
    ],
    "UA": [
      "H",
      "hB",
      "h"
    ],
    "UG": [
      "hB",
      "hb",
      "H",
      "h"
    ],
    "UM": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "US": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "UY": [
      "h",
      "H",
      "hB",
      "hb"
    ],
    "UZ": [
      "H",
      "hB",
      "h"
    ],
    "VA": [
      "H",
      "h",
      "hB"
    ],
    "VC": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "VE": [
      "h",
      "H",
      "hB",
      "hb"
    ],
    "VG": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "VI": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "VN": ["H", "h"],
    "VU": ["h", "H"],
    "WF": ["H", "hB"],
    "WS": ["h", "H"],
    "XK": [
      "H",
      "hB",
      "h"
    ],
    "YE": [
      "h",
      "hB",
      "hb",
      "H"
    ],
    "YT": ["H", "hB"],
    "ZA": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "ZM": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "ZW": ["H", "h"],
    "af-ZA": [
      "H",
      "h",
      "hB",
      "hb"
    ],
    "ar-001": [
      "h",
      "hB",
      "hb",
      "H"
    ],
    "ca-ES": [
      "H",
      "h",
      "hB"
    ],
    "en-001": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "en-HK": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "en-IL": [
      "H",
      "h",
      "hb",
      "hB"
    ],
    "en-MY": [
      "h",
      "hb",
      "H",
      "hB"
    ],
    "es-BR": [
      "H",
      "h",
      "hB",
      "hb"
    ],
    "es-ES": [
      "H",
      "h",
      "hB",
      "hb"
    ],
    "es-GQ": [
      "H",
      "h",
      "hB",
      "hb"
    ],
    "fr-CA": [
      "H",
      "h",
      "hB"
    ],
    "gl-ES": [
      "H",
      "h",
      "hB"
    ],
    "gu-IN": [
      "hB",
      "hb",
      "h",
      "H"
    ],
    "hi-IN": [
      "hB",
      "h",
      "H"
    ],
    "it-CH": [
      "H",
      "h",
      "hB"
    ],
    "it-IT": [
      "H",
      "h",
      "hB"
    ],
    "kn-IN": [
      "hB",
      "h",
      "H"
    ],
    "ku-SY": ["H", "hB"],
    "ml-IN": [
      "hB",
      "h",
      "H"
    ],
    "mr-IN": [
      "hB",
      "hb",
      "h",
      "H"
    ],
    "pa-IN": [
      "hB",
      "hb",
      "h",
      "H"
    ],
    "ta-IN": [
      "hB",
      "h",
      "hb",
      "H"
    ],
    "te-IN": [
      "hB",
      "h",
      "H"
    ],
    "zu-ZA": [
      "H",
      "hB",
      "hb",
      "h"
    ]
  };

  // node_modules/.aspect_rules_js/@formatjs+icu-messageformat-parser@0.0.0/node_modules/@formatjs/icu-messageformat-parser/date-time-pattern-generator.js
  function getBestPattern(skeleton, locale) {
    let skeletonCopy = "";
    for (let patternPos = 0; patternPos < skeleton.length; patternPos++) {
      const patternChar = skeleton.charAt(patternPos);
      if (patternChar === "j") {
        let extraLength = 0;
        while (patternPos + 1 < skeleton.length && skeleton.charAt(patternPos + 1) === patternChar) {
          extraLength++;
          patternPos++;
        }
        let hourLen = 1 + (extraLength & 1);
        let dayPeriodLen = extraLength < 2 ? 1 : 3 + (extraLength >> 1);
        let dayPeriodChar = "a";
        let hourChar = getDefaultHourSymbolFromLocale(locale);
        if (hourChar == "H" || hourChar == "k") {
          dayPeriodLen = 0;
        }
        while (dayPeriodLen-- > 0) {
          skeletonCopy += dayPeriodChar;
        }
        while (hourLen-- > 0) {
          skeletonCopy = hourChar + skeletonCopy;
        }
      } else if (patternChar === "J") {
        skeletonCopy += "H";
      } else {
        skeletonCopy += patternChar;
      }
    }
    return skeletonCopy;
  }
  function getDefaultHourSymbolFromLocale(locale) {
    let hourCycle = locale.hourCycle;
    if (hourCycle === void 0 && locale.hourCycles && locale.hourCycles.length) {
      hourCycle = locale.hourCycles[0];
    }
    if (hourCycle) {
      switch (hourCycle) {
        case "h24":
          return "k";
        case "h23":
          return "H";
        case "h12":
          return "h";
        case "h11":
          return "K";
        default:
          throw new Error("Invalid hourCycle");
      }
    }
    const languageTag = locale.language;
    let regionTag;
    if (languageTag !== "root") {
      regionTag = locale.maximize().region;
    }
    const hourCycles = timeData[regionTag || ""] || timeData[languageTag || ""] || timeData[`${languageTag}-001`] || timeData["001"];
    return hourCycles[0];
  }

  // node_modules/.aspect_rules_js/@formatjs+icu-messageformat-parser@0.0.0/node_modules/@formatjs/icu-messageformat-parser/parser.js
  var SPACE_SEPARATOR_START_REGEX = new RegExp(`^${SPACE_SEPARATOR_REGEX.source}*`);
  var SPACE_SEPARATOR_END_REGEX = new RegExp(`${SPACE_SEPARATOR_REGEX.source}*$`);
  function createLocation(start, end) {
    return {
      start,
      end
    };
  }
  var hasNativeFromEntries = !!Object.fromEntries;
  var hasTrimStart = !!String.prototype.trimStart;
  var hasTrimEnd = !!String.prototype.trimEnd;
  var fromEntries = hasNativeFromEntries ? Object.fromEntries : function fromEntries2(entries) {
    const obj = {};
    for (const [k, v] of entries) {
      obj[k] = v;
    }
    return obj;
  };
  var trimStart = hasTrimStart ? function trimStart2(s) {
    return s.trimStart();
  } : function trimStart3(s) {
    return s.replace(SPACE_SEPARATOR_START_REGEX, "");
  };
  var trimEnd = hasTrimEnd ? function trimEnd2(s) {
    return s.trimEnd();
  } : function trimEnd3(s) {
    return s.replace(SPACE_SEPARATOR_END_REGEX, "");
  };
  var IDENTIFIER_PREFIX_RE = new RegExp("([^\\p{White_Space}\\p{Pattern_Syntax}]*)", "yu");
  function matchIdentifierAtIndex(s, index) {
    IDENTIFIER_PREFIX_RE.lastIndex = index;
    const match = IDENTIFIER_PREFIX_RE.exec(s);
    return match[1] ?? "";
  }
  var Parser = class {
    constructor(message, options = {}) {
      __publicField(this, "message");
      __publicField(this, "position");
      __publicField(this, "locale");
      __publicField(this, "ignoreTag");
      __publicField(this, "requiresOtherClause");
      __publicField(this, "shouldParseSkeletons");
      this.message = message;
      this.position = {
        offset: 0,
        line: 1,
        column: 1
      };
      this.ignoreTag = !!options.ignoreTag;
      this.locale = options.locale;
      this.requiresOtherClause = !!options.requiresOtherClause;
      this.shouldParseSkeletons = !!options.shouldParseSkeletons;
    }
    parse() {
      if (this.offset() !== 0) {
        throw Error("parser can only be used once");
      }
      return this.parseMessage(0, "", false);
    }
    parseMessage(nestingLevel, parentArgType, expectingCloseTag) {
      let elements = [];
      while (!this.isEOF()) {
        const char = this.char();
        if (char === 123) {
          const result = this.parseArgument(nestingLevel, expectingCloseTag);
          if (result.err) {
            return result;
          }
          elements.push(result.val);
        } else if (char === 125 && nestingLevel > 0) {
          break;
        } else if (char === 35 && (parentArgType === "plural" || parentArgType === "selectordinal")) {
          const position = this.clonePosition();
          this.bump();
          elements.push({
            type: TYPE.pound,
            location: createLocation(position, this.clonePosition())
          });
        } else if (char === 60 && !this.ignoreTag && this.peek() === 47) {
          if (expectingCloseTag) {
            break;
          } else {
            return this.error(ErrorKind.UNMATCHED_CLOSING_TAG, createLocation(this.clonePosition(), this.clonePosition()));
          }
        } else if (char === 60 && !this.ignoreTag && _isAlpha(this.peek() || 0)) {
          const result = this.parseTag(nestingLevel, parentArgType);
          if (result.err) {
            return result;
          }
          elements.push(result.val);
        } else {
          const result = this.parseLiteral(nestingLevel, parentArgType);
          if (result.err) {
            return result;
          }
          elements.push(result.val);
        }
      }
      return {
        val: elements,
        err: null
      };
    }
    /**
    * A tag name must start with an ASCII lower/upper case letter. The grammar is based on the
    * [custom element name][] except that a dash is NOT always mandatory and uppercase letters
    * are accepted:
    *
    * ```
    * tag ::= "<" tagName (whitespace)* "/>" | "<" tagName (whitespace)* ">" message "</" tagName (whitespace)* ">"
    * tagName ::= [a-z] (PENChar)*
    * PENChar ::=
    *     "-" | "." | [0-9] | "_" | [a-z] | [A-Z] | #xB7 | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x37D] |
    *     [#x37F-#x1FFF] | [#x200C-#x200D] | [#x203F-#x2040] | [#x2070-#x218F] | [#x2C00-#x2FEF] |
    *     [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
    * ```
    *
    * [custom element name]: https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
    * NOTE: We're a bit more lax here since HTML technically does not allow uppercase HTML element but we do
    * since other tag-based engines like React allow it
    */
    parseTag(nestingLevel, parentArgType) {
      const startPosition = this.clonePosition();
      this.bump();
      const tagName = this.parseTagName();
      this.bumpSpace();
      if (this.bumpIf("/>")) {
        return {
          val: {
            type: TYPE.literal,
            value: `<${tagName}/>`,
            location: createLocation(startPosition, this.clonePosition())
          },
          err: null
        };
      } else if (this.bumpIf(">")) {
        const childrenResult = this.parseMessage(nestingLevel + 1, parentArgType, true);
        if (childrenResult.err) {
          return childrenResult;
        }
        const children = childrenResult.val;
        const endTagStartPosition = this.clonePosition();
        if (this.bumpIf("</")) {
          if (this.isEOF() || !_isAlpha(this.char())) {
            return this.error(ErrorKind.INVALID_TAG, createLocation(endTagStartPosition, this.clonePosition()));
          }
          const closingTagNameStartPosition = this.clonePosition();
          const closingTagName = this.parseTagName();
          if (tagName !== closingTagName) {
            return this.error(ErrorKind.UNMATCHED_CLOSING_TAG, createLocation(closingTagNameStartPosition, this.clonePosition()));
          }
          this.bumpSpace();
          if (!this.bumpIf(">")) {
            return this.error(ErrorKind.INVALID_TAG, createLocation(endTagStartPosition, this.clonePosition()));
          }
          return {
            val: {
              type: TYPE.tag,
              value: tagName,
              children,
              location: createLocation(startPosition, this.clonePosition())
            },
            err: null
          };
        } else {
          return this.error(ErrorKind.UNCLOSED_TAG, createLocation(startPosition, this.clonePosition()));
        }
      } else {
        return this.error(ErrorKind.INVALID_TAG, createLocation(startPosition, this.clonePosition()));
      }
    }
    /**
    * This method assumes that the caller has peeked ahead for the first tag character.
    */
    parseTagName() {
      const startOffset = this.offset();
      this.bump();
      while (!this.isEOF() && _isPotentialElementNameChar(this.char())) {
        this.bump();
      }
      return this.message.slice(startOffset, this.offset());
    }
    parseLiteral(nestingLevel, parentArgType) {
      const start = this.clonePosition();
      let value = "";
      while (true) {
        const parseQuoteResult = this.tryParseQuote(parentArgType);
        if (parseQuoteResult) {
          value += parseQuoteResult;
          continue;
        }
        const parseUnquotedResult = this.tryParseUnquoted(nestingLevel, parentArgType);
        if (parseUnquotedResult) {
          value += parseUnquotedResult;
          continue;
        }
        const parseLeftAngleResult = this.tryParseLeftAngleBracket();
        if (parseLeftAngleResult) {
          value += parseLeftAngleResult;
          continue;
        }
        break;
      }
      const location = createLocation(start, this.clonePosition());
      return {
        val: {
          type: TYPE.literal,
          value,
          location
        },
        err: null
      };
    }
    tryParseLeftAngleBracket() {
      if (!this.isEOF() && this.char() === 60 && (this.ignoreTag || !_isAlphaOrSlash(this.peek() || 0))) {
        this.bump();
        return "<";
      }
      return null;
    }
    /**
    * Starting with ICU 4.8, an ASCII apostrophe only starts quoted text if it immediately precedes
    * a character that requires quoting (that is, "only where needed"), and works the same in
    * nested messages as on the top level of the pattern. The new behavior is otherwise compatible.
    */
    tryParseQuote(parentArgType) {
      if (this.isEOF() || this.char() !== 39) {
        return null;
      }
      switch (this.peek()) {
        case 39:
          this.bump();
          this.bump();
          return "'";
        case 123:
        case 60:
        case 62:
        case 125:
          break;
        case 35:
          if (parentArgType === "plural" || parentArgType === "selectordinal") {
            break;
          }
          return null;
        default:
          return null;
      }
      this.bump();
      const codePoints = [this.char()];
      this.bump();
      while (!this.isEOF()) {
        const ch = this.char();
        if (ch === 39) {
          if (this.peek() === 39) {
            codePoints.push(39);
            this.bump();
          } else {
            this.bump();
            break;
          }
        } else {
          codePoints.push(ch);
        }
        this.bump();
      }
      return String.fromCodePoint(...codePoints);
    }
    tryParseUnquoted(nestingLevel, parentArgType) {
      if (this.isEOF()) {
        return null;
      }
      const ch = this.char();
      if (ch === 60 || ch === 123 || ch === 35 && (parentArgType === "plural" || parentArgType === "selectordinal") || ch === 125 && nestingLevel > 0) {
        return null;
      } else {
        this.bump();
        return String.fromCodePoint(ch);
      }
    }
    parseArgument(nestingLevel, expectingCloseTag) {
      const openingBracePosition = this.clonePosition();
      this.bump();
      this.bumpSpace();
      if (this.isEOF()) {
        return this.error(ErrorKind.EXPECT_ARGUMENT_CLOSING_BRACE, createLocation(openingBracePosition, this.clonePosition()));
      }
      if (this.char() === 125) {
        this.bump();
        return this.error(ErrorKind.EMPTY_ARGUMENT, createLocation(openingBracePosition, this.clonePosition()));
      }
      let value = this.parseIdentifierIfPossible().value;
      if (!value) {
        return this.error(ErrorKind.MALFORMED_ARGUMENT, createLocation(openingBracePosition, this.clonePosition()));
      }
      this.bumpSpace();
      if (this.isEOF()) {
        return this.error(ErrorKind.EXPECT_ARGUMENT_CLOSING_BRACE, createLocation(openingBracePosition, this.clonePosition()));
      }
      switch (this.char()) {
        case 125: {
          this.bump();
          return {
            val: {
              type: TYPE.argument,
              value,
              location: createLocation(openingBracePosition, this.clonePosition())
            },
            err: null
          };
        }
        case 44: {
          this.bump();
          this.bumpSpace();
          if (this.isEOF()) {
            return this.error(ErrorKind.EXPECT_ARGUMENT_CLOSING_BRACE, createLocation(openingBracePosition, this.clonePosition()));
          }
          return this.parseArgumentOptions(nestingLevel, expectingCloseTag, value, openingBracePosition);
        }
        default:
          return this.error(ErrorKind.MALFORMED_ARGUMENT, createLocation(openingBracePosition, this.clonePosition()));
      }
    }
    /**
    * Advance the parser until the end of the identifier, if it is currently on
    * an identifier character. Return an empty string otherwise.
    */
    parseIdentifierIfPossible() {
      const startingPosition = this.clonePosition();
      const startOffset = this.offset();
      const value = matchIdentifierAtIndex(this.message, startOffset);
      const endOffset = startOffset + value.length;
      this.bumpTo(endOffset);
      const endPosition = this.clonePosition();
      const location = createLocation(startingPosition, endPosition);
      return {
        value,
        location
      };
    }
    parseArgumentOptions(nestingLevel, expectingCloseTag, value, openingBracePosition) {
      let typeStartPosition = this.clonePosition();
      let argType = this.parseIdentifierIfPossible().value;
      let typeEndPosition = this.clonePosition();
      switch (argType) {
        case "":
          return this.error(ErrorKind.EXPECT_ARGUMENT_TYPE, createLocation(typeStartPosition, typeEndPosition));
        case "number":
        case "date":
        case "time": {
          this.bumpSpace();
          let styleAndLocation = null;
          if (this.bumpIf(",")) {
            this.bumpSpace();
            const styleStartPosition = this.clonePosition();
            const result = this.parseSimpleArgStyleIfPossible();
            if (result.err) {
              return result;
            }
            const style = trimEnd(result.val);
            if (style.length === 0) {
              return this.error(ErrorKind.EXPECT_ARGUMENT_STYLE, createLocation(this.clonePosition(), this.clonePosition()));
            }
            const styleLocation = createLocation(styleStartPosition, this.clonePosition());
            styleAndLocation = {
              style,
              styleLocation
            };
          }
          const argCloseResult = this.tryParseArgumentClose(openingBracePosition);
          if (argCloseResult.err) {
            return argCloseResult;
          }
          const location = createLocation(openingBracePosition, this.clonePosition());
          if (styleAndLocation && styleAndLocation.style.startsWith("::")) {
            let skeleton = trimStart(styleAndLocation.style.slice(2));
            if (argType === "number") {
              const result = this.parseNumberSkeletonFromString(skeleton, styleAndLocation.styleLocation);
              if (result.err) {
                return result;
              }
              return {
                val: {
                  type: TYPE.number,
                  value,
                  location,
                  style: result.val
                },
                err: null
              };
            } else {
              if (skeleton.length === 0) {
                return this.error(ErrorKind.EXPECT_DATE_TIME_SKELETON, location);
              }
              let dateTimePattern = skeleton;
              if (this.locale) {
                dateTimePattern = getBestPattern(skeleton, this.locale);
              }
              const style = {
                type: SKELETON_TYPE.dateTime,
                pattern: dateTimePattern,
                location: styleAndLocation.styleLocation,
                parsedOptions: this.shouldParseSkeletons ? parseDateTimeSkeleton(dateTimePattern) : {}
              };
              const type = argType === "date" ? TYPE.date : TYPE.time;
              return {
                val: {
                  type,
                  value,
                  location,
                  style
                },
                err: null
              };
            }
          }
          return {
            val: {
              type: argType === "number" ? TYPE.number : argType === "date" ? TYPE.date : TYPE.time,
              value,
              location,
              style: styleAndLocation?.style ?? null
            },
            err: null
          };
        }
        case "plural":
        case "selectordinal":
        case "select": {
          const typeEndPosition2 = this.clonePosition();
          this.bumpSpace();
          if (!this.bumpIf(",")) {
            return this.error(ErrorKind.EXPECT_SELECT_ARGUMENT_OPTIONS, createLocation(typeEndPosition2, { ...typeEndPosition2 }));
          }
          this.bumpSpace();
          let identifierAndLocation = this.parseIdentifierIfPossible();
          let pluralOffset = 0;
          if (argType !== "select" && identifierAndLocation.value === "offset") {
            if (!this.bumpIf(":")) {
              return this.error(ErrorKind.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE, createLocation(this.clonePosition(), this.clonePosition()));
            }
            this.bumpSpace();
            const result = this.tryParseDecimalInteger(ErrorKind.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE, ErrorKind.INVALID_PLURAL_ARGUMENT_OFFSET_VALUE);
            if (result.err) {
              return result;
            }
            this.bumpSpace();
            identifierAndLocation = this.parseIdentifierIfPossible();
            pluralOffset = result.val;
          }
          const optionsResult = this.tryParsePluralOrSelectOptions(nestingLevel, argType, expectingCloseTag, identifierAndLocation);
          if (optionsResult.err) {
            return optionsResult;
          }
          const argCloseResult = this.tryParseArgumentClose(openingBracePosition);
          if (argCloseResult.err) {
            return argCloseResult;
          }
          const location = createLocation(openingBracePosition, this.clonePosition());
          if (argType === "select") {
            return {
              val: {
                type: TYPE.select,
                value,
                options: fromEntries(optionsResult.val),
                location
              },
              err: null
            };
          } else {
            return {
              val: {
                type: TYPE.plural,
                value,
                options: fromEntries(optionsResult.val),
                offset: pluralOffset,
                pluralType: argType === "plural" ? "cardinal" : "ordinal",
                location
              },
              err: null
            };
          }
        }
        default:
          return this.error(ErrorKind.INVALID_ARGUMENT_TYPE, createLocation(typeStartPosition, typeEndPosition));
      }
    }
    tryParseArgumentClose(openingBracePosition) {
      if (this.isEOF() || this.char() !== 125) {
        return this.error(ErrorKind.EXPECT_ARGUMENT_CLOSING_BRACE, createLocation(openingBracePosition, this.clonePosition()));
      }
      this.bump();
      return {
        val: true,
        err: null
      };
    }
    /**
    * See: https://github.com/unicode-org/icu/blob/af7ed1f6d2298013dc303628438ec4abe1f16479/icu4c/source/common/messagepattern.cpp#L659
    */
    parseSimpleArgStyleIfPossible() {
      let nestedBraces = 0;
      const startPosition = this.clonePosition();
      while (!this.isEOF()) {
        const ch = this.char();
        switch (ch) {
          case 39: {
            this.bump();
            let apostrophePosition = this.clonePosition();
            if (!this.bumpUntil("'")) {
              return this.error(ErrorKind.UNCLOSED_QUOTE_IN_ARGUMENT_STYLE, createLocation(apostrophePosition, this.clonePosition()));
            }
            this.bump();
            break;
          }
          case 123: {
            nestedBraces += 1;
            this.bump();
            break;
          }
          case 125: {
            if (nestedBraces > 0) {
              nestedBraces -= 1;
            } else {
              return {
                val: this.message.slice(startPosition.offset, this.offset()),
                err: null
              };
            }
            break;
          }
          default:
            this.bump();
            break;
        }
      }
      return {
        val: this.message.slice(startPosition.offset, this.offset()),
        err: null
      };
    }
    parseNumberSkeletonFromString(skeleton, location) {
      let tokens = [];
      try {
        tokens = parseNumberSkeletonFromString(skeleton);
      } catch {
        return this.error(ErrorKind.INVALID_NUMBER_SKELETON, location);
      }
      return {
        val: {
          type: SKELETON_TYPE.number,
          tokens,
          location,
          parsedOptions: this.shouldParseSkeletons ? parseNumberSkeleton(tokens) : {}
        },
        err: null
      };
    }
    /**
    * @param nesting_level The current nesting level of messages.
    *     This can be positive when parsing message fragment in select or plural argument options.
    * @param parent_arg_type The parent argument's type.
    * @param parsed_first_identifier If provided, this is the first identifier-like selector of
    *     the argument. It is a by-product of a previous parsing attempt.
    * @param expecting_close_tag If true, this message is directly or indirectly nested inside
    *     between a pair of opening and closing tags. The nested message will not parse beyond
    *     the closing tag boundary.
    */
    tryParsePluralOrSelectOptions(nestingLevel, parentArgType, expectCloseTag, parsedFirstIdentifier) {
      let hasOtherClause = false;
      const options = [];
      const parsedSelectors = /* @__PURE__ */ new Set();
      let { value: selector, location: selectorLocation } = parsedFirstIdentifier;
      while (true) {
        if (selector.length === 0) {
          const startPosition = this.clonePosition();
          if (parentArgType !== "select" && this.bumpIf("=")) {
            const result = this.tryParseDecimalInteger(ErrorKind.EXPECT_PLURAL_ARGUMENT_SELECTOR, ErrorKind.INVALID_PLURAL_ARGUMENT_SELECTOR);
            if (result.err) {
              return result;
            }
            selectorLocation = createLocation(startPosition, this.clonePosition());
            selector = this.message.slice(startPosition.offset, this.offset());
          } else {
            break;
          }
        }
        if (parsedSelectors.has(selector)) {
          return this.error(parentArgType === "select" ? ErrorKind.DUPLICATE_SELECT_ARGUMENT_SELECTOR : ErrorKind.DUPLICATE_PLURAL_ARGUMENT_SELECTOR, selectorLocation);
        }
        if (selector === "other") {
          hasOtherClause = true;
        }
        this.bumpSpace();
        const openingBracePosition = this.clonePosition();
        if (!this.bumpIf("{")) {
          return this.error(parentArgType === "select" ? ErrorKind.EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT : ErrorKind.EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT, createLocation(this.clonePosition(), this.clonePosition()));
        }
        const fragmentResult = this.parseMessage(nestingLevel + 1, parentArgType, expectCloseTag);
        if (fragmentResult.err) {
          return fragmentResult;
        }
        const argCloseResult = this.tryParseArgumentClose(openingBracePosition);
        if (argCloseResult.err) {
          return argCloseResult;
        }
        options.push([selector, {
          value: fragmentResult.val,
          location: createLocation(openingBracePosition, this.clonePosition())
        }]);
        parsedSelectors.add(selector);
        this.bumpSpace();
        ({ value: selector, location: selectorLocation } = this.parseIdentifierIfPossible());
      }
      if (options.length === 0) {
        return this.error(parentArgType === "select" ? ErrorKind.EXPECT_SELECT_ARGUMENT_SELECTOR : ErrorKind.EXPECT_PLURAL_ARGUMENT_SELECTOR, createLocation(this.clonePosition(), this.clonePosition()));
      }
      if (this.requiresOtherClause && !hasOtherClause) {
        return this.error(ErrorKind.MISSING_OTHER_CLAUSE, createLocation(this.clonePosition(), this.clonePosition()));
      }
      return {
        val: options,
        err: null
      };
    }
    tryParseDecimalInteger(expectNumberError, invalidNumberError) {
      let sign = 1;
      const startingPosition = this.clonePosition();
      if (this.bumpIf("+")) {
      } else if (this.bumpIf("-")) {
        sign = -1;
      }
      let hasDigits = false;
      let decimal = 0;
      while (!this.isEOF()) {
        const ch = this.char();
        if (ch >= 48 && ch <= 57) {
          hasDigits = true;
          decimal = decimal * 10 + (ch - 48);
          this.bump();
        } else {
          break;
        }
      }
      const location = createLocation(startingPosition, this.clonePosition());
      if (!hasDigits) {
        return this.error(expectNumberError, location);
      }
      decimal *= sign;
      if (!Number.isSafeInteger(decimal)) {
        return this.error(invalidNumberError, location);
      }
      return {
        val: decimal,
        err: null
      };
    }
    offset() {
      return this.position.offset;
    }
    isEOF() {
      return this.offset() === this.message.length;
    }
    clonePosition() {
      return {
        offset: this.position.offset,
        line: this.position.line,
        column: this.position.column
      };
    }
    /**
    * Return the code point at the current position of the parser.
    * Throws if the index is out of bound.
    */
    char() {
      const offset = this.position.offset;
      if (offset >= this.message.length) {
        throw Error("out of bound");
      }
      const code = this.message.codePointAt(offset);
      if (code === void 0) {
        throw Error(`Offset ${offset} is at invalid UTF-16 code unit boundary`);
      }
      return code;
    }
    error(kind, location) {
      return {
        val: null,
        err: {
          kind,
          message: this.message,
          location
        }
      };
    }
    /** Bump the parser to the next UTF-16 code unit. */
    bump() {
      if (this.isEOF()) {
        return;
      }
      const code = this.char();
      if (code === 10) {
        this.position.line += 1;
        this.position.column = 1;
        this.position.offset += 1;
      } else {
        this.position.column += 1;
        this.position.offset += code < 65536 ? 1 : 2;
      }
    }
    /**
    * If the substring starting at the current position of the parser has
    * the given prefix, then bump the parser to the character immediately
    * following the prefix and return true. Otherwise, don't bump the parser
    * and return false.
    */
    bumpIf(prefix) {
      if (this.message.startsWith(prefix, this.offset())) {
        for (let i = 0; i < prefix.length; i++) {
          this.bump();
        }
        return true;
      }
      return false;
    }
    /**
    * Bump the parser until the pattern character is found and return `true`.
    * Otherwise bump to the end of the file and return `false`.
    */
    bumpUntil(pattern) {
      const currentOffset = this.offset();
      const index = this.message.indexOf(pattern, currentOffset);
      if (index >= 0) {
        this.bumpTo(index);
        return true;
      } else {
        this.bumpTo(this.message.length);
        return false;
      }
    }
    /**
    * Bump the parser to the target offset.
    * If target offset is beyond the end of the input, bump the parser to the end of the input.
    */
    bumpTo(targetOffset) {
      if (this.offset() > targetOffset) {
        throw Error(`targetOffset ${targetOffset} must be greater than or equal to the current offset ${this.offset()}`);
      }
      targetOffset = Math.min(targetOffset, this.message.length);
      while (true) {
        const offset = this.offset();
        if (offset === targetOffset) {
          break;
        }
        if (offset > targetOffset) {
          throw Error(`targetOffset ${targetOffset} is at invalid UTF-16 code unit boundary`);
        }
        this.bump();
        if (this.isEOF()) {
          break;
        }
      }
    }
    /** advance the parser through all whitespace to the next non-whitespace code unit. */
    bumpSpace() {
      while (!this.isEOF() && _isWhiteSpace(this.char())) {
        this.bump();
      }
    }
    /**
    * Peek at the *next* Unicode codepoint in the input without advancing the parser.
    * If the input has been exhausted, then this returns null.
    */
    peek() {
      if (this.isEOF()) {
        return null;
      }
      const code = this.char();
      const offset = this.offset();
      const nextCode = this.message.charCodeAt(offset + (code >= 65536 ? 2 : 1));
      return nextCode ?? null;
    }
  };
  function _isAlpha(codepoint) {
    return codepoint >= 97 && codepoint <= 122 || codepoint >= 65 && codepoint <= 90;
  }
  function _isAlphaOrSlash(codepoint) {
    return _isAlpha(codepoint) || codepoint === 47;
  }
  function _isPotentialElementNameChar(c) {
    return c === 45 || c === 46 || c >= 48 && c <= 57 || c === 95 || c >= 97 && c <= 122 || c >= 65 && c <= 90 || c == 183 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 893 || c >= 895 && c <= 8191 || c >= 8204 && c <= 8205 || c >= 8255 && c <= 8256 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
  }
  function _isWhiteSpace(c) {
    return c >= 9 && c <= 13 || c === 32 || c === 133 || c >= 8206 && c <= 8207 || c === 8232 || c === 8233;
  }

  // node_modules/.aspect_rules_js/@formatjs+icu-messageformat-parser@0.0.0/node_modules/@formatjs/icu-messageformat-parser/index.js
  function pruneLocation(els) {
    els.forEach((el) => {
      delete el.location;
      if (isSelectElement(el) || isPluralElement(el)) {
        for (const k in el.options) {
          delete el.options[k].location;
          pruneLocation(el.options[k].value);
        }
      } else if (isNumberElement(el) && isNumberSkeleton(el.style)) {
        delete el.style.location;
      } else if ((isDateElement(el) || isTimeElement(el)) && isDateTimeSkeleton(el.style)) {
        delete el.style.location;
      } else if (isTagElement(el)) {
        pruneLocation(el.children);
      }
    });
  }
  function parse(message, opts = {}) {
    opts = {
      shouldParseSkeletons: true,
      requiresOtherClause: true,
      ...opts
    };
    const result = new Parser(message, opts).parse();
    if (result.err) {
      const error = SyntaxError(ErrorKind[result.err.kind]);
      error.location = result.err.location;
      error.originalMessage = result.err.message;
      throw error;
    }
    if (!opts?.captureLocation) {
      pruneLocation(result.val);
    }
    return result.val;
  }

  // node_modules/.aspect_rules_js/@formatjs+bigdecimal@0.0.0/node_modules/@formatjs/bigdecimal/index.js
  var DIV_PRECISION = 40;
  var SpecialValue = function(SpecialValue2) {
    SpecialValue2[SpecialValue2["NONE"] = 0] = "NONE";
    SpecialValue2[SpecialValue2["NAN"] = 1] = "NAN";
    SpecialValue2[SpecialValue2["POSITIVE_INFINITY"] = 2] = "POSITIVE_INFINITY";
    SpecialValue2[SpecialValue2["NEGATIVE_INFINITY"] = 3] = "NEGATIVE_INFINITY";
    return SpecialValue2;
  }(SpecialValue || {});
  function removeTrailingZeros(mantissa, exponent) {
    if (mantissa === 0n)
      return [0n, 0];
    while (mantissa % 10n === 0n) {
      mantissa /= 10n;
      exponent++;
    }
    return [mantissa, exponent];
  }
  function bigintAbs(n) {
    return n < 0n ? -n : n;
  }
  function digitCount(n) {
    if (n === 0n)
      return 1;
    if (n < 0n)
      n = -n;
    let count = 0;
    const big15 = 1000000000000000n;
    while (n >= big15) {
      n /= big15;
      count += 15;
    }
    let r = Number(n);
    while (r >= 1) {
      r /= 10;
      count++;
    }
    return count;
  }
  var TEN_BIGINT = 10n;
  function bigintPow10(n) {
    if (n <= 0)
      return 1n;
    let result = 1n;
    let base = TEN_BIGINT;
    let exp = n;
    while (exp > 0) {
      if (exp & 1)
        result *= base;
      base *= base;
      exp >>= 1;
    }
    return result;
  }
  function parseDecimalString(s) {
    s = s.trim();
    if (s === "NaN") {
      return {
        mantissa: 0n,
        exponent: 0,
        special: SpecialValue.NAN,
        negativeZero: false
      };
    }
    if (s === "Infinity" || s === "+Infinity") {
      return {
        mantissa: 0n,
        exponent: 0,
        special: SpecialValue.POSITIVE_INFINITY,
        negativeZero: false
      };
    }
    if (s === "-Infinity") {
      return {
        mantissa: 0n,
        exponent: 0,
        special: SpecialValue.NEGATIVE_INFINITY,
        negativeZero: false
      };
    }
    let negative = false;
    let idx = 0;
    if (s[idx] === "-") {
      negative = true;
      idx++;
    } else if (s[idx] === "+") {
      idx++;
    }
    let eIdx = s.indexOf("e", idx);
    if (eIdx === -1)
      eIdx = s.indexOf("E", idx);
    let sciExp = 0;
    let numPart;
    if (eIdx !== -1) {
      sciExp = parseInt(s.substring(eIdx + 1), 10);
      numPart = s.substring(idx, eIdx);
    } else {
      numPart = s.substring(idx);
    }
    const dotIdx = numPart.indexOf(".");
    let intPart;
    let fracPart;
    if (dotIdx !== -1) {
      intPart = numPart.substring(0, dotIdx);
      fracPart = numPart.substring(dotIdx + 1);
    } else {
      intPart = numPart;
      fracPart = "";
    }
    const combined = intPart + fracPart;
    const exponent = sciExp - fracPart.length;
    if (combined === "" || combined === "0" || /^0+$/.test(combined)) {
      return {
        mantissa: 0n,
        exponent: 0,
        special: SpecialValue.NONE,
        negativeZero: negative
      };
    }
    let mantissa = BigInt(combined);
    if (negative)
      mantissa = -mantissa;
    const [normMantissa, normExponent] = removeTrailingZeros(mantissa, exponent);
    return {
      mantissa: normMantissa,
      exponent: normExponent,
      special: SpecialValue.NONE,
      negativeZero: false
    };
  }
  var BigDecimal = class _BigDecimal {
    constructor(value) {
      __publicField(this, "_mantissa");
      __publicField(this, "_exponent");
      __publicField(this, "_special");
      __publicField(this, "_negativeZero");
      if (typeof value === "bigint") {
        const [m, e] = removeTrailingZeros(value, 0);
        this._mantissa = m;
        this._exponent = e;
        this._special = SpecialValue.NONE;
        this._negativeZero = false;
        return;
      }
      if (typeof value === "number") {
        if (Number.isNaN(value)) {
          this._mantissa = 0n;
          this._exponent = 0;
          this._special = SpecialValue.NAN;
          this._negativeZero = false;
          return;
        }
        if (value === Infinity) {
          this._mantissa = 0n;
          this._exponent = 0;
          this._special = SpecialValue.POSITIVE_INFINITY;
          this._negativeZero = false;
          return;
        }
        if (value === -Infinity) {
          this._mantissa = 0n;
          this._exponent = 0;
          this._special = SpecialValue.NEGATIVE_INFINITY;
          this._negativeZero = false;
          return;
        }
        if (value === 0) {
          this._mantissa = 0n;
          this._exponent = 0;
          this._special = SpecialValue.NONE;
          this._negativeZero = Object.is(value, -0);
          return;
        }
        value = String(value);
      }
      const parsed = parseDecimalString(value);
      this._mantissa = parsed.mantissa;
      this._exponent = parsed.exponent;
      this._special = parsed.special;
      this._negativeZero = parsed.negativeZero;
    }
    // Private constructor for internal use
    static _create(mantissa, exponent, special, negativeZero) {
      const bd = Object.create(_BigDecimal.prototype);
      bd._mantissa = mantissa;
      bd._exponent = exponent;
      bd._special = special;
      bd._negativeZero = negativeZero;
      return bd;
    }
    // Auto-coerce to BigDecimal for decimal.js compat
    static _coerce(v) {
      return v instanceof _BigDecimal ? v : new _BigDecimal(v);
    }
    // --- Arithmetic ---
    times(y) {
      const other = _BigDecimal._coerce(y);
      if (this._special || other._special) {
        return this._specialArith(other, "times");
      }
      if (this._mantissa === 0n || other._mantissa === 0n) {
        const negZero = this._isSignNegative() ? !other._isSignNegative() : other._isSignNegative();
        return _BigDecimal._create(0n, 0, SpecialValue.NONE, negZero);
      }
      const m = this._mantissa * other._mantissa;
      const e = this._exponent + other._exponent;
      const [nm, ne] = removeTrailingZeros(m, e);
      return _BigDecimal._create(nm, ne, SpecialValue.NONE, false);
    }
    div(y) {
      const other = _BigDecimal._coerce(y);
      if (this._special || other._special) {
        return this._specialArith(other, "div");
      }
      if (other._mantissa === 0n) {
        if (this._mantissa === 0n) {
          return _BigDecimal._create(0n, 0, SpecialValue.NAN, false);
        }
        const neg = this._isSignNegative() !== other._isSignNegative();
        return _BigDecimal._create(0n, 0, neg ? SpecialValue.NEGATIVE_INFINITY : SpecialValue.POSITIVE_INFINITY, false);
      }
      if (this._mantissa === 0n) {
        const negZero = this._isSignNegative() !== other._isSignNegative();
        return _BigDecimal._create(0n, 0, SpecialValue.NONE, negZero);
      }
      const scaledNumerator = this._mantissa * bigintPow10(DIV_PRECISION);
      const quotient = scaledNumerator / other._mantissa;
      const newExponent = this._exponent - other._exponent - DIV_PRECISION;
      const [nm, ne] = removeTrailingZeros(quotient, newExponent);
      return _BigDecimal._create(nm, ne, SpecialValue.NONE, false);
    }
    plus(y) {
      const other = _BigDecimal._coerce(y);
      if (this._special || other._special) {
        return this._specialArith(other, "plus");
      }
      if (this._mantissa === 0n && other._mantissa === 0n) {
        const negZero = this._negativeZero && other._negativeZero;
        return _BigDecimal._create(0n, 0, SpecialValue.NONE, negZero);
      }
      if (this._mantissa === 0n)
        return other;
      if (other._mantissa === 0n)
        return this;
      let m1 = this._mantissa;
      let m2 = other._mantissa;
      const e1 = this._exponent;
      const e2 = other._exponent;
      const minE = Math.min(e1, e2);
      if (e1 > minE)
        m1 *= bigintPow10(e1 - minE);
      if (e2 > minE)
        m2 *= bigintPow10(e2 - minE);
      const sum = m1 + m2;
      if (sum === 0n) {
        return _BigDecimal._create(0n, 0, SpecialValue.NONE, false);
      }
      const [nm, ne] = removeTrailingZeros(sum, minE);
      return _BigDecimal._create(nm, ne, SpecialValue.NONE, false);
    }
    minus(y) {
      return this.plus(_BigDecimal._coerce(y).negated());
    }
    mod(y) {
      const other = _BigDecimal._coerce(y);
      if (this._special || other._special) {
        if (this._special === SpecialValue.NAN || other._special === SpecialValue.NAN) {
          return _BigDecimal._create(0n, 0, SpecialValue.NAN, false);
        }
        if (this._special === SpecialValue.POSITIVE_INFINITY || this._special === SpecialValue.NEGATIVE_INFINITY) {
          return _BigDecimal._create(0n, 0, SpecialValue.NAN, false);
        }
        if (other._special === SpecialValue.POSITIVE_INFINITY || other._special === SpecialValue.NEGATIVE_INFINITY) {
          return this;
        }
      }
      if (other._mantissa === 0n) {
        return _BigDecimal._create(0n, 0, SpecialValue.NAN, false);
      }
      if (this._mantissa === 0n) {
        return this;
      }
      let m1 = this._mantissa;
      let m2 = other._mantissa;
      const e1 = this._exponent;
      const e2 = other._exponent;
      const minE = Math.min(e1, e2);
      if (e1 > minE)
        m1 *= bigintPow10(e1 - minE);
      if (e2 > minE)
        m2 *= bigintPow10(e2 - minE);
      const remainder = m1 % m2;
      if (remainder === 0n) {
        return _BigDecimal._create(0n, 0, SpecialValue.NONE, false);
      }
      const [nm, ne] = removeTrailingZeros(remainder, minE);
      return _BigDecimal._create(nm, ne, SpecialValue.NONE, false);
    }
    abs() {
      if (this._special === SpecialValue.NAN)
        return this;
      if (this._special === SpecialValue.NEGATIVE_INFINITY) {
        return _BigDecimal._create(0n, 0, SpecialValue.POSITIVE_INFINITY, false);
      }
      return _BigDecimal._create(bigintAbs(this._mantissa), this._exponent, this._special, false);
    }
    negated() {
      if (this._special === SpecialValue.NAN)
        return this;
      if (this._special === SpecialValue.POSITIVE_INFINITY) {
        return _BigDecimal._create(0n, 0, SpecialValue.NEGATIVE_INFINITY, false);
      }
      if (this._special === SpecialValue.NEGATIVE_INFINITY) {
        return _BigDecimal._create(0n, 0, SpecialValue.POSITIVE_INFINITY, false);
      }
      if (this._mantissa === 0n) {
        return _BigDecimal._create(0n, 0, SpecialValue.NONE, !this._negativeZero);
      }
      return _BigDecimal._create(-this._mantissa, this._exponent, SpecialValue.NONE, false);
    }
    pow(n) {
      if (this._special === SpecialValue.NAN)
        return this;
      if (n === 0)
        return new _BigDecimal(1);
      if (n < 0) {
        return new _BigDecimal(1).div(this.pow(-n));
      }
      if (this._special === SpecialValue.POSITIVE_INFINITY)
        return this;
      if (this._special === SpecialValue.NEGATIVE_INFINITY) {
        return n % 2 === 0 ? _BigDecimal._create(0n, 0, SpecialValue.POSITIVE_INFINITY, false) : this;
      }
      if (this._mantissa === 0n)
        return new _BigDecimal(0);
      const m = this._mantissa ** BigInt(n);
      const e = this._exponent * n;
      const [nm, ne] = removeTrailingZeros(m, e);
      return _BigDecimal._create(nm, ne, SpecialValue.NONE, false);
    }
    floor() {
      if (this._special !== SpecialValue.NONE)
        return this;
      if (this._mantissa === 0n)
        return this;
      if (this._exponent >= 0)
        return this;
      const divisor = bigintPow10(-this._exponent);
      const m = this._mantissa;
      let q = m / divisor;
      if (m < 0n && m % divisor !== 0n) {
        q -= 1n;
      }
      if (q === 0n) {
        const negZero = this._mantissa < 0n;
        return _BigDecimal._create(0n, 0, SpecialValue.NONE, negZero);
      }
      const [nm, ne] = removeTrailingZeros(q, 0);
      return _BigDecimal._create(nm, ne, SpecialValue.NONE, false);
    }
    ceil() {
      if (this._special !== SpecialValue.NONE)
        return this;
      if (this._mantissa === 0n)
        return this;
      if (this._exponent >= 0)
        return this;
      const divisor = bigintPow10(-this._exponent);
      const m = this._mantissa;
      let q = m / divisor;
      if (m > 0n && m % divisor !== 0n) {
        q += 1n;
      }
      if (q === 0n) {
        return _BigDecimal._create(0n, 0, SpecialValue.NONE, false);
      }
      const [nm, ne] = removeTrailingZeros(q, 0);
      return _BigDecimal._create(nm, ne, SpecialValue.NONE, false);
    }
    log(base) {
      if (this._special === SpecialValue.NAN)
        return this;
      if (this._special === SpecialValue.NEGATIVE_INFINITY) {
        return _BigDecimal._create(0n, 0, SpecialValue.NAN, false);
      }
      if (this._special === SpecialValue.POSITIVE_INFINITY) {
        return _BigDecimal._create(0n, 0, SpecialValue.POSITIVE_INFINITY, false);
      }
      if (this._mantissa < 0n) {
        return _BigDecimal._create(0n, 0, SpecialValue.NAN, false);
      }
      if (this._mantissa === 0n) {
        return _BigDecimal._create(0n, 0, SpecialValue.NEGATIVE_INFINITY, false);
      }
      if (base === 10) {
        return this._log10();
      }
      const log10x = this._log10();
      const log10b = new _BigDecimal(Math.log10(base));
      return log10x.div(log10b);
    }
    _log10() {
      const absMantissa = bigintAbs(this._mantissa);
      const digits = digitCount(absMantissa);
      let log10Mantissa;
      if (digits <= 15) {
        log10Mantissa = Math.log10(Number(absMantissa));
      } else {
        const shift = digits - 17;
        const leading = absMantissa / bigintPow10(shift);
        log10Mantissa = Math.log10(Number(leading)) + shift;
      }
      const totalLog10 = log10Mantissa + this._exponent;
      return new _BigDecimal(totalLog10);
    }
    // --- Comparison ---
    eq(y) {
      const other = _BigDecimal._coerce(y);
      if (this._special === SpecialValue.NAN || other._special === SpecialValue.NAN)
        return false;
      if (this._special !== other._special)
        return false;
      if (this._special !== SpecialValue.NONE)
        return true;
      if (this._mantissa === 0n && other._mantissa === 0n)
        return true;
      return this._mantissa === other._mantissa && this._exponent === other._exponent;
    }
    _compareTo(other) {
      if (this._special === SpecialValue.NAN || other._special === SpecialValue.NAN) {
        return NaN;
      }
      if (this._special === SpecialValue.POSITIVE_INFINITY) {
        return other._special === SpecialValue.POSITIVE_INFINITY ? 0 : 1;
      }
      if (this._special === SpecialValue.NEGATIVE_INFINITY) {
        return other._special === SpecialValue.NEGATIVE_INFINITY ? 0 : -1;
      }
      if (other._special === SpecialValue.POSITIVE_INFINITY)
        return -1;
      if (other._special === SpecialValue.NEGATIVE_INFINITY)
        return 1;
      const thisZero = this._mantissa === 0n;
      const otherZero = other._mantissa === 0n;
      if (thisZero && otherZero)
        return 0;
      if (thisZero)
        return other._mantissa > 0n ? -1 : 1;
      if (otherZero)
        return this._mantissa > 0n ? 1 : -1;
      const thisNeg = this._mantissa < 0n;
      const otherNeg = other._mantissa < 0n;
      if (thisNeg !== otherNeg)
        return thisNeg ? -1 : 1;
      let m1 = this._mantissa;
      let m2 = other._mantissa;
      const e1 = this._exponent;
      const e2 = other._exponent;
      const minE = Math.min(e1, e2);
      if (e1 > minE)
        m1 *= bigintPow10(e1 - minE);
      if (e2 > minE)
        m2 *= bigintPow10(e2 - minE);
      if (m1 < m2)
        return -1;
      if (m1 > m2)
        return 1;
      return 0;
    }
    lessThan(y) {
      const c = this._compareTo(_BigDecimal._coerce(y));
      return c === -1;
    }
    greaterThan(y) {
      const c = this._compareTo(_BigDecimal._coerce(y));
      return c === 1;
    }
    lessThanOrEqualTo(y) {
      const c = this._compareTo(_BigDecimal._coerce(y));
      return c === 0 || c === -1;
    }
    greaterThanOrEqualTo(y) {
      const c = this._compareTo(_BigDecimal._coerce(y));
      return c === 0 || c === 1;
    }
    // --- Queries ---
    isZero() {
      return this._special === SpecialValue.NONE && this._mantissa === 0n;
    }
    isNaN() {
      return this._special === SpecialValue.NAN;
    }
    isFinite() {
      return this._special === SpecialValue.NONE;
    }
    isNegative() {
      if (this._special === SpecialValue.NAN)
        return false;
      if (this._special === SpecialValue.NEGATIVE_INFINITY)
        return true;
      if (this._special === SpecialValue.POSITIVE_INFINITY)
        return false;
      if (this._mantissa === 0n)
        return this._negativeZero;
      return this._mantissa < 0n;
    }
    isPositive() {
      if (this._special === SpecialValue.NAN)
        return false;
      if (this._special === SpecialValue.POSITIVE_INFINITY)
        return true;
      if (this._special === SpecialValue.NEGATIVE_INFINITY)
        return false;
      if (this._mantissa === 0n)
        return !this._negativeZero;
      return this._mantissa > 0n;
    }
    isInteger() {
      if (this._special !== SpecialValue.NONE)
        return false;
      if (this._mantissa === 0n)
        return true;
      return this._exponent >= 0;
    }
    // --- Conversion ---
    toJSON() {
      return this.toString();
    }
    toNumber() {
      if (this._special === SpecialValue.NAN)
        return NaN;
      if (this._special === SpecialValue.POSITIVE_INFINITY)
        return Infinity;
      if (this._special === SpecialValue.NEGATIVE_INFINITY)
        return -Infinity;
      if (this._mantissa === 0n)
        return this._negativeZero ? -0 : 0;
      return Number(this.toString());
    }
    toString() {
      if (this._special === SpecialValue.NAN)
        return "NaN";
      if (this._special === SpecialValue.POSITIVE_INFINITY)
        return "Infinity";
      if (this._special === SpecialValue.NEGATIVE_INFINITY)
        return "-Infinity";
      if (this._mantissa === 0n)
        return "0";
      const negative = this._mantissa < 0n;
      const absStr = bigintAbs(this._mantissa).toString();
      const prefix = negative ? "-" : "";
      if (this._exponent === 0) {
        return prefix + absStr;
      }
      if (this._exponent > 0) {
        return prefix + absStr + "0".repeat(this._exponent);
      }
      const decimalPlaces = -this._exponent;
      if (decimalPlaces < absStr.length) {
        const intPart = absStr.slice(0, absStr.length - decimalPlaces);
        const fracPart = absStr.slice(absStr.length - decimalPlaces);
        return prefix + intPart + "." + fracPart;
      } else {
        const leadingZeros = decimalPlaces - absStr.length;
        return prefix + "0." + "0".repeat(leadingZeros) + absStr;
      }
    }
    // --- Static ---
    static pow(base, exp) {
      const n = typeof exp === "number" ? exp : exp.toNumber();
      if (typeof base === "number" && base === 10) {
        return _BigDecimal._create(1n, n, SpecialValue.NONE, false);
      }
      const bd = base instanceof _BigDecimal ? base : new _BigDecimal(base);
      return bd.pow(n);
    }
    static set(_config) {
    }
    // --- Internal helpers ---
    _isSignNegative() {
      if (this._special === SpecialValue.NEGATIVE_INFINITY)
        return true;
      if (this._mantissa < 0n)
        return true;
      if (this._mantissa === 0n)
        return this._negativeZero;
      return false;
    }
    _specialArith(other, op) {
      const a = this._special;
      const b = other._special;
      if (a === SpecialValue.NAN || b === SpecialValue.NAN) {
        return _BigDecimal._create(0n, 0, SpecialValue.NAN, false);
      }
      const aNeg = this._isSignNegative();
      const bNeg = other._isSignNegative();
      const aInf = a === SpecialValue.POSITIVE_INFINITY || a === SpecialValue.NEGATIVE_INFINITY;
      const bInf = b === SpecialValue.POSITIVE_INFINITY || b === SpecialValue.NEGATIVE_INFINITY;
      if (op === "times") {
        if (aInf || bInf) {
          if (aInf && other._mantissa === 0n && !bInf || bInf && this._mantissa === 0n && !aInf) {
            return _BigDecimal._create(0n, 0, SpecialValue.NAN, false);
          }
          const neg = aNeg !== bNeg;
          return _BigDecimal._create(0n, 0, neg ? SpecialValue.NEGATIVE_INFINITY : SpecialValue.POSITIVE_INFINITY, false);
        }
      }
      if (op === "div") {
        if (aInf && bInf) {
          return _BigDecimal._create(0n, 0, SpecialValue.NAN, false);
        }
        if (aInf) {
          const neg = aNeg !== bNeg;
          return _BigDecimal._create(0n, 0, neg ? SpecialValue.NEGATIVE_INFINITY : SpecialValue.POSITIVE_INFINITY, false);
        }
        if (bInf) {
          const negZero = aNeg !== bNeg;
          return _BigDecimal._create(0n, 0, SpecialValue.NONE, negZero);
        }
      }
      if (op === "plus") {
        if (aInf && bInf) {
          if (aNeg !== bNeg) {
            return _BigDecimal._create(0n, 0, SpecialValue.NAN, false);
          }
          return this;
        }
        if (aInf)
          return this;
        if (bInf)
          return other;
      }
      return _BigDecimal._create(0n, 0, SpecialValue.NAN, false);
    }
  };

  // node_modules/.aspect_rules_js/@formatjs+ecma402-abstract@0.0.0/node_modules/@formatjs/ecma402-abstract/constants.js
  var TEN = new BigDecimal(10);
  var ZERO = new BigDecimal(0);
  var NEGATIVE_ZERO = new BigDecimal(-0);

  // node_modules/.aspect_rules_js/@formatjs+fast-memoize@0.0.0/node_modules/@formatjs/fast-memoize/index.js
  function memoize(fn, options) {
    const cache = options && options.cache ? options.cache : cacheDefault;
    const serializer = options && options.serializer ? options.serializer : serializerDefault;
    const strategy = options && options.strategy ? options.strategy : strategyDefault;
    return strategy(fn, {
      cache,
      serializer
    });
  }
  function isPrimitive(value) {
    return value == null || typeof value === "number" || typeof value === "boolean";
  }
  function monadic(fn, cache, serializer, arg) {
    const cacheKey = isPrimitive(arg) ? arg : serializer(arg);
    let computedValue = cache.get(cacheKey);
    if (typeof computedValue === "undefined") {
      computedValue = fn.call(this, arg);
      cache.set(cacheKey, computedValue);
    }
    return computedValue;
  }
  function variadic(fn, cache, serializer) {
    const args = Array.prototype.slice.call(arguments, 3);
    const cacheKey = serializer(args);
    let computedValue = cache.get(cacheKey);
    if (typeof computedValue === "undefined") {
      computedValue = fn.apply(this, args);
      cache.set(cacheKey, computedValue);
    }
    return computedValue;
  }
  function assemble(fn, context, strategy, cache, serialize) {
    return strategy.bind(context, fn, cache, serialize);
  }
  function strategyDefault(fn, options) {
    const strategy = fn.length === 1 ? monadic : variadic;
    return assemble(fn, this, strategy, options.cache.create(), options.serializer);
  }
  function strategyVariadic(fn, options) {
    return assemble(fn, this, variadic, options.cache.create(), options.serializer);
  }
  function strategyMonadic(fn, options) {
    return assemble(fn, this, monadic, options.cache.create(), options.serializer);
  }
  var serializerDefault = function() {
    return JSON.stringify(arguments);
  };
  var ObjectWithoutPrototypeCache = class {
    constructor() {
      __publicField(this, "cache");
      this.cache = /* @__PURE__ */ Object.create(null);
    }
    get(key) {
      return this.cache[key];
    }
    set(key, value) {
      this.cache[key] = value;
    }
  };
  var cacheDefault = { create: function create() {
    return new ObjectWithoutPrototypeCache();
  } };
  var strategies = {
    variadic: strategyVariadic,
    monadic: strategyMonadic
  };

  // node_modules/.aspect_rules_js/@formatjs+ecma402-abstract@0.0.0/node_modules/@formatjs/ecma402-abstract/utils.js
  var createMemoizedNumberFormat = memoize((...args) => new Intl.NumberFormat(...args), { strategy: strategies.variadic });
  var createMemoizedPluralRules = memoize((...args) => new Intl.PluralRules(...args), { strategy: strategies.variadic });
  var createMemoizedLocale = memoize((...args) => new Intl.Locale(...args), { strategy: strategies.variadic });
  var createMemoizedListFormat = memoize((...args) => new Intl.ListFormat(...args), { strategy: strategies.variadic });

  // node_modules/.aspect_rules_js/@formatjs+ecma402-abstract@0.0.0/node_modules/@formatjs/ecma402-abstract/262.js
  var MINUTES_PER_HOUR = 60;
  var SECONDS_PER_MINUTE = 60;
  var MS_PER_SECOND = 1e3;
  var MS_PER_MINUTE = MS_PER_SECOND * SECONDS_PER_MINUTE;
  var MS_PER_HOUR = MS_PER_MINUTE * MINUTES_PER_HOUR;

  // node_modules/.aspect_rules_js/@formatjs+ecma402-abstract@0.0.0/node_modules/@formatjs/ecma402-abstract/IsSanctionedSimpleUnitIdentifier.js
  var SANCTIONED_UNITS = [
    "angle-degree",
    "area-acre",
    "area-hectare",
    "concentr-percent",
    "digital-bit",
    "digital-byte",
    "digital-gigabit",
    "digital-gigabyte",
    "digital-kilobit",
    "digital-kilobyte",
    "digital-megabit",
    "digital-megabyte",
    "digital-petabyte",
    "digital-terabit",
    "digital-terabyte",
    "duration-day",
    "duration-hour",
    "duration-millisecond",
    "duration-minute",
    "duration-month",
    "duration-second",
    "duration-week",
    "duration-year",
    "length-centimeter",
    "length-foot",
    "length-inch",
    "length-kilometer",
    "length-meter",
    "length-mile-scandinavian",
    "length-mile",
    "length-millimeter",
    "length-yard",
    "mass-gram",
    "mass-kilogram",
    "mass-ounce",
    "mass-pound",
    "mass-stone",
    "temperature-celsius",
    "temperature-fahrenheit",
    "volume-fluid-ounce",
    "volume-gallon",
    "volume-liter",
    "volume-milliliter"
  ];
  function removeUnitNamespace(unit) {
    return unit.slice(unit.indexOf("-") + 1);
  }
  var SIMPLE_UNITS = SANCTIONED_UNITS.map(removeUnitNamespace);

  // node_modules/.aspect_rules_js/@formatjs+ecma402-abstract@0.0.0/node_modules/@formatjs/ecma402-abstract/NumberFormat/decimal-cache.js
  var getPowerOf10 = memoize((exponent) => {
    return BigDecimal.pow(10, exponent);
  });

  // node_modules/.aspect_rules_js/@formatjs+ecma402-abstract@0.0.0/node_modules/@formatjs/ecma402-abstract/regex.generated.js
  var S_UNICODE_REGEX = /[\$\+<->\^`\|~\xA2-\xA6\xA8\xA9\xAC\xAE-\xB1\xB4\xB8\xD7\xF7\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u02FF\u0375\u0384\u0385\u03F6\u0482\u058D-\u058F\u0606-\u0608\u060B\u060E\u060F\u06DE\u06E9\u06FD\u06FE\u07F6\u07FE\u07FF\u0888\u09F2\u09F3\u09FA\u09FB\u0AF1\u0B70\u0BF3-\u0BFA\u0C7F\u0D4F\u0D79\u0E3F\u0F01-\u0F03\u0F13\u0F15-\u0F17\u0F1A-\u0F1F\u0F34\u0F36\u0F38\u0FBE-\u0FC5\u0FC7-\u0FCC\u0FCE\u0FCF\u0FD5-\u0FD8\u109E\u109F\u1390-\u1399\u166D\u17DB\u1940\u19DE-\u19FF\u1B61-\u1B6A\u1B74-\u1B7C\u1FBD\u1FBF-\u1FC1\u1FCD-\u1FCF\u1FDD-\u1FDF\u1FED-\u1FEF\u1FFD\u1FFE\u2044\u2052\u207A-\u207C\u208A-\u208C\u20A0-\u20C1\u2100\u2101\u2103-\u2106\u2108\u2109\u2114\u2116-\u2118\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u2140-\u2144\u214A-\u214D\u214F\u218A\u218B\u2190-\u2307\u230C-\u2328\u232B-\u2429\u2440-\u244A\u249C-\u24E9\u2500-\u2767\u2794-\u27C4\u27C7-\u27E5\u27F0-\u2982\u2999-\u29D7\u29DC-\u29FB\u29FE-\u2B73\u2B76-\u2BFF\u2CE5-\u2CEA\u2E50\u2E51\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFF\u3004\u3012\u3013\u3020\u3036\u3037\u303E\u303F\u309B\u309C\u3190\u3191\u3196-\u319F\u31C0-\u31E5\u31EF\u3200-\u321E\u322A-\u3247\u3250\u3260-\u327F\u328A-\u32B0\u32C0-\u33FF\u4DC0-\u4DFF\uA490-\uA4C6\uA700-\uA716\uA720\uA721\uA789\uA78A\uA828-\uA82B\uA836-\uA839\uAA77-\uAA79\uAB5B\uAB6A\uAB6B\uFB29\uFBB2-\uFBD2\uFD40-\uFD4F\uFD90\uFD91\uFDC8-\uFDCF\uFDFC-\uFDFF\uFE62\uFE64-\uFE66\uFE69\uFF04\uFF0B\uFF1C-\uFF1E\uFF3E\uFF40\uFF5C\uFF5E\uFFE0-\uFFE6\uFFE8-\uFFEE\uFFFC\uFFFD]|\uD800[\uDD37-\uDD3F\uDD79-\uDD89\uDD8C-\uDD8E\uDD90-\uDD9C\uDDA0\uDDD0-\uDDFC]|\uD802[\uDC77\uDC78\uDEC8]|\uD803[\uDD8E\uDD8F\uDED1-\uDED8]|\uD805\uDF3F|\uD807[\uDFD5-\uDFF1]|\uD81A[\uDF3C-\uDF3F\uDF45]|\uD82F\uDC9C|\uD833[\uDC00-\uDCEF\uDCFA-\uDCFC\uDD00-\uDEB3\uDEBA-\uDED0\uDEE0-\uDEF0\uDF50-\uDFC3]|\uD834[\uDC00-\uDCF5\uDD00-\uDD26\uDD29-\uDD64\uDD6A-\uDD6C\uDD83\uDD84\uDD8C-\uDDA9\uDDAE-\uDDEA\uDE00-\uDE41\uDE45\uDF00-\uDF56]|\uD835[\uDEC1\uDEDB\uDEFB\uDF15\uDF35\uDF4F\uDF6F\uDF89\uDFA9\uDFC3]|\uD836[\uDC00-\uDDFF\uDE37-\uDE3A\uDE6D-\uDE74\uDE76-\uDE83\uDE85\uDE86]|\uD838[\uDD4F\uDEFF]|\uD83B[\uDCAC\uDCB0\uDD2E\uDEF0\uDEF1]|\uD83C[\uDC00-\uDC2B\uDC30-\uDC93\uDCA0-\uDCAE\uDCB1-\uDCBF\uDCC1-\uDCCF\uDCD1-\uDCF5\uDD0D-\uDDAD\uDDE6-\uDE02\uDE10-\uDE3B\uDE40-\uDE48\uDE50\uDE51\uDE60-\uDE65\uDF00-\uDFFF]|\uD83D[\uDC00-\uDED8\uDEDC-\uDEEC\uDEF0-\uDEFC\uDF00-\uDFD9\uDFE0-\uDFEB\uDFF0]|\uD83E[\uDC00-\uDC0B\uDC10-\uDC47\uDC50-\uDC59\uDC60-\uDC87\uDC90-\uDCAD\uDCB0-\uDCBB\uDCC0\uDCC1\uDCD0-\uDCD8\uDD00-\uDE57\uDE60-\uDE6D\uDE70-\uDE7C\uDE80-\uDE8A\uDE8E-\uDEC6\uDEC8\uDECD-\uDEDC\uDEDF-\uDEEA\uDEEF-\uDEF8\uDF00-\uDF92\uDF94-\uDFEF\uDFFA]/;

  // node_modules/.aspect_rules_js/@formatjs+ecma402-abstract@0.0.0/node_modules/@formatjs/ecma402-abstract/NumberFormat/format_to_parts.js
  var CARET_S_UNICODE_REGEX = new RegExp(`^${S_UNICODE_REGEX.source}`);
  var S_DOLLAR_UNICODE_REGEX = new RegExp(`${S_UNICODE_REGEX.source}$`);

  // node_modules/.aspect_rules_js/@formatjs+intl-localematcher@0.0.0/node_modules/@formatjs/intl-localematcher/abstract/languageMatching.js
  var data = { supplemental: { languageMatching: { "written-new": [
    { paradigmLocales: { _locales: "en en_GB es es_419 pt_BR pt_PT" } },
    { $enUS: { _value: "AS+CA+GU+MH+MP+PH+PR+UM+US+VI" } },
    { $cnsar: { _value: "HK+MO" } },
    { $americas: { _value: "019" } },
    { $maghreb: { _value: "MA+DZ+TN+LY+MR+EH" } },
    { no: {
      _desired: "nb",
      _distance: "1"
    } },
    { bs: {
      _desired: "hr",
      _distance: "4"
    } },
    { bs: {
      _desired: "sh",
      _distance: "4"
    } },
    { hr: {
      _desired: "sh",
      _distance: "4"
    } },
    { sr: {
      _desired: "sh",
      _distance: "4"
    } },
    { aa: {
      _desired: "ssy",
      _distance: "4"
    } },
    { de: {
      _desired: "gsw",
      _distance: "4",
      _oneway: "true"
    } },
    { de: {
      _desired: "lb",
      _distance: "4",
      _oneway: "true"
    } },
    { no: {
      _desired: "da",
      _distance: "8"
    } },
    { nb: {
      _desired: "da",
      _distance: "8"
    } },
    { ru: {
      _desired: "ab",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "ach",
      _distance: "30",
      _oneway: "true"
    } },
    { nl: {
      _desired: "af",
      _distance: "20",
      _oneway: "true"
    } },
    { en: {
      _desired: "ak",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "am",
      _distance: "30",
      _oneway: "true"
    } },
    { es: {
      _desired: "ay",
      _distance: "20",
      _oneway: "true"
    } },
    { ru: {
      _desired: "az",
      _distance: "30",
      _oneway: "true"
    } },
    { ur: {
      _desired: "bal",
      _distance: "20",
      _oneway: "true"
    } },
    { ru: {
      _desired: "be",
      _distance: "20",
      _oneway: "true"
    } },
    { en: {
      _desired: "bem",
      _distance: "30",
      _oneway: "true"
    } },
    { hi: {
      _desired: "bh",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "bn",
      _distance: "30",
      _oneway: "true"
    } },
    { zh: {
      _desired: "bo",
      _distance: "20",
      _oneway: "true"
    } },
    { fr: {
      _desired: "br",
      _distance: "20",
      _oneway: "true"
    } },
    { es: {
      _desired: "ca",
      _distance: "20",
      _oneway: "true"
    } },
    { fil: {
      _desired: "ceb",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "chr",
      _distance: "20",
      _oneway: "true"
    } },
    { ar: {
      _desired: "ckb",
      _distance: "30",
      _oneway: "true"
    } },
    { fr: {
      _desired: "co",
      _distance: "20",
      _oneway: "true"
    } },
    { fr: {
      _desired: "crs",
      _distance: "20",
      _oneway: "true"
    } },
    { sk: {
      _desired: "cs",
      _distance: "20"
    } },
    { en: {
      _desired: "cy",
      _distance: "20",
      _oneway: "true"
    } },
    { en: {
      _desired: "ee",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "eo",
      _distance: "30",
      _oneway: "true"
    } },
    { es: {
      _desired: "eu",
      _distance: "20",
      _oneway: "true"
    } },
    { da: {
      _desired: "fo",
      _distance: "20",
      _oneway: "true"
    } },
    { nl: {
      _desired: "fy",
      _distance: "20",
      _oneway: "true"
    } },
    { en: {
      _desired: "ga",
      _distance: "20",
      _oneway: "true"
    } },
    { en: {
      _desired: "gaa",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "gd",
      _distance: "20",
      _oneway: "true"
    } },
    { es: {
      _desired: "gl",
      _distance: "20",
      _oneway: "true"
    } },
    { es: {
      _desired: "gn",
      _distance: "20",
      _oneway: "true"
    } },
    { hi: {
      _desired: "gu",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "ha",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "haw",
      _distance: "20",
      _oneway: "true"
    } },
    { fr: {
      _desired: "ht",
      _distance: "20",
      _oneway: "true"
    } },
    { ru: {
      _desired: "hy",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "ia",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "ig",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "is",
      _distance: "20",
      _oneway: "true"
    } },
    { id: {
      _desired: "jv",
      _distance: "20",
      _oneway: "true"
    } },
    { en: {
      _desired: "ka",
      _distance: "30",
      _oneway: "true"
    } },
    { fr: {
      _desired: "kg",
      _distance: "30",
      _oneway: "true"
    } },
    { ru: {
      _desired: "kk",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "km",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "kn",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "kri",
      _distance: "30",
      _oneway: "true"
    } },
    { tr: {
      _desired: "ku",
      _distance: "30",
      _oneway: "true"
    } },
    { ru: {
      _desired: "ky",
      _distance: "30",
      _oneway: "true"
    } },
    { it: {
      _desired: "la",
      _distance: "20",
      _oneway: "true"
    } },
    { en: {
      _desired: "lg",
      _distance: "30",
      _oneway: "true"
    } },
    { fr: {
      _desired: "ln",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "lo",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "loz",
      _distance: "30",
      _oneway: "true"
    } },
    { fr: {
      _desired: "lua",
      _distance: "30",
      _oneway: "true"
    } },
    { hi: {
      _desired: "mai",
      _distance: "20",
      _oneway: "true"
    } },
    { en: {
      _desired: "mfe",
      _distance: "30",
      _oneway: "true"
    } },
    { fr: {
      _desired: "mg",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "mi",
      _distance: "20",
      _oneway: "true"
    } },
    { en: {
      _desired: "ml",
      _distance: "30",
      _oneway: "true"
    } },
    { ru: {
      _desired: "mn",
      _distance: "30",
      _oneway: "true"
    } },
    { hi: {
      _desired: "mr",
      _distance: "30",
      _oneway: "true"
    } },
    { id: {
      _desired: "ms",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "mt",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "my",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "ne",
      _distance: "30",
      _oneway: "true"
    } },
    { nb: {
      _desired: "nn",
      _distance: "20"
    } },
    { no: {
      _desired: "nn",
      _distance: "20"
    } },
    { en: {
      _desired: "nso",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "ny",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "nyn",
      _distance: "30",
      _oneway: "true"
    } },
    { fr: {
      _desired: "oc",
      _distance: "20",
      _oneway: "true"
    } },
    { en: {
      _desired: "om",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "or",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "pa",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "pcm",
      _distance: "20",
      _oneway: "true"
    } },
    { en: {
      _desired: "ps",
      _distance: "30",
      _oneway: "true"
    } },
    { es: {
      _desired: "qu",
      _distance: "30",
      _oneway: "true"
    } },
    { de: {
      _desired: "rm",
      _distance: "20",
      _oneway: "true"
    } },
    { en: {
      _desired: "rn",
      _distance: "30",
      _oneway: "true"
    } },
    { fr: {
      _desired: "rw",
      _distance: "30",
      _oneway: "true"
    } },
    { hi: {
      _desired: "sa",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "sd",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "si",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "sn",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "so",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "sq",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "st",
      _distance: "30",
      _oneway: "true"
    } },
    { id: {
      _desired: "su",
      _distance: "20",
      _oneway: "true"
    } },
    { en: {
      _desired: "sw",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "ta",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "te",
      _distance: "30",
      _oneway: "true"
    } },
    { ru: {
      _desired: "tg",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "ti",
      _distance: "30",
      _oneway: "true"
    } },
    { ru: {
      _desired: "tk",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "tlh",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "tn",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "to",
      _distance: "30",
      _oneway: "true"
    } },
    { ru: {
      _desired: "tt",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "tum",
      _distance: "30",
      _oneway: "true"
    } },
    { zh: {
      _desired: "ug",
      _distance: "20",
      _oneway: "true"
    } },
    { ru: {
      _desired: "uk",
      _distance: "20",
      _oneway: "true"
    } },
    { en: {
      _desired: "ur",
      _distance: "30",
      _oneway: "true"
    } },
    { ru: {
      _desired: "uz",
      _distance: "30",
      _oneway: "true"
    } },
    { fr: {
      _desired: "wo",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "xh",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "yi",
      _distance: "30",
      _oneway: "true"
    } },
    { en: {
      _desired: "yo",
      _distance: "30",
      _oneway: "true"
    } },
    { zh: {
      _desired: "za",
      _distance: "20",
      _oneway: "true"
    } },
    { en: {
      _desired: "zu",
      _distance: "30",
      _oneway: "true"
    } },
    { ar: {
      _desired: "aao",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "abh",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "abv",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "acm",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "acq",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "acw",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "acx",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "acy",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "adf",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "aeb",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "aec",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "afb",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "ajp",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "apc",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "apd",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "arq",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "ars",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "ary",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "arz",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "auz",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "avl",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "ayh",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "ayl",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "ayn",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "ayp",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "bbz",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "pga",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "shu",
      _distance: "10",
      _oneway: "true"
    } },
    { ar: {
      _desired: "ssh",
      _distance: "10",
      _oneway: "true"
    } },
    { az: {
      _desired: "azb",
      _distance: "10",
      _oneway: "true"
    } },
    { et: {
      _desired: "vro",
      _distance: "10",
      _oneway: "true"
    } },
    { ff: {
      _desired: "ffm",
      _distance: "10",
      _oneway: "true"
    } },
    { ff: {
      _desired: "fub",
      _distance: "10",
      _oneway: "true"
    } },
    { ff: {
      _desired: "fue",
      _distance: "10",
      _oneway: "true"
    } },
    { ff: {
      _desired: "fuf",
      _distance: "10",
      _oneway: "true"
    } },
    { ff: {
      _desired: "fuh",
      _distance: "10",
      _oneway: "true"
    } },
    { ff: {
      _desired: "fui",
      _distance: "10",
      _oneway: "true"
    } },
    { ff: {
      _desired: "fuq",
      _distance: "10",
      _oneway: "true"
    } },
    { ff: {
      _desired: "fuv",
      _distance: "10",
      _oneway: "true"
    } },
    { gn: {
      _desired: "gnw",
      _distance: "10",
      _oneway: "true"
    } },
    { gn: {
      _desired: "gui",
      _distance: "10",
      _oneway: "true"
    } },
    { gn: {
      _desired: "gun",
      _distance: "10",
      _oneway: "true"
    } },
    { gn: {
      _desired: "nhd",
      _distance: "10",
      _oneway: "true"
    } },
    { iu: {
      _desired: "ikt",
      _distance: "10",
      _oneway: "true"
    } },
    { kln: {
      _desired: "enb",
      _distance: "10",
      _oneway: "true"
    } },
    { kln: {
      _desired: "eyo",
      _distance: "10",
      _oneway: "true"
    } },
    { kln: {
      _desired: "niq",
      _distance: "10",
      _oneway: "true"
    } },
    { kln: {
      _desired: "oki",
      _distance: "10",
      _oneway: "true"
    } },
    { kln: {
      _desired: "pko",
      _distance: "10",
      _oneway: "true"
    } },
    { kln: {
      _desired: "sgc",
      _distance: "10",
      _oneway: "true"
    } },
    { kln: {
      _desired: "tec",
      _distance: "10",
      _oneway: "true"
    } },
    { kln: {
      _desired: "tuy",
      _distance: "10",
      _oneway: "true"
    } },
    { kok: {
      _desired: "gom",
      _distance: "10",
      _oneway: "true"
    } },
    { kpe: {
      _desired: "gkp",
      _distance: "10",
      _oneway: "true"
    } },
    { luy: {
      _desired: "ida",
      _distance: "10",
      _oneway: "true"
    } },
    { luy: {
      _desired: "lkb",
      _distance: "10",
      _oneway: "true"
    } },
    { luy: {
      _desired: "lko",
      _distance: "10",
      _oneway: "true"
    } },
    { luy: {
      _desired: "lks",
      _distance: "10",
      _oneway: "true"
    } },
    { luy: {
      _desired: "lri",
      _distance: "10",
      _oneway: "true"
    } },
    { luy: {
      _desired: "lrm",
      _distance: "10",
      _oneway: "true"
    } },
    { luy: {
      _desired: "lsm",
      _distance: "10",
      _oneway: "true"
    } },
    { luy: {
      _desired: "lto",
      _distance: "10",
      _oneway: "true"
    } },
    { luy: {
      _desired: "lts",
      _distance: "10",
      _oneway: "true"
    } },
    { luy: {
      _desired: "lwg",
      _distance: "10",
      _oneway: "true"
    } },
    { luy: {
      _desired: "nle",
      _distance: "10",
      _oneway: "true"
    } },
    { luy: {
      _desired: "nyd",
      _distance: "10",
      _oneway: "true"
    } },
    { luy: {
      _desired: "rag",
      _distance: "10",
      _oneway: "true"
    } },
    { lv: {
      _desired: "ltg",
      _distance: "10",
      _oneway: "true"
    } },
    { mg: {
      _desired: "bhr",
      _distance: "10",
      _oneway: "true"
    } },
    { mg: {
      _desired: "bjq",
      _distance: "10",
      _oneway: "true"
    } },
    { mg: {
      _desired: "bmm",
      _distance: "10",
      _oneway: "true"
    } },
    { mg: {
      _desired: "bzc",
      _distance: "10",
      _oneway: "true"
    } },
    { mg: {
      _desired: "msh",
      _distance: "10",
      _oneway: "true"
    } },
    { mg: {
      _desired: "skg",
      _distance: "10",
      _oneway: "true"
    } },
    { mg: {
      _desired: "tdx",
      _distance: "10",
      _oneway: "true"
    } },
    { mg: {
      _desired: "tkg",
      _distance: "10",
      _oneway: "true"
    } },
    { mg: {
      _desired: "txy",
      _distance: "10",
      _oneway: "true"
    } },
    { mg: {
      _desired: "xmv",
      _distance: "10",
      _oneway: "true"
    } },
    { mg: {
      _desired: "xmw",
      _distance: "10",
      _oneway: "true"
    } },
    { mn: {
      _desired: "mvf",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "bjn",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "btj",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "bve",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "bvu",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "coa",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "dup",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "hji",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "id",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "jak",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "jax",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "kvb",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "kvr",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "kxd",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "lce",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "lcf",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "liw",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "max",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "meo",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "mfa",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "mfb",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "min",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "mqg",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "msi",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "mui",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "orn",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "ors",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "pel",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "pse",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "tmw",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "urk",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "vkk",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "vkt",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "xmm",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "zlm",
      _distance: "10",
      _oneway: "true"
    } },
    { ms: {
      _desired: "zmi",
      _distance: "10",
      _oneway: "true"
    } },
    { ne: {
      _desired: "dty",
      _distance: "10",
      _oneway: "true"
    } },
    { om: {
      _desired: "gax",
      _distance: "10",
      _oneway: "true"
    } },
    { om: {
      _desired: "hae",
      _distance: "10",
      _oneway: "true"
    } },
    { om: {
      _desired: "orc",
      _distance: "10",
      _oneway: "true"
    } },
    { or: {
      _desired: "spv",
      _distance: "10",
      _oneway: "true"
    } },
    { ps: {
      _desired: "pbt",
      _distance: "10",
      _oneway: "true"
    } },
    { ps: {
      _desired: "pst",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qub",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qud",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "quf",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qug",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "quh",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "quk",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qul",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qup",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qur",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qus",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "quw",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qux",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "quy",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qva",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qvc",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qve",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qvh",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qvi",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qvj",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qvl",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qvm",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qvn",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qvo",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qvp",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qvs",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qvw",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qvz",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qwa",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qwc",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qwh",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qws",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qxa",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qxc",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qxh",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qxl",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qxn",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qxo",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qxp",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qxr",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qxt",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qxu",
      _distance: "10",
      _oneway: "true"
    } },
    { qu: {
      _desired: "qxw",
      _distance: "10",
      _oneway: "true"
    } },
    { sc: {
      _desired: "sdc",
      _distance: "10",
      _oneway: "true"
    } },
    { sc: {
      _desired: "sdn",
      _distance: "10",
      _oneway: "true"
    } },
    { sc: {
      _desired: "sro",
      _distance: "10",
      _oneway: "true"
    } },
    { sq: {
      _desired: "aae",
      _distance: "10",
      _oneway: "true"
    } },
    { sq: {
      _desired: "aat",
      _distance: "10",
      _oneway: "true"
    } },
    { sq: {
      _desired: "aln",
      _distance: "10",
      _oneway: "true"
    } },
    { syr: {
      _desired: "aii",
      _distance: "10",
      _oneway: "true"
    } },
    { uz: {
      _desired: "uzs",
      _distance: "10",
      _oneway: "true"
    } },
    { yi: {
      _desired: "yih",
      _distance: "10",
      _oneway: "true"
    } },
    { zh: {
      _desired: "cdo",
      _distance: "10",
      _oneway: "true"
    } },
    { zh: {
      _desired: "cjy",
      _distance: "10",
      _oneway: "true"
    } },
    { zh: {
      _desired: "cpx",
      _distance: "10",
      _oneway: "true"
    } },
    { zh: {
      _desired: "czh",
      _distance: "10",
      _oneway: "true"
    } },
    { zh: {
      _desired: "czo",
      _distance: "10",
      _oneway: "true"
    } },
    { zh: {
      _desired: "gan",
      _distance: "10",
      _oneway: "true"
    } },
    { zh: {
      _desired: "hak",
      _distance: "10",
      _oneway: "true"
    } },
    { zh: {
      _desired: "hsn",
      _distance: "10",
      _oneway: "true"
    } },
    { zh: {
      _desired: "lzh",
      _distance: "10",
      _oneway: "true"
    } },
    { zh: {
      _desired: "mnp",
      _distance: "10",
      _oneway: "true"
    } },
    { zh: {
      _desired: "nan",
      _distance: "10",
      _oneway: "true"
    } },
    { zh: {
      _desired: "wuu",
      _distance: "10",
      _oneway: "true"
    } },
    { zh: {
      _desired: "yue",
      _distance: "10",
      _oneway: "true"
    } },
    { "*": {
      _desired: "*",
      _distance: "80"
    } },
    { "en-Latn": {
      _desired: "am-Ethi",
      _distance: "10",
      _oneway: "true"
    } },
    { "ru-Cyrl": {
      _desired: "az-Latn",
      _distance: "10",
      _oneway: "true"
    } },
    { "en-Latn": {
      _desired: "bn-Beng",
      _distance: "10",
      _oneway: "true"
    } },
    { "zh-Hans": {
      _desired: "bo-Tibt",
      _distance: "10",
      _oneway: "true"
    } },
    { "ru-Cyrl": {
      _desired: "hy-Armn",
      _distance: "10",
      _oneway: "true"
    } },
    { "en-Latn": {
      _desired: "ka-Geor",
      _distance: "10",
      _oneway: "true"
    } },
    { "en-Latn": {
      _desired: "km-Khmr",
      _distance: "10",
      _oneway: "true"
    } },
    { "en-Latn": {
      _desired: "kn-Knda",
      _distance: "10",
      _oneway: "true"
    } },
    { "en-Latn": {
      _desired: "lo-Laoo",
      _distance: "10",
      _oneway: "true"
    } },
    { "en-Latn": {
      _desired: "ml-Mlym",
      _distance: "10",
      _oneway: "true"
    } },
    { "en-Latn": {
      _desired: "my-Mymr",
      _distance: "10",
      _oneway: "true"
    } },
    { "en-Latn": {
      _desired: "ne-Deva",
      _distance: "10",
      _oneway: "true"
    } },
    { "en-Latn": {
      _desired: "or-Orya",
      _distance: "10",
      _oneway: "true"
    } },
    { "en-Latn": {
      _desired: "pa-Guru",
      _distance: "10",
      _oneway: "true"
    } },
    { "en-Latn": {
      _desired: "ps-Arab",
      _distance: "10",
      _oneway: "true"
    } },
    { "en-Latn": {
      _desired: "sd-Arab",
      _distance: "10",
      _oneway: "true"
    } },
    { "en-Latn": {
      _desired: "si-Sinh",
      _distance: "10",
      _oneway: "true"
    } },
    { "en-Latn": {
      _desired: "ta-Taml",
      _distance: "10",
      _oneway: "true"
    } },
    { "en-Latn": {
      _desired: "te-Telu",
      _distance: "10",
      _oneway: "true"
    } },
    { "en-Latn": {
      _desired: "ti-Ethi",
      _distance: "10",
      _oneway: "true"
    } },
    { "ru-Cyrl": {
      _desired: "tk-Latn",
      _distance: "10",
      _oneway: "true"
    } },
    { "en-Latn": {
      _desired: "ur-Arab",
      _distance: "10",
      _oneway: "true"
    } },
    { "ru-Cyrl": {
      _desired: "uz-Latn",
      _distance: "10",
      _oneway: "true"
    } },
    { "en-Latn": {
      _desired: "yi-Hebr",
      _distance: "10",
      _oneway: "true"
    } },
    { "sr-Cyrl": {
      _desired: "sr-Latn",
      _distance: "5"
    } },
    { "zh-Hans": {
      _desired: "za-Latn",
      _distance: "10",
      _oneway: "true"
    } },
    { "zh-Hans": {
      _desired: "zh-Hani",
      _distance: "20",
      _oneway: "true"
    } },
    { "zh-Hant": {
      _desired: "zh-Hani",
      _distance: "20",
      _oneway: "true"
    } },
    { "ar-Arab": {
      _desired: "ar-Latn",
      _distance: "20",
      _oneway: "true"
    } },
    { "bn-Beng": {
      _desired: "bn-Latn",
      _distance: "20",
      _oneway: "true"
    } },
    { "gu-Gujr": {
      _desired: "gu-Latn",
      _distance: "20",
      _oneway: "true"
    } },
    { "hi-Deva": {
      _desired: "hi-Latn",
      _distance: "20",
      _oneway: "true"
    } },
    { "kn-Knda": {
      _desired: "kn-Latn",
      _distance: "20",
      _oneway: "true"
    } },
    { "ml-Mlym": {
      _desired: "ml-Latn",
      _distance: "20",
      _oneway: "true"
    } },
    { "mr-Deva": {
      _desired: "mr-Latn",
      _distance: "20",
      _oneway: "true"
    } },
    { "ta-Taml": {
      _desired: "ta-Latn",
      _distance: "20",
      _oneway: "true"
    } },
    { "te-Telu": {
      _desired: "te-Latn",
      _distance: "20",
      _oneway: "true"
    } },
    { "zh-Hans": {
      _desired: "zh-Latn",
      _distance: "20",
      _oneway: "true"
    } },
    { "ja-Jpan": {
      _desired: "ja-Latn",
      _distance: "5",
      _oneway: "true"
    } },
    { "ja-Jpan": {
      _desired: "ja-Hani",
      _distance: "5",
      _oneway: "true"
    } },
    { "ja-Jpan": {
      _desired: "ja-Hira",
      _distance: "5",
      _oneway: "true"
    } },
    { "ja-Jpan": {
      _desired: "ja-Kana",
      _distance: "5",
      _oneway: "true"
    } },
    { "ja-Jpan": {
      _desired: "ja-Hrkt",
      _distance: "5",
      _oneway: "true"
    } },
    { "ja-Hrkt": {
      _desired: "ja-Hira",
      _distance: "5",
      _oneway: "true"
    } },
    { "ja-Hrkt": {
      _desired: "ja-Kana",
      _distance: "5",
      _oneway: "true"
    } },
    { "ko-Kore": {
      _desired: "ko-Hani",
      _distance: "5",
      _oneway: "true"
    } },
    { "ko-Kore": {
      _desired: "ko-Hang",
      _distance: "5",
      _oneway: "true"
    } },
    { "ko-Kore": {
      _desired: "ko-Jamo",
      _distance: "5",
      _oneway: "true"
    } },
    { "ko-Hang": {
      _desired: "ko-Jamo",
      _distance: "5",
      _oneway: "true"
    } },
    { "*-*": {
      _desired: "*-*",
      _distance: "50"
    } },
    { "ar-*-$maghreb": {
      _desired: "ar-*-$maghreb",
      _distance: "4"
    } },
    { "ar-*-$!maghreb": {
      _desired: "ar-*-$!maghreb",
      _distance: "4"
    } },
    { "ar-*-*": {
      _desired: "ar-*-*",
      _distance: "5"
    } },
    { "en-*-$enUS": {
      _desired: "en-*-$enUS",
      _distance: "4"
    } },
    { "en-*-GB": {
      _desired: "en-*-$!enUS",
      _distance: "3"
    } },
    { "en-*-$!enUS": {
      _desired: "en-*-$!enUS",
      _distance: "4"
    } },
    { "en-*-*": {
      _desired: "en-*-*",
      _distance: "5"
    } },
    { "es-*-$americas": {
      _desired: "es-*-$americas",
      _distance: "4"
    } },
    { "es-*-$!americas": {
      _desired: "es-*-$!americas",
      _distance: "4"
    } },
    { "es-*-*": {
      _desired: "es-*-*",
      _distance: "5"
    } },
    { "pt-*-$americas": {
      _desired: "pt-*-$americas",
      _distance: "4"
    } },
    { "pt-*-$!americas": {
      _desired: "pt-*-$!americas",
      _distance: "4"
    } },
    { "pt-*-*": {
      _desired: "pt-*-*",
      _distance: "5"
    } },
    { "zh-Hant-$cnsar": {
      _desired: "zh-Hant-$cnsar",
      _distance: "4"
    } },
    { "zh-Hant-$!cnsar": {
      _desired: "zh-Hant-$!cnsar",
      _distance: "4"
    } },
    { "zh-Hant-*": {
      _desired: "zh-Hant-*",
      _distance: "5"
    } },
    { "*-*-*": {
      _desired: "*-*-*",
      _distance: "4"
    } }
  ] } } };

  // node_modules/.aspect_rules_js/@formatjs+intl-localematcher@0.0.0/node_modules/@formatjs/intl-localematcher/abstract/regions.generated.js
  var regions = {
    "001": [
      "001",
      "001-status-grouping",
      "002",
      "005",
      "009",
      "011",
      "013",
      "014",
      "015",
      "017",
      "018",
      "019",
      "021",
      "029",
      "030",
      "034",
      "035",
      "039",
      "053",
      "054",
      "057",
      "061",
      "142",
      "143",
      "145",
      "150",
      "151",
      "154",
      "155",
      "AC",
      "AD",
      "AE",
      "AF",
      "AG",
      "AI",
      "AL",
      "AM",
      "AO",
      "AQ",
      "AR",
      "AS",
      "AT",
      "AU",
      "AW",
      "AX",
      "AZ",
      "BA",
      "BB",
      "BD",
      "BE",
      "BF",
      "BG",
      "BH",
      "BI",
      "BJ",
      "BL",
      "BM",
      "BN",
      "BO",
      "BQ",
      "BR",
      "BS",
      "BT",
      "BV",
      "BW",
      "BY",
      "BZ",
      "CA",
      "CC",
      "CD",
      "CF",
      "CG",
      "CH",
      "CI",
      "CK",
      "CL",
      "CM",
      "CN",
      "CO",
      "CP",
      "CQ",
      "CR",
      "CU",
      "CV",
      "CW",
      "CX",
      "CY",
      "CZ",
      "DE",
      "DG",
      "DJ",
      "DK",
      "DM",
      "DO",
      "DZ",
      "EA",
      "EC",
      "EE",
      "EG",
      "EH",
      "ER",
      "ES",
      "ET",
      "EU",
      "EZ",
      "FI",
      "FJ",
      "FK",
      "FM",
      "FO",
      "FR",
      "GA",
      "GB",
      "GD",
      "GE",
      "GF",
      "GG",
      "GH",
      "GI",
      "GL",
      "GM",
      "GN",
      "GP",
      "GQ",
      "GR",
      "GS",
      "GT",
      "GU",
      "GW",
      "GY",
      "HK",
      "HM",
      "HN",
      "HR",
      "HT",
      "HU",
      "IC",
      "ID",
      "IE",
      "IL",
      "IM",
      "IN",
      "IO",
      "IQ",
      "IR",
      "IS",
      "IT",
      "JE",
      "JM",
      "JO",
      "JP",
      "KE",
      "KG",
      "KH",
      "KI",
      "KM",
      "KN",
      "KP",
      "KR",
      "KW",
      "KY",
      "KZ",
      "LA",
      "LB",
      "LC",
      "LI",
      "LK",
      "LR",
      "LS",
      "LT",
      "LU",
      "LV",
      "LY",
      "MA",
      "MC",
      "MD",
      "ME",
      "MF",
      "MG",
      "MH",
      "MK",
      "ML",
      "MM",
      "MN",
      "MO",
      "MP",
      "MQ",
      "MR",
      "MS",
      "MT",
      "MU",
      "MV",
      "MW",
      "MX",
      "MY",
      "MZ",
      "NA",
      "NC",
      "NE",
      "NF",
      "NG",
      "NI",
      "NL",
      "NO",
      "NP",
      "NR",
      "NU",
      "NZ",
      "OM",
      "PA",
      "PE",
      "PF",
      "PG",
      "PH",
      "PK",
      "PL",
      "PM",
      "PN",
      "PR",
      "PS",
      "PT",
      "PW",
      "PY",
      "QA",
      "QO",
      "RE",
      "RO",
      "RS",
      "RU",
      "RW",
      "SA",
      "SB",
      "SC",
      "SD",
      "SE",
      "SG",
      "SH",
      "SI",
      "SJ",
      "SK",
      "SL",
      "SM",
      "SN",
      "SO",
      "SR",
      "SS",
      "ST",
      "SV",
      "SX",
      "SY",
      "SZ",
      "TA",
      "TC",
      "TD",
      "TF",
      "TG",
      "TH",
      "TJ",
      "TK",
      "TL",
      "TM",
      "TN",
      "TO",
      "TR",
      "TT",
      "TV",
      "TW",
      "TZ",
      "UA",
      "UG",
      "UM",
      "UN",
      "US",
      "UY",
      "UZ",
      "VA",
      "VC",
      "VE",
      "VG",
      "VI",
      "VN",
      "VU",
      "WF",
      "WS",
      "XK",
      "YE",
      "YT",
      "ZA",
      "ZM",
      "ZW"
    ],
    "002": [
      "002",
      "002-status-grouping",
      "011",
      "014",
      "015",
      "017",
      "018",
      "202",
      "AO",
      "BF",
      "BI",
      "BJ",
      "BW",
      "CD",
      "CF",
      "CG",
      "CI",
      "CM",
      "CV",
      "DJ",
      "DZ",
      "EA",
      "EG",
      "EH",
      "ER",
      "ET",
      "GA",
      "GH",
      "GM",
      "GN",
      "GQ",
      "GW",
      "IC",
      "IO",
      "KE",
      "KM",
      "LR",
      "LS",
      "LY",
      "MA",
      "MG",
      "ML",
      "MR",
      "MU",
      "MW",
      "MZ",
      "NA",
      "NE",
      "NG",
      "RE",
      "RW",
      "SC",
      "SD",
      "SH",
      "SL",
      "SN",
      "SO",
      "SS",
      "ST",
      "SZ",
      "TD",
      "TF",
      "TG",
      "TN",
      "TZ",
      "UG",
      "YT",
      "ZA",
      "ZM",
      "ZW"
    ],
    "003": [
      "003",
      "013",
      "021",
      "029",
      "AG",
      "AI",
      "AW",
      "BB",
      "BL",
      "BM",
      "BQ",
      "BS",
      "BZ",
      "CA",
      "CR",
      "CU",
      "CW",
      "DM",
      "DO",
      "GD",
      "GL",
      "GP",
      "GT",
      "HN",
      "HT",
      "JM",
      "KN",
      "KY",
      "LC",
      "MF",
      "MQ",
      "MS",
      "MX",
      "NI",
      "PA",
      "PM",
      "PR",
      "SV",
      "SX",
      "TC",
      "TT",
      "US",
      "VC",
      "VG",
      "VI"
    ],
    "005": [
      "005",
      "AR",
      "BO",
      "BR",
      "BV",
      "CL",
      "CO",
      "EC",
      "FK",
      "GF",
      "GS",
      "GY",
      "PE",
      "PY",
      "SR",
      "UY",
      "VE"
    ],
    "009": [
      "009",
      "053",
      "054",
      "057",
      "061",
      "AC",
      "AQ",
      "AS",
      "AU",
      "CC",
      "CK",
      "CP",
      "CX",
      "DG",
      "FJ",
      "FM",
      "GU",
      "HM",
      "KI",
      "MH",
      "MP",
      "NC",
      "NF",
      "NR",
      "NU",
      "NZ",
      "PF",
      "PG",
      "PN",
      "PW",
      "QO",
      "SB",
      "TA",
      "TK",
      "TO",
      "TV",
      "UM",
      "VU",
      "WF",
      "WS"
    ],
    "011": [
      "011",
      "BF",
      "BJ",
      "CI",
      "CV",
      "GH",
      "GM",
      "GN",
      "GW",
      "LR",
      "ML",
      "MR",
      "NE",
      "NG",
      "SH",
      "SL",
      "SN",
      "TG"
    ],
    "013": [
      "013",
      "BZ",
      "CR",
      "GT",
      "HN",
      "MX",
      "NI",
      "PA",
      "SV"
    ],
    "014": [
      "014",
      "BI",
      "DJ",
      "ER",
      "ET",
      "IO",
      "KE",
      "KM",
      "MG",
      "MU",
      "MW",
      "MZ",
      "RE",
      "RW",
      "SC",
      "SO",
      "SS",
      "TF",
      "TZ",
      "UG",
      "YT",
      "ZM",
      "ZW"
    ],
    "015": [
      "015",
      "DZ",
      "EA",
      "EG",
      "EH",
      "IC",
      "LY",
      "MA",
      "SD",
      "TN"
    ],
    "017": [
      "017",
      "AO",
      "CD",
      "CF",
      "CG",
      "CM",
      "GA",
      "GQ",
      "ST",
      "TD"
    ],
    "018": [
      "018",
      "BW",
      "LS",
      "NA",
      "SZ",
      "ZA"
    ],
    "019": [
      "003",
      "005",
      "013",
      "019",
      "019-status-grouping",
      "021",
      "029",
      "419",
      "AG",
      "AI",
      "AR",
      "AW",
      "BB",
      "BL",
      "BM",
      "BO",
      "BQ",
      "BR",
      "BS",
      "BV",
      "BZ",
      "CA",
      "CL",
      "CO",
      "CR",
      "CU",
      "CW",
      "DM",
      "DO",
      "EC",
      "FK",
      "GD",
      "GF",
      "GL",
      "GP",
      "GS",
      "GT",
      "GY",
      "HN",
      "HT",
      "JM",
      "KN",
      "KY",
      "LC",
      "MF",
      "MQ",
      "MS",
      "MX",
      "NI",
      "PA",
      "PE",
      "PM",
      "PR",
      "PY",
      "SR",
      "SV",
      "SX",
      "TC",
      "TT",
      "US",
      "UY",
      "VC",
      "VE",
      "VG",
      "VI"
    ],
    "021": [
      "021",
      "BM",
      "CA",
      "GL",
      "PM",
      "US"
    ],
    "029": [
      "029",
      "AG",
      "AI",
      "AW",
      "BB",
      "BL",
      "BQ",
      "BS",
      "CU",
      "CW",
      "DM",
      "DO",
      "GD",
      "GP",
      "HT",
      "JM",
      "KN",
      "KY",
      "LC",
      "MF",
      "MQ",
      "MS",
      "PR",
      "SX",
      "TC",
      "TT",
      "VC",
      "VG",
      "VI"
    ],
    "030": [
      "030",
      "CN",
      "HK",
      "JP",
      "KP",
      "KR",
      "MN",
      "MO",
      "TW"
    ],
    "034": [
      "034",
      "AF",
      "BD",
      "BT",
      "IN",
      "IR",
      "LK",
      "MV",
      "NP",
      "PK"
    ],
    "035": [
      "035",
      "BN",
      "ID",
      "KH",
      "LA",
      "MM",
      "MY",
      "PH",
      "SG",
      "TH",
      "TL",
      "VN"
    ],
    "039": [
      "039",
      "AD",
      "AL",
      "BA",
      "ES",
      "GI",
      "GR",
      "HR",
      "IT",
      "ME",
      "MK",
      "MT",
      "PT",
      "RS",
      "SI",
      "SM",
      "VA",
      "XK"
    ],
    "053": [
      "053",
      "AU",
      "CC",
      "CX",
      "HM",
      "NF",
      "NZ"
    ],
    "054": [
      "054",
      "FJ",
      "NC",
      "PG",
      "SB",
      "VU"
    ],
    "057": [
      "057",
      "FM",
      "GU",
      "KI",
      "MH",
      "MP",
      "NR",
      "PW",
      "UM"
    ],
    "061": [
      "061",
      "AS",
      "CK",
      "NU",
      "PF",
      "PN",
      "TK",
      "TO",
      "TV",
      "WF",
      "WS"
    ],
    "142": [
      "030",
      "034",
      "035",
      "142",
      "143",
      "145",
      "AE",
      "AF",
      "AM",
      "AZ",
      "BD",
      "BH",
      "BN",
      "BT",
      "CN",
      "CY",
      "GE",
      "HK",
      "ID",
      "IL",
      "IN",
      "IQ",
      "IR",
      "JO",
      "JP",
      "KG",
      "KH",
      "KP",
      "KR",
      "KW",
      "KZ",
      "LA",
      "LB",
      "LK",
      "MM",
      "MN",
      "MO",
      "MV",
      "MY",
      "NP",
      "OM",
      "PH",
      "PK",
      "PS",
      "QA",
      "SA",
      "SG",
      "SY",
      "TH",
      "TJ",
      "TL",
      "TM",
      "TR",
      "TW",
      "UZ",
      "VN",
      "YE"
    ],
    "143": [
      "143",
      "KG",
      "KZ",
      "TJ",
      "TM",
      "UZ"
    ],
    "145": [
      "145",
      "AE",
      "AM",
      "AZ",
      "BH",
      "CY",
      "GE",
      "IL",
      "IQ",
      "JO",
      "KW",
      "LB",
      "OM",
      "PS",
      "QA",
      "SA",
      "SY",
      "TR",
      "YE"
    ],
    "150": [
      "039",
      "150",
      "151",
      "154",
      "155",
      "AD",
      "AL",
      "AT",
      "AX",
      "BA",
      "BE",
      "BG",
      "BY",
      "CH",
      "CQ",
      "CZ",
      "DE",
      "DK",
      "EE",
      "ES",
      "FI",
      "FO",
      "FR",
      "GB",
      "GG",
      "GI",
      "GR",
      "HR",
      "HU",
      "IE",
      "IM",
      "IS",
      "IT",
      "JE",
      "LI",
      "LT",
      "LU",
      "LV",
      "MC",
      "MD",
      "ME",
      "MK",
      "MT",
      "NL",
      "NO",
      "PL",
      "PT",
      "RO",
      "RS",
      "RU",
      "SE",
      "SI",
      "SJ",
      "SK",
      "SM",
      "UA",
      "VA",
      "XK"
    ],
    "151": [
      "151",
      "BG",
      "BY",
      "CZ",
      "HU",
      "MD",
      "PL",
      "RO",
      "RU",
      "SK",
      "UA"
    ],
    "154": [
      "154",
      "AX",
      "CQ",
      "DK",
      "EE",
      "FI",
      "FO",
      "GB",
      "GG",
      "IE",
      "IM",
      "IS",
      "JE",
      "LT",
      "LV",
      "NO",
      "SE",
      "SJ"
    ],
    "155": [
      "155",
      "AT",
      "BE",
      "CH",
      "DE",
      "FR",
      "LI",
      "LU",
      "MC",
      "NL"
    ],
    "202": [
      "011",
      "014",
      "017",
      "018",
      "202",
      "AO",
      "BF",
      "BI",
      "BJ",
      "BW",
      "CD",
      "CF",
      "CG",
      "CI",
      "CM",
      "CV",
      "DJ",
      "ER",
      "ET",
      "GA",
      "GH",
      "GM",
      "GN",
      "GQ",
      "GW",
      "IO",
      "KE",
      "KM",
      "LR",
      "LS",
      "MG",
      "ML",
      "MR",
      "MU",
      "MW",
      "MZ",
      "NA",
      "NE",
      "NG",
      "RE",
      "RW",
      "SC",
      "SH",
      "SL",
      "SN",
      "SO",
      "SS",
      "ST",
      "SZ",
      "TD",
      "TF",
      "TG",
      "TZ",
      "UG",
      "YT",
      "ZA",
      "ZM",
      "ZW"
    ],
    "419": [
      "005",
      "013",
      "029",
      "419",
      "AG",
      "AI",
      "AR",
      "AW",
      "BB",
      "BL",
      "BO",
      "BQ",
      "BR",
      "BS",
      "BV",
      "BZ",
      "CL",
      "CO",
      "CR",
      "CU",
      "CW",
      "DM",
      "DO",
      "EC",
      "FK",
      "GD",
      "GF",
      "GP",
      "GS",
      "GT",
      "GY",
      "HN",
      "HT",
      "JM",
      "KN",
      "KY",
      "LC",
      "MF",
      "MQ",
      "MS",
      "MX",
      "NI",
      "PA",
      "PE",
      "PR",
      "PY",
      "SR",
      "SV",
      "SX",
      "TC",
      "TT",
      "UY",
      "VC",
      "VE",
      "VG",
      "VI"
    ],
    EU: [
      "AT",
      "BE",
      "BG",
      "CY",
      "CZ",
      "DE",
      "DK",
      "EE",
      "ES",
      "EU",
      "FI",
      "FR",
      "GR",
      "HR",
      "HU",
      "IE",
      "IT",
      "LT",
      "LU",
      "LV",
      "MT",
      "NL",
      "PL",
      "PT",
      "RO",
      "SE",
      "SI",
      "SK"
    ],
    EZ: [
      "AT",
      "BE",
      "CY",
      "DE",
      "EE",
      "ES",
      "EZ",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LT",
      "LU",
      "LV",
      "MT",
      "NL",
      "PT",
      "SI",
      "SK"
    ],
    QO: [
      "AC",
      "AQ",
      "CP",
      "DG",
      "QO",
      "TA"
    ],
    UN: [
      "AD",
      "AE",
      "AF",
      "AG",
      "AL",
      "AM",
      "AO",
      "AR",
      "AT",
      "AU",
      "AZ",
      "BA",
      "BB",
      "BD",
      "BE",
      "BF",
      "BG",
      "BH",
      "BI",
      "BJ",
      "BN",
      "BO",
      "BR",
      "BS",
      "BT",
      "BW",
      "BY",
      "BZ",
      "CA",
      "CD",
      "CF",
      "CG",
      "CH",
      "CI",
      "CL",
      "CM",
      "CN",
      "CO",
      "CR",
      "CU",
      "CV",
      "CY",
      "CZ",
      "DE",
      "DJ",
      "DK",
      "DM",
      "DO",
      "DZ",
      "EC",
      "EE",
      "EG",
      "ER",
      "ES",
      "ET",
      "FI",
      "FJ",
      "FM",
      "FR",
      "GA",
      "GB",
      "GD",
      "GE",
      "GH",
      "GM",
      "GN",
      "GQ",
      "GR",
      "GT",
      "GW",
      "GY",
      "HN",
      "HR",
      "HT",
      "HU",
      "ID",
      "IE",
      "IL",
      "IN",
      "IQ",
      "IR",
      "IS",
      "IT",
      "JM",
      "JO",
      "JP",
      "KE",
      "KG",
      "KH",
      "KI",
      "KM",
      "KN",
      "KP",
      "KR",
      "KW",
      "KZ",
      "LA",
      "LB",
      "LC",
      "LI",
      "LK",
      "LR",
      "LS",
      "LT",
      "LU",
      "LV",
      "LY",
      "MA",
      "MC",
      "MD",
      "ME",
      "MG",
      "MH",
      "MK",
      "ML",
      "MM",
      "MN",
      "MR",
      "MT",
      "MU",
      "MV",
      "MW",
      "MX",
      "MY",
      "MZ",
      "NA",
      "NE",
      "NG",
      "NI",
      "NL",
      "NO",
      "NP",
      "NR",
      "NZ",
      "OM",
      "PA",
      "PE",
      "PG",
      "PH",
      "PK",
      "PL",
      "PT",
      "PW",
      "PY",
      "QA",
      "RO",
      "RS",
      "RU",
      "RW",
      "SA",
      "SB",
      "SC",
      "SD",
      "SE",
      "SG",
      "SI",
      "SK",
      "SL",
      "SM",
      "SN",
      "SO",
      "SR",
      "SS",
      "ST",
      "SV",
      "SY",
      "SZ",
      "TD",
      "TG",
      "TH",
      "TJ",
      "TL",
      "TM",
      "TN",
      "TO",
      "TR",
      "TT",
      "TV",
      "TZ",
      "UA",
      "UG",
      "UN",
      "US",
      "UY",
      "UZ",
      "VC",
      "VE",
      "VN",
      "VU",
      "WS",
      "YE",
      "ZA",
      "ZM",
      "ZW"
    ]
  };

  // node_modules/.aspect_rules_js/@formatjs+intl-localematcher@0.0.0/node_modules/@formatjs/intl-localematcher/abstract/utils.js
  var PROCESSED_DATA;
  function processData() {
    if (!PROCESSED_DATA) {
      const paradigmLocales = data.supplemental.languageMatching["written-new"][0]?.paradigmLocales?._locales.split(" ");
      const matchVariables = data.supplemental.languageMatching["written-new"].slice(1, 5);
      const data2 = data.supplemental.languageMatching["written-new"].slice(5);
      const matches = data2.map((d) => {
        const key = Object.keys(d)[0];
        const value = d[key];
        return {
          supported: key,
          desired: value._desired,
          distance: +value._distance,
          oneway: value.oneway === "true" ? true : false
        };
      }, {});
      PROCESSED_DATA = {
        matches,
        matchVariables: matchVariables.reduce((all, d) => {
          const key = Object.keys(d)[0];
          const value = d[key];
          all[key.slice(1)] = value._value.split("+");
          return all;
        }, {}),
        paradigmLocales: [...paradigmLocales, ...paradigmLocales.map((l) => new Intl.Locale(l.replace(/_/g, "-")).maximize().toString())]
      };
    }
    return PROCESSED_DATA;
  }
  function isMatched(locale, languageMatchInfoLocale, matchVariables) {
    const [language, script, region] = languageMatchInfoLocale.split("-");
    let matches = true;
    if (region && region[0] === "$") {
      const shouldInclude = region[1] !== "!";
      const matchRegions = shouldInclude ? matchVariables[region.slice(1)] : matchVariables[region.slice(2)];
      const expandedMatchedRegions = matchRegions.map((r) => regions[r] || [r]).reduce((all, list) => [...all, ...list], []);
      matches && (matches = !(expandedMatchedRegions.indexOf(locale.region || "") > -1 != shouldInclude));
    } else {
      matches && (matches = locale.region ? region === "*" || region === locale.region : true);
    }
    matches && (matches = locale.script ? script === "*" || script === locale.script : true);
    matches && (matches = locale.language ? language === "*" || language === locale.language : true);
    return matches;
  }
  function serializeLSR(lsr) {
    return [
      lsr.language,
      lsr.script,
      lsr.region
    ].filter(Boolean).join("-");
  }
  function findMatchingDistanceForLSR(desired, supported, data2) {
    for (const d of data2.matches) {
      let matches = isMatched(desired, d.desired, data2.matchVariables) && isMatched(supported, d.supported, data2.matchVariables);
      if (!d.oneway && !matches) {
        matches = isMatched(desired, d.supported, data2.matchVariables) && isMatched(supported, d.desired, data2.matchVariables);
      }
      if (matches) {
        const distance = d.distance * 10;
        if (data2.paradigmLocales.indexOf(serializeLSR(desired)) > -1 != data2.paradigmLocales.indexOf(serializeLSR(supported)) > -1) {
          return distance - 1;
        }
        return distance;
      }
    }
    throw new Error("No matching distance found");
  }
  function findMatchingDistanceImpl(desired, supported) {
    const desiredLocale = new Intl.Locale(desired).maximize();
    const supportedLocale = new Intl.Locale(supported).maximize();
    const desiredLSR = {
      language: desiredLocale.language,
      script: desiredLocale.script || "",
      region: desiredLocale.region || ""
    };
    const supportedLSR = {
      language: supportedLocale.language,
      script: supportedLocale.script || "",
      region: supportedLocale.region || ""
    };
    let matchingDistance = 0;
    const data2 = processData();
    if (desiredLSR.language !== supportedLSR.language) {
      matchingDistance += findMatchingDistanceForLSR({
        language: desiredLocale.language,
        script: "",
        region: ""
      }, {
        language: supportedLocale.language,
        script: "",
        region: ""
      }, data2);
    }
    if (desiredLSR.script !== supportedLSR.script) {
      matchingDistance += findMatchingDistanceForLSR({
        language: desiredLocale.language,
        script: desiredLSR.script,
        region: ""
      }, {
        language: supportedLocale.language,
        script: supportedLSR.script,
        region: ""
      }, data2);
    }
    if (desiredLSR.region !== supportedLSR.region) {
      matchingDistance += findMatchingDistanceForLSR(desiredLSR, supportedLSR, data2);
    }
    return matchingDistance;
  }
  var findMatchingDistance = memoize(findMatchingDistanceImpl, { serializer: (args) => `${args[0]}|${args[1]}` });

  // node_modules/.aspect_rules_js/@formatjs+ecma402-abstract@0.0.0/node_modules/@formatjs/ecma402-abstract/types/date-time.js
  var RangePatternType = function(RangePatternType2) {
    RangePatternType2["startRange"] = "startRange";
    RangePatternType2["shared"] = "shared";
    RangePatternType2["endRange"] = "endRange";
    return RangePatternType2;
  }({});

  // node_modules/.aspect_rules_js/intl-messageformat@0.0.0/node_modules/intl-messageformat/src/error.js
  var ErrorCode = function(ErrorCode2) {
    ErrorCode2["MISSING_VALUE"] = "MISSING_VALUE";
    ErrorCode2["INVALID_VALUE"] = "INVALID_VALUE";
    ErrorCode2["MISSING_INTL_API"] = "MISSING_INTL_API";
    return ErrorCode2;
  }({});
  var FormatError = class extends Error {
    constructor(msg, code, originalMessage) {
      super(msg);
      __publicField(this, "code");
      /**
      * Original message we're trying to format
      * `undefined` if we're only dealing w/ AST
      *
      * @type {(string | undefined)}
      * @memberof FormatError
      */
      __publicField(this, "originalMessage");
      this.code = code;
      this.originalMessage = originalMessage;
    }
    toString() {
      return `[formatjs Error: ${this.code}] ${this.message}`;
    }
  };
  var InvalidValueError = class extends FormatError {
    constructor(variableId, value, options, originalMessage) {
      super(`Invalid values for "${variableId}": "${value}". Options are "${Object.keys(options).join('", "')}"`, ErrorCode.INVALID_VALUE, originalMessage);
    }
  };
  var InvalidValueTypeError = class extends FormatError {
    constructor(value, type, originalMessage) {
      super(`Value for "${value}" must be of type ${type}`, ErrorCode.INVALID_VALUE, originalMessage);
    }
  };
  var MissingValueError = class extends FormatError {
    constructor(variableId, originalMessage) {
      super(`The intl string context variable "${variableId}" was not provided to the string "${originalMessage}"`, ErrorCode.MISSING_VALUE, originalMessage);
    }
  };

  // node_modules/.aspect_rules_js/intl-messageformat@0.0.0/node_modules/intl-messageformat/src/formatters.js
  var PART_TYPE = function(PART_TYPE2) {
    PART_TYPE2[PART_TYPE2["literal"] = 0] = "literal";
    PART_TYPE2[PART_TYPE2["object"] = 1] = "object";
    return PART_TYPE2;
  }({});
  function mergeLiteral(parts) {
    if (parts.length < 2) {
      return parts;
    }
    return parts.reduce((all, part) => {
      const lastPart = all[all.length - 1];
      if (!lastPart || lastPart.type !== PART_TYPE.literal || part.type !== PART_TYPE.literal) {
        all.push(part);
      } else {
        lastPart.value += part.value;
      }
      return all;
    }, []);
  }
  function isFormatXMLElementFn(el) {
    return typeof el === "function";
  }
  function formatToParts2(els, locales, formatters, formats, values, currentPluralValue, originalMessage) {
    if (els.length === 1 && isLiteralElement(els[0])) {
      return [{
        type: PART_TYPE.literal,
        value: els[0].value
      }];
    }
    const result = [];
    for (const el of els) {
      if (isLiteralElement(el)) {
        result.push({
          type: PART_TYPE.literal,
          value: el.value
        });
        continue;
      }
      if (isPoundElement(el)) {
        if (typeof currentPluralValue === "number") {
          result.push({
            type: PART_TYPE.literal,
            value: formatters.getNumberFormat(locales).format(currentPluralValue)
          });
        }
        continue;
      }
      const { value: varName } = el;
      if (!(values && varName in values)) {
        throw new MissingValueError(varName, originalMessage);
      }
      let value = values[varName];
      if (isArgumentElement(el)) {
        if (!value || typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
          value = typeof value === "string" || typeof value === "number" || typeof value === "bigint" ? String(value) : "";
        }
        result.push({
          type: typeof value === "string" ? PART_TYPE.literal : PART_TYPE.object,
          value
        });
        continue;
      }
      if (isDateElement(el)) {
        const style = typeof el.style === "string" ? formats.date[el.style] : isDateTimeSkeleton(el.style) ? el.style.parsedOptions : void 0;
        result.push({
          type: PART_TYPE.literal,
          value: formatters.getDateTimeFormat(locales, style).format(value)
        });
        continue;
      }
      if (isTimeElement(el)) {
        const style = typeof el.style === "string" ? formats.time[el.style] : isDateTimeSkeleton(el.style) ? el.style.parsedOptions : formats.time.medium;
        result.push({
          type: PART_TYPE.literal,
          value: formatters.getDateTimeFormat(locales, style).format(value)
        });
        continue;
      }
      if (isNumberElement(el)) {
        const style = typeof el.style === "string" ? formats.number[el.style] : isNumberSkeleton(el.style) ? el.style.parsedOptions : void 0;
        if (style && style.scale) {
          const scale = style.scale || 1;
          if (typeof value === "bigint") {
            if (!Number.isInteger(scale)) {
              throw new TypeError(`Cannot apply fractional scale ${scale} to bigint value. Scale must be an integer when formatting bigint.`);
            }
            value = value * BigInt(scale);
          } else {
            value = value * scale;
          }
        }
        result.push({
          type: PART_TYPE.literal,
          value: formatters.getNumberFormat(locales, style).format(value)
        });
        continue;
      }
      if (isTagElement(el)) {
        const { children, value: value2 } = el;
        const formatFn = values[value2];
        if (!isFormatXMLElementFn(formatFn)) {
          throw new InvalidValueTypeError(value2, "function", originalMessage);
        }
        const parts = formatToParts2(children, locales, formatters, formats, values, currentPluralValue);
        let chunks = formatFn(parts.map((p) => p.value));
        if (!Array.isArray(chunks)) {
          chunks = [chunks];
        }
        result.push(...chunks.map((c) => {
          return {
            type: typeof c === "string" ? PART_TYPE.literal : PART_TYPE.object,
            value: c
          };
        }));
      }
      if (isSelectElement(el)) {
        const key = value;
        const opt = (Object.prototype.hasOwnProperty.call(el.options, key) ? el.options[key] : void 0) || el.options.other;
        if (!opt) {
          throw new InvalidValueError(el.value, value, Object.keys(el.options), originalMessage);
        }
        result.push(...formatToParts2(opt.value, locales, formatters, formats, values));
        continue;
      }
      if (isPluralElement(el)) {
        const exactKey = `=${value}`;
        let opt = Object.prototype.hasOwnProperty.call(el.options, exactKey) ? el.options[exactKey] : void 0;
        if (!opt) {
          if (!Intl.PluralRules) {
            throw new FormatError(`Intl.PluralRules is not available in this environment.
Try polyfilling it using "@formatjs/intl-pluralrules"
`, ErrorCode.MISSING_INTL_API, originalMessage);
          }
          const numericValue2 = typeof value === "bigint" ? Number(value) : value;
          const rule = formatters.getPluralRules(locales, { type: el.pluralType }).select(numericValue2 - (el.offset || 0));
          opt = (Object.prototype.hasOwnProperty.call(el.options, rule) ? el.options[rule] : void 0) || el.options.other;
        }
        if (!opt) {
          throw new InvalidValueError(el.value, value, Object.keys(el.options), originalMessage);
        }
        const numericValue = typeof value === "bigint" ? Number(value) : value;
        result.push(...formatToParts2(opt.value, locales, formatters, formats, values, numericValue - (el.offset || 0)));
        continue;
      }
    }
    return mergeLiteral(result);
  }

  // node_modules/.aspect_rules_js/intl-messageformat@0.0.0/node_modules/intl-messageformat/src/core.js
  function mergeConfig(c1, c2) {
    if (!c2) {
      return c1;
    }
    return {
      ...c1,
      ...c2,
      ...Object.keys(c1).reduce((all, k) => {
        all[k] = {
          ...c1[k],
          ...c2[k]
        };
        return all;
      }, {})
    };
  }
  function mergeConfigs(defaultConfig, configs) {
    if (!configs) {
      return defaultConfig;
    }
    return Object.keys(defaultConfig).reduce((all, k) => {
      all[k] = mergeConfig(defaultConfig[k], configs[k]);
      return all;
    }, { ...defaultConfig });
  }
  function createFastMemoizeCache(store) {
    return { create() {
      return {
        get(key) {
          return store[key];
        },
        set(key, value) {
          store[key] = value;
        }
      };
    } };
  }
  function createDefaultFormatters(cache = {
    number: {},
    dateTime: {},
    pluralRules: {}
  }) {
    return {
      getNumberFormat: memoize((...args) => new Intl.NumberFormat(...args), {
        cache: createFastMemoizeCache(cache.number),
        strategy: strategies.variadic
      }),
      getDateTimeFormat: memoize((...args) => new Intl.DateTimeFormat(...args), {
        cache: createFastMemoizeCache(cache.dateTime),
        strategy: strategies.variadic
      }),
      getPluralRules: memoize((...args) => new Intl.PluralRules(...args), {
        cache: createFastMemoizeCache(cache.pluralRules),
        strategy: strategies.variadic
      })
    };
  }
  var _IntlMessageFormat = class _IntlMessageFormat {
    constructor(message, locales = _IntlMessageFormat.defaultLocale, overrideFormats, opts) {
      __publicField(this, "ast");
      __publicField(this, "locales");
      __publicField(this, "resolvedLocale");
      __publicField(this, "formatters");
      __publicField(this, "formats");
      __publicField(this, "message");
      __publicField(this, "formatterCache", {
        number: {},
        dateTime: {},
        pluralRules: {}
      });
      __publicField(this, "format", (values) => {
        const parts = this.formatToParts(values);
        if (parts.length === 1) {
          return parts[0].value;
        }
        const result = parts.reduce((all, part) => {
          if (!all.length || part.type !== PART_TYPE.literal || typeof all[all.length - 1] !== "string") {
            all.push(part.value);
          } else {
            all[all.length - 1] += part.value;
          }
          return all;
        }, []);
        if (result.length <= 1) {
          return result[0] || "";
        }
        return result;
      });
      __publicField(this, "formatToParts", (values) => formatToParts2(this.ast, this.locales, this.formatters, this.formats, values, void 0, this.message));
      __publicField(this, "resolvedOptions", () => ({ locale: this.resolvedLocale?.toString() || Intl.NumberFormat.supportedLocalesOf(this.locales)[0] }));
      __publicField(this, "getAst", () => this.ast);
      this.locales = locales;
      this.resolvedLocale = _IntlMessageFormat.resolveLocale(locales);
      if (typeof message === "string") {
        this.message = message;
        if (!_IntlMessageFormat.__parse) {
          throw new TypeError("IntlMessageFormat.__parse must be set to process `message` of type `string`");
        }
        const { ...parseOpts } = opts || {};
        this.ast = _IntlMessageFormat.__parse(message, {
          ...parseOpts,
          locale: this.resolvedLocale
        });
      } else {
        this.ast = message;
      }
      if (!Array.isArray(this.ast)) {
        throw new TypeError("A message must be provided as a String or AST.");
      }
      this.formats = mergeConfigs(_IntlMessageFormat.formats, overrideFormats);
      this.formatters = opts && opts.formatters || createDefaultFormatters(this.formatterCache);
    }
    static get defaultLocale() {
      if (!_IntlMessageFormat.memoizedDefaultLocale) {
        _IntlMessageFormat.memoizedDefaultLocale = new Intl.NumberFormat().resolvedOptions().locale;
      }
      return _IntlMessageFormat.memoizedDefaultLocale;
    }
  };
  __publicField(_IntlMessageFormat, "memoizedDefaultLocale", null);
  __publicField(_IntlMessageFormat, "resolveLocale", (locales) => {
    if (typeof Intl.Locale === "undefined") {
      return;
    }
    const supportedLocales = Intl.NumberFormat.supportedLocalesOf(locales);
    if (supportedLocales.length > 0) {
      return new Intl.Locale(supportedLocales[0]);
    }
    return new Intl.Locale(typeof locales === "string" ? locales : locales[0]);
  });
  __publicField(_IntlMessageFormat, "__parse", parse);
  // Default format options used as the prototype of the `formats` provided to the
  // constructor. These are used when constructing the internal Intl.NumberFormat
  // and Intl.DateTimeFormat instances.
  __publicField(_IntlMessageFormat, "formats", {
    number: {
      integer: { maximumFractionDigits: 0 },
      currency: { style: "currency" },
      percent: { style: "percent" }
    },
    date: {
      short: {
        month: "numeric",
        day: "numeric",
        year: "2-digit"
      },
      medium: {
        month: "short",
        day: "numeric",
        year: "numeric"
      },
      long: {
        month: "long",
        day: "numeric",
        year: "numeric"
      },
      full: {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
      }
    },
    time: {
      short: {
        hour: "numeric",
        minute: "numeric"
      },
      medium: {
        hour: "numeric",
        minute: "numeric",
        second: "numeric"
      },
      long: {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        timeZoneName: "short"
      },
      full: {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        timeZoneName: "short"
      }
    }
  });
  var IntlMessageFormat = _IntlMessageFormat;

  // node_modules/.aspect_rules_js/@formatjs+intl@0.0.0/node_modules/@formatjs/intl/src/error.js
  var IntlErrorCode = function(IntlErrorCode2) {
    IntlErrorCode2["FORMAT_ERROR"] = "FORMAT_ERROR";
    IntlErrorCode2["UNSUPPORTED_FORMATTER"] = "UNSUPPORTED_FORMATTER";
    IntlErrorCode2["INVALID_CONFIG"] = "INVALID_CONFIG";
    IntlErrorCode2["MISSING_DATA"] = "MISSING_DATA";
    IntlErrorCode2["MISSING_TRANSLATION"] = "MISSING_TRANSLATION";
    return IntlErrorCode2;
  }({});
  var IntlError = class _IntlError extends Error {
    constructor(code, message, exception) {
      const err = exception ? exception instanceof Error ? exception : new Error(String(exception)) : void 0;
      super(`[@formatjs/intl Error ${code}] ${message}
${err ? `
${err.message}
${err.stack}` : ""}`);
      __publicField(this, "code");
      this.code = code;
      if (typeof Error.captureStackTrace === "function") {
        Error.captureStackTrace(this, _IntlError);
      }
    }
  };
  var UnsupportedFormatterError = class extends IntlError {
    constructor(message, exception) {
      super(IntlErrorCode.UNSUPPORTED_FORMATTER, message, exception);
    }
  };
  var InvalidConfigError = class extends IntlError {
    constructor(message, exception) {
      super(IntlErrorCode.INVALID_CONFIG, message, exception);
    }
  };
  var MissingDataError = class extends IntlError {
    constructor(message, exception) {
      super(IntlErrorCode.MISSING_DATA, message, exception);
    }
  };
  var IntlFormatError = class extends IntlError {
    constructor(message, locale, exception) {
      super(IntlErrorCode.FORMAT_ERROR, `${message}
Locale: ${locale}
`, exception);
      __publicField(this, "descriptor");
      __publicField(this, "locale");
      this.locale = locale;
    }
  };
  var MessageFormatError = class extends IntlFormatError {
    constructor(message, locale, descriptor, exception) {
      super(`${message}
MessageID: ${descriptor?.id}
Default Message: ${descriptor?.defaultMessage}
Description: ${descriptor?.description}
`, locale, exception);
      __publicField(this, "descriptor");
      __publicField(this, "locale");
      this.descriptor = descriptor;
      this.locale = locale;
    }
  };
  var MissingTranslationError = class extends IntlError {
    constructor(descriptor, locale) {
      super(IntlErrorCode.MISSING_TRANSLATION, `Missing message: "${descriptor.id}" for locale "${locale}", using ${descriptor.defaultMessage ? `default message (${typeof descriptor.defaultMessage === "string" ? descriptor.defaultMessage : descriptor.defaultMessage.map((e) => e.value ?? JSON.stringify(e)).join()})` : "id"} as fallback.`);
      __publicField(this, "descriptor");
      this.descriptor = descriptor;
    }
  };

  // node_modules/.aspect_rules_js/@formatjs+intl@0.0.0/node_modules/@formatjs/intl/src/utils.js
  function invariant3(condition, message, Err = Error) {
    if (!condition) {
      throw new Err(message);
    }
  }
  function filterProps(props, allowlist, defaults = {}) {
    return allowlist.reduce((filtered, name) => {
      if (name in props) {
        filtered[name] = props[name];
      } else if (name in defaults) {
        filtered[name] = defaults[name];
      }
      return filtered;
    }, {});
  }
  var defaultErrorHandler = (error) => {
    if (true) {
      console.error(error);
    }
  };
  var defaultWarnHandler = (warning) => {
    if (true) {
      console.warn(warning);
    }
  };
  var DEFAULT_INTL_CONFIG = {
    formats: {},
    messages: {},
    timeZone: void 0,
    defaultLocale: "en",
    defaultFormats: {},
    fallbackOnEmptyString: true,
    onError: defaultErrorHandler,
    onWarn: defaultWarnHandler
  };
  function createIntlCache() {
    return {
      dateTime: {},
      number: {},
      message: {},
      relativeTime: {},
      pluralRules: {},
      list: {},
      displayNames: {}
    };
  }
  function createFastMemoizeCache2(store) {
    return { create() {
      return {
        get(key) {
          return store[key];
        },
        set(key, value) {
          store[key] = value;
        }
      };
    } };
  }
  function createFormatters(cache = createIntlCache()) {
    const RelativeTimeFormat = Intl.RelativeTimeFormat;
    const ListFormat = Intl.ListFormat;
    const DisplayNames = Intl.DisplayNames;
    const getDateTimeFormat = memoize((...args) => new Intl.DateTimeFormat(...args), {
      cache: createFastMemoizeCache2(cache.dateTime),
      strategy: strategies.variadic
    });
    const getNumberFormat = memoize((...args) => new Intl.NumberFormat(...args), {
      cache: createFastMemoizeCache2(cache.number),
      strategy: strategies.variadic
    });
    const getPluralRules = memoize((...args) => new Intl.PluralRules(...args), {
      cache: createFastMemoizeCache2(cache.pluralRules),
      strategy: strategies.variadic
    });
    return {
      getDateTimeFormat,
      getNumberFormat,
      getMessageFormat: memoize((message, locales, overrideFormats, opts) => new IntlMessageFormat(message, locales, overrideFormats, {
        formatters: {
          getNumberFormat,
          getDateTimeFormat,
          getPluralRules
        },
        ...opts
      }), {
        cache: createFastMemoizeCache2(cache.message),
        strategy: strategies.variadic
      }),
      getRelativeTimeFormat: memoize((...args) => new RelativeTimeFormat(...args), {
        cache: createFastMemoizeCache2(cache.relativeTime),
        strategy: strategies.variadic
      }),
      getPluralRules,
      getListFormat: memoize((...args) => new ListFormat(...args), {
        cache: createFastMemoizeCache2(cache.list),
        strategy: strategies.variadic
      }),
      getDisplayNames: memoize((...args) => new DisplayNames(...args), {
        cache: createFastMemoizeCache2(cache.displayNames),
        strategy: strategies.variadic
      })
    };
  }
  function getNamedFormat(formats, type, name, onError) {
    const formatType = formats && formats[type];
    let format;
    if (formatType) {
      format = formatType[name];
    }
    if (format) {
      return format;
    }
    onError(new UnsupportedFormatterError(`No ${type} format named: ${name}`));
  }

  // node_modules/.aspect_rules_js/@formatjs+intl@0.0.0/node_modules/@formatjs/intl/src/message.js
  function setTimeZoneInOptions(opts, timeZone) {
    return Object.keys(opts).reduce((all, k) => {
      all[k] = {
        timeZone,
        ...opts[k]
      };
      return all;
    }, {});
  }
  function deepMergeOptions(opts1, opts2) {
    const keys = Object.keys({
      ...opts1,
      ...opts2
    });
    return keys.reduce((all, k) => {
      all[k] = {
        ...opts1[k],
        ...opts2[k]
      };
      return all;
    }, {});
  }
  function deepMergeFormatsAndSetTimeZone(f1, timeZone) {
    if (!timeZone) {
      return f1;
    }
    const mfFormats = IntlMessageFormat.formats;
    return {
      ...mfFormats,
      ...f1,
      date: deepMergeOptions(setTimeZoneInOptions(mfFormats.date, timeZone), setTimeZoneInOptions(f1.date || {}, timeZone)),
      time: deepMergeOptions(setTimeZoneInOptions(mfFormats.time, timeZone), setTimeZoneInOptions(f1.time || {}, timeZone))
    };
  }
  var formatMessage = ({ locale, formats, messages, defaultLocale, defaultFormats, fallbackOnEmptyString, onError, timeZone, defaultRichTextElements }, state, messageDescriptor = { id: "" }, values, opts) => {
    const { id: msgId, defaultMessage } = messageDescriptor;
    invariant3(!!msgId, `[@formatjs/intl] An \`id\` must be provided to format a message. You can either:
1. Configure your build toolchain with [babel-plugin-formatjs](https://formatjs.github.io/docs/tooling/babel-plugin)
or [@formatjs/ts-transformer](https://formatjs.github.io/docs/tooling/ts-transformer) OR
2. Configure your \`eslint\` config to include [eslint-plugin-formatjs](https://formatjs.github.io/docs/tooling/linter#enforce-id)
to autofix this issue`);
    const id = String(msgId);
    const message = messages && Object.prototype.hasOwnProperty.call(messages, id) && messages[id];
    if (Array.isArray(message) && message.length === 1 && message[0].type === TYPE.literal) {
      return message[0].value;
    }
    values = {
      ...defaultRichTextElements,
      ...values
    };
    formats = deepMergeFormatsAndSetTimeZone(formats, timeZone);
    defaultFormats = deepMergeFormatsAndSetTimeZone(defaultFormats, timeZone);
    if (!message) {
      if (fallbackOnEmptyString === false && message === "") {
        return message;
      }
      if (!defaultMessage || locale && locale.toLowerCase() !== defaultLocale.toLowerCase()) {
        onError(new MissingTranslationError(messageDescriptor, locale));
      }
      if (defaultMessage) {
        try {
          const formatter = state.getMessageFormat(defaultMessage, defaultLocale, defaultFormats, opts);
          return formatter.format(values);
        } catch (e) {
          onError(new MessageFormatError(`Error formatting default message for: "${id}", rendering default message verbatim`, locale, messageDescriptor, e));
          return typeof defaultMessage === "string" ? defaultMessage : id;
        }
      }
      return id;
    }
    try {
      const formatter = state.getMessageFormat(message, locale, formats, {
        formatters: state,
        ...opts
      });
      return formatter.format(values);
    } catch (e) {
      onError(new MessageFormatError(`Error formatting message: "${id}", using ${defaultMessage ? "default message" : "id"} as fallback.`, locale, messageDescriptor, e));
    }
    if (defaultMessage) {
      try {
        const formatter = state.getMessageFormat(defaultMessage, defaultLocale, defaultFormats, opts);
        return formatter.format(values);
      } catch (e) {
        onError(new MessageFormatError(`Error formatting the default message for: "${id}", rendering message verbatim`, locale, messageDescriptor, e));
      }
    }
    if (typeof message === "string") {
      return message;
    }
    if (typeof defaultMessage === "string") {
      return defaultMessage;
    }
    return id;
  };

  // node_modules/.aspect_rules_js/@formatjs+intl@0.0.0/node_modules/@formatjs/intl/src/dateTime.js
  var DATE_TIME_FORMAT_OPTIONS = [
    "formatMatcher",
    "timeZone",
    "hour12",
    "weekday",
    "era",
    "year",
    "month",
    "day",
    "hour",
    "minute",
    "second",
    "timeZoneName",
    "hourCycle",
    "dateStyle",
    "timeStyle",
    "calendar",
    "numberingSystem",
    "fractionalSecondDigits"
  ];
  function getFormatter({ locale, formats, onError, timeZone }, type, getDateTimeFormat, options = {}) {
    const { format } = options;
    const defaults = {
      ...timeZone && { timeZone },
      ...format && getNamedFormat(formats, type, format, onError)
    };
    let filteredOptions = filterProps(options, DATE_TIME_FORMAT_OPTIONS, defaults);
    if (type === "time" && !filteredOptions.hour && !filteredOptions.minute && !filteredOptions.second && !filteredOptions.timeStyle && !filteredOptions.dateStyle) {
      filteredOptions = {
        ...filteredOptions,
        hour: "numeric",
        minute: "numeric"
      };
    }
    return getDateTimeFormat(locale, filteredOptions);
  }
  function formatDate(config, getDateTimeFormat, value, options = {}) {
    const date = typeof value === "string" ? new Date(value || 0) : value;
    try {
      return getFormatter(config, "date", getDateTimeFormat, options).format(date);
    } catch (e) {
      config.onError(new IntlFormatError("Error formatting date.", config.locale, e));
    }
    return String(date);
  }
  function formatTime(config, getDateTimeFormat, value, options = {}) {
    const date = typeof value === "string" ? new Date(value || 0) : value;
    try {
      return getFormatter(config, "time", getDateTimeFormat, options).format(date);
    } catch (e) {
      config.onError(new IntlFormatError("Error formatting time.", config.locale, e));
    }
    return String(date);
  }
  function formatDateTimeRange(config, getDateTimeFormat, from, to, options = {}) {
    const fromDate = typeof from === "string" ? new Date(from || 0) : from;
    const toDate = typeof to === "string" ? new Date(to || 0) : to;
    try {
      return getFormatter(config, "dateTimeRange", getDateTimeFormat, options).formatRange(fromDate, toDate);
    } catch (e) {
      config.onError(new IntlFormatError("Error formatting date time range.", config.locale, e));
    }
    return String(fromDate);
  }
  function formatDateToParts(config, getDateTimeFormat, value, options = {}) {
    const date = typeof value === "string" ? new Date(value || 0) : value;
    try {
      return getFormatter(config, "date", getDateTimeFormat, options).formatToParts(date);
    } catch (e) {
      config.onError(new IntlFormatError("Error formatting date.", config.locale, e));
    }
    return [];
  }
  function formatTimeToParts(config, getDateTimeFormat, value, options = {}) {
    const date = typeof value === "string" ? new Date(value || 0) : value;
    try {
      return getFormatter(config, "time", getDateTimeFormat, options).formatToParts(date);
    } catch (e) {
      config.onError(new IntlFormatError("Error formatting time.", config.locale, e));
    }
    return [];
  }

  // node_modules/.aspect_rules_js/@formatjs+intl@0.0.0/node_modules/@formatjs/intl/src/displayName.js
  var DISPLAY_NAMES_OPTONS = [
    "style",
    "type",
    "fallback",
    "languageDisplay"
  ];
  function formatDisplayName({ locale, onError }, getDisplayNames, value, options) {
    const DisplayNames = Intl.DisplayNames;
    if (!DisplayNames) {
      onError(new FormatError(`Intl.DisplayNames is not available in this environment.
Try polyfilling it using "@formatjs/intl-displaynames"
`, ErrorCode.MISSING_INTL_API));
    }
    const filteredOptions = filterProps(options, DISPLAY_NAMES_OPTONS);
    try {
      return getDisplayNames(locale, filteredOptions).of(value);
    } catch (e) {
      onError(new IntlFormatError("Error formatting display name.", locale, e));
    }
  }

  // node_modules/.aspect_rules_js/@formatjs+intl@0.0.0/node_modules/@formatjs/intl/src/list.js
  var LIST_FORMAT_OPTIONS = ["type", "style"];
  var now = Date.now();
  function generateToken(i) {
    return `${now}_${i}_${now}`;
  }
  function formatList(opts, getListFormat, values, options = {}) {
    const results = formatListToParts(opts, getListFormat, values, options).reduce((all, el) => {
      const val = el.value;
      if (typeof val !== "string") {
        all.push(val);
      } else if (typeof all[all.length - 1] === "string") {
        all[all.length - 1] += val;
      } else {
        all.push(val);
      }
      return all;
    }, []);
    return results.length === 1 ? results[0] : results.length === 0 ? "" : results;
  }
  function formatListToParts({ locale, onError }, getListFormat, values, options = {}) {
    const ListFormat = Intl.ListFormat;
    if (!ListFormat) {
      onError(new FormatError(`Intl.ListFormat is not available in this environment.
Try polyfilling it using "@formatjs/intl-listformat"
`, ErrorCode.MISSING_INTL_API));
    }
    const filteredOptions = filterProps(options, LIST_FORMAT_OPTIONS);
    try {
      const richValues = {};
      const serializedValues = Array.from(values).map((v, i) => {
        if (typeof v === "object" && v !== null) {
          const id = generateToken(i);
          richValues[id] = v;
          return id;
        }
        return String(v);
      });
      return getListFormat(locale, filteredOptions).formatToParts(serializedValues).map((part) => part.type === "literal" ? part : {
        ...part,
        value: richValues[part.value] || part.value
      });
    } catch (e) {
      onError(new IntlFormatError("Error formatting list.", locale, e));
    }
    return values;
  }

  // node_modules/.aspect_rules_js/@formatjs+intl@0.0.0/node_modules/@formatjs/intl/src/plural.js
  var PLURAL_FORMAT_OPTIONS = ["type"];
  function formatPlural({ locale, onError }, getPluralRules, value, options = {}) {
    if (!Intl.PluralRules) {
      onError(new FormatError(`Intl.PluralRules is not available in this environment.
Try polyfilling it using "@formatjs/intl-pluralrules"
`, ErrorCode.MISSING_INTL_API));
    }
    const filteredOptions = filterProps(options, PLURAL_FORMAT_OPTIONS);
    try {
      return getPluralRules(locale, filteredOptions).select(value);
    } catch (e) {
      onError(new IntlFormatError("Error formatting plural.", locale, e));
    }
    return "other";
  }

  // node_modules/.aspect_rules_js/@formatjs+intl@0.0.0/node_modules/@formatjs/intl/src/relativeTime.js
  var RELATIVE_TIME_FORMAT_OPTIONS = ["numeric", "style"];
  function getFormatter2({ locale, formats, onError }, getRelativeTimeFormat, options = {}) {
    const { format } = options;
    const defaults = !!format && getNamedFormat(formats, "relative", format, onError) || {};
    const filteredOptions = filterProps(options, RELATIVE_TIME_FORMAT_OPTIONS, defaults);
    return getRelativeTimeFormat(locale, filteredOptions);
  }
  function formatRelativeTime(config, getRelativeTimeFormat, value, unit, options = {}) {
    if (!unit) {
      unit = "second";
    }
    const RelativeTimeFormat = Intl.RelativeTimeFormat;
    if (!RelativeTimeFormat) {
      config.onError(new FormatError(`Intl.RelativeTimeFormat is not available in this environment.
Try polyfilling it using "@formatjs/intl-relativetimeformat"
`, ErrorCode.MISSING_INTL_API));
    }
    try {
      return getFormatter2(config, getRelativeTimeFormat, options).format(value, unit);
    } catch (e) {
      config.onError(new IntlFormatError("Error formatting relative time.", config.locale, e));
    }
    return String(value);
  }

  // node_modules/.aspect_rules_js/@formatjs+intl@0.0.0/node_modules/@formatjs/intl/src/number.js
  var NUMBER_FORMAT_OPTIONS = [
    "style",
    "currency",
    "unit",
    "unitDisplay",
    "useGrouping",
    "minimumIntegerDigits",
    "minimumFractionDigits",
    "maximumFractionDigits",
    "minimumSignificantDigits",
    "maximumSignificantDigits",
    "compactDisplay",
    "currencyDisplay",
    "currencySign",
    "notation",
    "signDisplay",
    "unit",
    "unitDisplay",
    "numberingSystem",
    "trailingZeroDisplay",
    "roundingPriority",
    "roundingIncrement",
    "roundingMode"
  ];
  function getFormatter3({ locale, formats, onError }, getNumberFormat, options = {}) {
    const { format } = options;
    const defaults = format && getNamedFormat(formats, "number", format, onError) || {};
    const filteredOptions = filterProps(options, NUMBER_FORMAT_OPTIONS, defaults);
    return getNumberFormat(locale, filteredOptions);
  }
  function formatNumber(config, getNumberFormat, value, options = {}) {
    try {
      return getFormatter3(config, getNumberFormat, options).format(value);
    } catch (e) {
      config.onError(new IntlFormatError("Error formatting number.", config.locale, e));
    }
    return String(value);
  }
  function formatNumberToParts(config, getNumberFormat, value, options = {}) {
    try {
      return getFormatter3(config, getNumberFormat, options).formatToParts(value);
    } catch (e) {
      config.onError(new IntlFormatError("Error formatting number.", config.locale, e));
    }
    return [];
  }

  // node_modules/.aspect_rules_js/@formatjs+intl@0.0.0/node_modules/@formatjs/intl/src/create-intl.js
  function messagesContainString(messages) {
    const firstMessage = messages ? messages[Object.keys(messages)[0]] : void 0;
    return typeof firstMessage === "string";
  }
  function verifyConfigMessages(config) {
    if (config.onWarn && config.defaultRichTextElements && messagesContainString(config.messages || {})) {
      config.onWarn(`[@formatjs/intl] "defaultRichTextElements" was specified but "message" was not pre-compiled. 
Please consider using "@formatjs/cli" to pre-compile your messages for performance.
For more details see https://formatjs.github.io/docs/getting-started/message-distribution`);
    }
  }
  function createIntl(config, cache) {
    const formatters = createFormatters(cache);
    const resolvedConfig = {
      ...DEFAULT_INTL_CONFIG,
      ...config
    };
    const { locale, defaultLocale, onError } = resolvedConfig;
    if (!locale) {
      if (onError) {
        onError(new InvalidConfigError(`"locale" was not configured, using "${defaultLocale}" as fallback. See https://formatjs.github.io/docs/react-intl/api#intlshape for more details`));
      }
      resolvedConfig.locale = resolvedConfig.defaultLocale || "en";
    } else if (!Intl.NumberFormat.supportedLocalesOf(locale).length && onError) {
      onError(new MissingDataError(`Missing locale data for locale: "${locale}" in Intl.NumberFormat. Using default locale: "${defaultLocale}" as fallback. See https://formatjs.github.io/docs/react-intl#runtime-requirements for more details`));
    } else if (!Intl.DateTimeFormat.supportedLocalesOf(locale).length && onError) {
      onError(new MissingDataError(`Missing locale data for locale: "${locale}" in Intl.DateTimeFormat. Using default locale: "${defaultLocale}" as fallback. See https://formatjs.github.io/docs/react-intl#runtime-requirements for more details`));
    }
    verifyConfigMessages(resolvedConfig);
    return {
      ...resolvedConfig,
      formatters,
      formatNumber: formatNumber.bind(null, resolvedConfig, formatters.getNumberFormat),
      formatNumberToParts: formatNumberToParts.bind(null, resolvedConfig, formatters.getNumberFormat),
      formatRelativeTime: formatRelativeTime.bind(null, resolvedConfig, formatters.getRelativeTimeFormat),
      formatDate: formatDate.bind(null, resolvedConfig, formatters.getDateTimeFormat),
      formatDateToParts: formatDateToParts.bind(null, resolvedConfig, formatters.getDateTimeFormat),
      formatTime: formatTime.bind(null, resolvedConfig, formatters.getDateTimeFormat),
      formatDateTimeRange: formatDateTimeRange.bind(null, resolvedConfig, formatters.getDateTimeFormat),
      formatTimeToParts: formatTimeToParts.bind(null, resolvedConfig, formatters.getDateTimeFormat),
      formatPlural: formatPlural.bind(null, resolvedConfig, formatters.getPluralRules),
      formatMessage: formatMessage.bind(null, resolvedConfig, formatters),
      $t: formatMessage.bind(null, resolvedConfig, formatters),
      formatList: formatList.bind(null, resolvedConfig, formatters.getListFormat),
      formatListToParts: formatListToParts.bind(null, resolvedConfig, formatters.getListFormat),
      formatDisplayName: formatDisplayName.bind(null, resolvedConfig, formatters.getDisplayNames)
    };
  }

  // packages/react-intl/src/utils.tsx
  function invariant4(condition, message, Err = Error) {
    if (!condition) {
      throw new Err(message);
    }
  }
  function invariantIntlContext(intl) {
    invariant4(
      intl,
      "[React Intl] Could not find required `intl` object. <IntlProvider> needs to exist in the component ancestry."
    );
  }
  var DEFAULT_INTL_CONFIG2 = {
    ...DEFAULT_INTL_CONFIG,
    textComponent: React.Fragment
  };
  var toKeyedReactNodeArray = (children) => {
    const childrenArray = React.Children.toArray(children);
    return childrenArray.map((child, index) => {
      if (React.isValidElement(child)) {
        return React.createElement(React.Fragment, { key: index }, child);
      }
      return child;
    });
  };
  function assignUniqueKeysToParts(formatXMLElementFn) {
    return function(parts) {
      return formatXMLElementFn(toKeyedReactNodeArray(parts));
    };
  }
  function shallowEqual(objA, objB) {
    if (objA === objB) {
      return true;
    }
    if (!objA || !objB) {
      return false;
    }
    var aKeys = Object.keys(objA);
    var bKeys = Object.keys(objB);
    var len = aKeys.length;
    if (bKeys.length !== len) {
      return false;
    }
    for (var i = 0; i < len; i++) {
      var key = aKeys[i];
      if (objA[key] !== objB[key] || !Object.prototype.hasOwnProperty.call(objB, key)) {
        return false;
      }
    }
    return true;
  }

  // packages/react-intl/src/components/context.ts
  var React2 = __toESM(window.React);
  var IntlContext = React2.createContext(
    null
  );
  var Provider = IntlContext.Provider;

  // packages/react-intl/src/components/useIntl.ts
  function useIntl() {
    const intl = React3.useContext(IntlContext);
    invariantIntlContext(intl);
    return intl;
  }

  // packages/react-intl/src/components/createFormattedComponent.tsx
  var DisplayName = /* @__PURE__ */ ((DisplayName2) => {
    DisplayName2["formatDate"] = "FormattedDate";
    DisplayName2["formatTime"] = "FormattedTime";
    DisplayName2["formatNumber"] = "FormattedNumber";
    DisplayName2["formatList"] = "FormattedList";
    DisplayName2["formatDisplayName"] = "FormattedDisplayName";
    return DisplayName2;
  })(DisplayName || {});
  var DisplayNameParts = /* @__PURE__ */ ((DisplayNameParts2) => {
    DisplayNameParts2["formatDate"] = "FormattedDateParts";
    DisplayNameParts2["formatTime"] = "FormattedTimeParts";
    DisplayNameParts2["formatNumber"] = "FormattedNumberParts";
    DisplayNameParts2["formatList"] = "FormattedListParts";
    return DisplayNameParts2;
  })(DisplayNameParts || {});
  var FormattedNumberParts = (props) => {
    const intl = useIntl();
    const { value, children, ...formatProps } = props;
    return children(intl.formatNumberToParts(value, formatProps));
  };
  FormattedNumberParts.displayName = "FormattedNumberParts";
  var FormattedListParts = (props) => {
    const intl = useIntl();
    const { value, children, ...formatProps } = props;
    return children(intl.formatListToParts(value, formatProps));
  };
  FormattedNumberParts.displayName = "FormattedNumberParts";
  function createFormattedDateTimePartsComponent(name) {
    const ComponentParts = (props) => {
      const intl = useIntl();
      const { value, children, ...formatProps } = props;
      const date = typeof value === "string" ? new Date(value || 0) : value;
      const formattedParts = name === "formatDate" ? intl.formatDateToParts(date, formatProps) : intl.formatTimeToParts(date, formatProps);
      return children(formattedParts);
    };
    ComponentParts.displayName = DisplayNameParts[name];
    return ComponentParts;
  }
  function createFormattedComponent(name) {
    const Component = (props) => {
      const intl = useIntl();
      const { value, children, ...formatProps } = props;
      const formattedValue = intl[name](value, formatProps);
      if (typeof children === "function") {
        return children(formattedValue);
      }
      const Text = intl.textComponent || React4.Fragment;
      return React4.createElement(Text, null, formattedValue);
    };
    Component.displayName = DisplayName[name];
    return Component;
  }

  // packages/react-intl/src/components/createIntl.ts
  function assignUniqueKeysToFormatXMLElementFnArgument(values) {
    if (!values) {
      return values;
    }
    return Object.keys(values).reduce((acc, k) => {
      const v = values[k];
      acc[k] = isFormatXMLElementFn(v) ? assignUniqueKeysToParts(v) : v;
      return acc;
    }, {});
  }
  var formatMessage2 = (config, formatters, descriptor, rawValues, ...rest) => {
    const values = assignUniqueKeysToFormatXMLElementFnArgument(rawValues);
    const chunks = formatMessage(
      config,
      formatters,
      descriptor,
      values,
      ...rest
    );
    if (Array.isArray(chunks)) {
      return toKeyedReactNodeArray(chunks);
    }
    return chunks;
  };
  var createIntl2 = ({ defaultRichTextElements: rawDefaultRichTextElements, ...config }, cache) => {
    const defaultRichTextElements = assignUniqueKeysToFormatXMLElementFnArgument(
      rawDefaultRichTextElements
    );
    const coreIntl = createIntl(
      {
        ...DEFAULT_INTL_CONFIG2,
        ...config,
        defaultRichTextElements
      },
      cache
    );
    const resolvedConfig = {
      locale: coreIntl.locale,
      timeZone: coreIntl.timeZone,
      fallbackOnEmptyString: coreIntl.fallbackOnEmptyString,
      formats: coreIntl.formats,
      defaultLocale: coreIntl.defaultLocale,
      defaultFormats: coreIntl.defaultFormats,
      messages: coreIntl.messages,
      onError: coreIntl.onError,
      defaultRichTextElements
    };
    return {
      ...coreIntl,
      formatMessage: formatMessage2.bind(
        null,
        resolvedConfig,
        coreIntl.formatters
      ),
      $t: formatMessage2.bind(null, resolvedConfig, coreIntl.formatters)
    };
  };

  // packages/react-intl/src/components/dateTimeRange.tsx
  var React5 = __toESM(window.React);
  var FormattedDateTimeRange = (props) => {
    const intl = useIntl();
    const { from, to, children, ...formatProps } = props;
    const formattedValue = intl.formatDateTimeRange(from, to, formatProps);
    if (typeof children === "function") {
      return children(formattedValue);
    }
    const Text = intl.textComponent || React5.Fragment;
    return React5.createElement(Text, null, formattedValue);
  };
  FormattedDateTimeRange.displayName = "FormattedDateTimeRange";
  var dateTimeRange_default = FormattedDateTimeRange;

  // packages/react-intl/src/components/message.tsx
  var React6 = __toESM(window.React);
  function areEqual(prevProps, nextProps) {
    const { values, ...otherProps } = prevProps;
    const { values: nextValues, ...nextOtherProps } = nextProps;
    return shallowEqual(nextValues, values) && shallowEqual(otherProps, nextOtherProps);
  }
  function FormattedMessage(props) {
    const intl = useIntl();
    const { formatMessage: formatMessage3, textComponent: Text = React6.Fragment } = intl;
    const {
      id,
      description,
      defaultMessage,
      values,
      children,
      tagName: Component = Text,
      ignoreTag
    } = props;
    const descriptor = { id, description, defaultMessage };
    const nodes = formatMessage3(descriptor, values, {
      ignoreTag
    });
    if (typeof children === "function") {
      return children(Array.isArray(nodes) ? nodes : [nodes]);
    }
    if (Component) {
      return React6.createElement(Component, null, nodes);
    }
    return React6.createElement(React6.Fragment, null, nodes);
  }
  FormattedMessage.displayName = "FormattedMessage";
  var MemoizedFormattedMessage = React6.memo(
    FormattedMessage,
    areEqual
  );
  MemoizedFormattedMessage.displayName = "MemoizedFormattedMessage";
  var message_default = MemoizedFormattedMessage;

  // packages/react-intl/src/components/plural.tsx
  var React7 = __toESM(window.React);
  var FormattedPlural = (props) => {
    const { formatPlural: formatPlural2, textComponent: Text } = useIntl();
    const { value, other, children } = props;
    const pluralCategory = formatPlural2(value, props);
    const formattedPlural = props[pluralCategory] || other;
    if (typeof children === "function") {
      return children(formattedPlural);
    }
    if (Text) {
      return React7.createElement(Text, null, formattedPlural);
    }
    return formattedPlural;
  };
  FormattedPlural.displayName = "FormattedPlural";
  var plural_default = FormattedPlural;

  // packages/react-intl/src/components/provider.tsx
  var React8 = __toESM(window.React);
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
    const cacheRef = React8.useRef(createIntlCache());
    const prevConfigRef = React8.useRef(void 0);
    const intlRef = React8.useRef(void 0);
    const filteredProps = {};
    for (const key in props) {
      if (props[key] !== void 0) {
        filteredProps[key] = props[key];
      }
    }
    const config = processIntlConfig({
      ...DEFAULT_INTL_CONFIG2,
      ...filteredProps
    });
    if (!prevConfigRef.current || !shallowEqual(prevConfigRef.current, config)) {
      prevConfigRef.current = config;
      intlRef.current = createIntl2(config, cacheRef.current);
    }
    invariantIntlContext(intlRef.current);
    return React8.createElement(Provider, { value: intlRef.current }, props.children);
  }
  IntlProviderImpl.displayName = "IntlProvider";
  var IntlProvider = IntlProviderImpl;
  var provider_default = IntlProvider;

  // packages/react-intl/src/components/relative.tsx
  var React9 = __toESM(window.React);
  var MINUTE = 60;
  var HOUR = 60 * 60;
  var DAY = 60 * 60 * 24;
  function selectUnit(seconds) {
    const absValue = Math.abs(seconds);
    if (absValue < MINUTE) {
      return "second";
    }
    if (absValue < HOUR) {
      return "minute";
    }
    if (absValue < DAY) {
      return "hour";
    }
    return "day";
  }
  function getDurationInSeconds(unit) {
    switch (unit) {
      case "second":
        return 1;
      case "minute":
        return MINUTE;
      case "hour":
        return HOUR;
      default:
        return DAY;
    }
  }
  function valueToSeconds(value, unit) {
    if (!value) {
      return 0;
    }
    switch (unit) {
      case "second":
        return value;
      case "minute":
        return value * MINUTE;
      default:
        return value * HOUR;
    }
  }
  var INCREMENTABLE_UNITS = [
    "second",
    "minute",
    "hour"
  ];
  function canIncrement(unit = "second") {
    return INCREMENTABLE_UNITS.indexOf(unit) > -1;
  }
  var SimpleFormattedRelativeTime = (props) => {
    const { formatRelativeTime: formatRelativeTime2, textComponent: Text } = useIntl();
    const { children, value, unit, ...otherProps } = props;
    const formattedRelativeTime = formatRelativeTime2(value || 0, unit, otherProps);
    if (typeof children === "function") {
      return children(formattedRelativeTime);
    }
    if (Text) {
      return React9.createElement(Text, null, formattedRelativeTime);
    }
    return React9.createElement(React9.Fragment, null, formattedRelativeTime);
  };
  var FormattedRelativeTime = ({
    value = 0,
    unit = "second",
    updateIntervalInSeconds,
    ...otherProps
  }) => {
    invariant4(
      !updateIntervalInSeconds || !!(updateIntervalInSeconds && canIncrement(unit)),
      "Cannot schedule update with unit longer than hour"
    );
    const [prevUnit, setPrevUnit] = React9.useState();
    const [prevValue, setPrevValue] = React9.useState(0);
    const [currentValueInSeconds, setCurrentValueInSeconds] = React9.useState(0);
    const updateTimer = React9.useRef(void 0);
    if (unit !== prevUnit || value !== prevValue) {
      setPrevValue(value || 0);
      setPrevUnit(unit);
      setCurrentValueInSeconds(
        canIncrement(unit) ? valueToSeconds(value, unit) : 0
      );
    }
    React9.useEffect(() => {
      function clearUpdateTimer() {
        clearTimeout(updateTimer.current);
      }
      clearUpdateTimer();
      if (!updateIntervalInSeconds || !canIncrement(unit)) {
        return clearUpdateTimer;
      }
      const nextValueInSeconds = currentValueInSeconds - updateIntervalInSeconds;
      const nextUnit = selectUnit(nextValueInSeconds);
      if (nextUnit === "day") {
        return clearUpdateTimer;
      }
      const unitDuration = getDurationInSeconds(nextUnit);
      const remainder = nextValueInSeconds % unitDuration;
      const prevInterestingValueInSeconds = nextValueInSeconds - remainder;
      const nextInterestingValueInSeconds = prevInterestingValueInSeconds >= currentValueInSeconds ? prevInterestingValueInSeconds - unitDuration : prevInterestingValueInSeconds;
      const delayInSeconds = Math.abs(
        nextInterestingValueInSeconds - currentValueInSeconds
      );
      if (currentValueInSeconds !== nextInterestingValueInSeconds) {
        updateTimer.current = setTimeout(
          () => setCurrentValueInSeconds(nextInterestingValueInSeconds),
          delayInSeconds * 1e3
        );
      }
      return clearUpdateTimer;
    }, [currentValueInSeconds, updateIntervalInSeconds, unit]);
    let currentValue = value || 0;
    let currentUnit = unit;
    if (canIncrement(unit) && typeof currentValueInSeconds === "number" && updateIntervalInSeconds) {
      currentUnit = selectUnit(currentValueInSeconds);
      const unitDuration = getDurationInSeconds(currentUnit);
      currentValue = Math.round(currentValueInSeconds / unitDuration);
    }
    return React9.createElement(
      SimpleFormattedRelativeTime,
      {
        value: currentValue,
        unit: currentUnit,
        ...otherProps
      }
    );
  };
  FormattedRelativeTime.displayName = "FormattedRelativeTime";
  var relative_default = FormattedRelativeTime;

  // packages/react-intl/index.ts
  function defineMessages(msgs) {
    return msgs;
  }
  function defineMessage(msg) {
    return msg;
  }
  var FormattedDate = createFormattedComponent("formatDate");
  var FormattedTime = createFormattedComponent("formatTime");
  var FormattedNumber = createFormattedComponent("formatNumber");
  var FormattedList = createFormattedComponent("formatList");
  var FormattedDisplayName = createFormattedComponent("formatDisplayName");
  var FormattedDateParts = createFormattedDateTimePartsComponent("formatDate");
  var FormattedTimeParts = createFormattedDateTimePartsComponent("formatTime");
  return __toCommonJS(react_intl_exports);
})();
//# sourceMappingURL=react-intl.esbuild.iife.js.map
