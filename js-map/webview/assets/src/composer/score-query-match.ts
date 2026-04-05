const MAX_CAMEL_HUMP_MATCHING_LENGTH = 100;
const MIN_MATCHING_DEGREE = -2147483648;
const UNIVERSAL_SEPARATOR = "\u0000";
const FILE_PATH_SEPARATORS = ["/", "\\"];
const START_MATCH_WEIGHT = 10000;

type MatchingMode = "IGNORE_CASE" | "FIRST_LETTER" | "MATCH_CASE";

type MatchedFragment = {
  startOffset: number;
  endOffset: number;
};

class MatcherWithFallback {
  private readonly mainMatcher: MinusculeMatcher;
  private readonly fallbackMatcher: MinusculeMatcher | null;

  constructor(
    mainMatcher: MinusculeMatcher,
    fallbackMatcher: MinusculeMatcher | null,
  ) {
    this.mainMatcher = mainMatcher;
    this.fallbackMatcher = fallbackMatcher;
  }

  matchingDegree(name: string): number {
    const mainFragments = this.mainMatcher.match(name);
    if (mainFragments != null) {
      const degree = this.mainMatcher.matchingDegree(
        name,
        false,
        mainFragments,
      );
      return applyStartMatchBonus(degree, mainFragments);
    }

    if (this.fallbackMatcher == null) {
      return MIN_MATCHING_DEGREE;
    }

    const fallbackFragments = this.fallbackMatcher.match(name);
    if (fallbackFragments == null) {
      return MIN_MATCHING_DEGREE;
    }
    const fallbackDegree = this.fallbackMatcher.matchingDegree(
      name,
      false,
      fallbackFragments,
    );
    return applyStartMatchBonus(fallbackDegree, fallbackFragments);
  }
}

class MinusculeMatcher {
  private readonly myPattern: Array<string>;
  private readonly isLowerCase: Array<boolean>;
  private readonly isUpperCase: Array<boolean>;
  private readonly isWordSeparator: Array<boolean>;
  private readonly toUpperCase: Array<string>;
  private readonly toLowerCase: Array<string>;
  private readonly hardSeparators: Array<string>;
  private readonly matchingMode: MatchingMode;
  private readonly mixedCase: boolean;
  private readonly hasSeparators: boolean;
  private readonly hasDots: boolean;
  private readonly meaningfulCharacters: Array<string>;
  private readonly minNameLength: number;

  constructor(
    pattern: string,
    matchingMode: MatchingMode,
    hardSeparators: string,
  ) {
    const trimmedPattern = pattern.endsWith("* ")
      ? pattern.slice(0, -2)
      : pattern;

    this.myPattern = Array.from(trimmedPattern);
    this.isLowerCase = Array.from(
      { length: this.myPattern.length },
      () => false,
    );
    this.isUpperCase = Array.from(
      { length: this.myPattern.length },
      () => false,
    );
    this.isWordSeparator = Array.from(
      { length: this.myPattern.length },
      () => false,
    );
    this.toUpperCase = Array.from({ length: this.myPattern.length }, () => "");
    this.toLowerCase = Array.from({ length: this.myPattern.length }, () => "");
    this.hardSeparators = Array.from(hardSeparators);
    this.matchingMode = matchingMode;

    const meaningful: Array<string> = [];
    let seenNonWildcard = false;
    let seenLowerCase = false;
    let seenUpperCaseNotImmediatelyAfterWildcard = false;
    let hasDots = false;
    let hasSeparators = false;

    for (let k = 0; k < this.myPattern.length; k += 1) {
      const c = this.myPattern[k];
      const wordSeparator = isWordSeparator(c);
      const upper = isUpperChar(c);
      const lower = isLowerChar(c);
      const toUpper = c.toUpperCase();
      const toLower = c.toLowerCase();

      if (lower) {
        seenLowerCase = true;
      }
      if (c === ".") {
        hasDots = true;
      }
      if (seenNonWildcard && upper) {
        seenUpperCaseNotImmediatelyAfterWildcard = true;
      }
      if (!isWildcardChar(c)) {
        seenNonWildcard = true;
        meaningful.push(toLower);
        meaningful.push(toUpper);
      }
      if (seenNonWildcard && wordSeparator) {
        hasSeparators = true;
      }

      this.isWordSeparator[k] = wordSeparator;
      this.isUpperCase[k] = upper;
      this.isLowerCase[k] = lower;
      this.toUpperCase[k] = toUpper;
      this.toLowerCase[k] = toLower;
    }

    this.hasDots = hasDots;
    this.mixedCase = seenLowerCase && seenUpperCaseNotImmediatelyAfterWildcard;
    this.hasSeparators = hasSeparators;
    this.meaningfulCharacters = meaningful;
    this.minNameLength = meaningful.length / 2;
  }

  get pattern(): string {
    return this.myPattern.join("");
  }

  matchingDegree(
    name: string,
    valueStartCaseMatch = false,
    fragments: Array<MatchedFragment> | null = this.match(name),
  ): number {
    if (fragments == null) {
      return MIN_MATCHING_DEGREE;
    }
    if (fragments.length === 0) {
      return 0;
    }

    const first = fragments[0];
    const startMatch = first.startOffset === 0;
    const valuedStartMatch = startMatch && valueStartCaseMatch;

    let matchingCase = 0;
    let patternIndex = -1;
    let skippedHumps = 0;
    let nextHumpStart = 0;
    let humpStartMatchedUpperCase = false;

    for (const range of fragments) {
      for (let i = range.startOffset; i < range.endOffset; i += 1) {
        const afterGap = i === range.startOffset && range !== first;
        let isHumpStart = false;
        while (nextHumpStart <= i) {
          if (nextHumpStart === i) {
            isHumpStart = true;
          } else if (afterGap) {
            skippedHumps += 1;
          }
          nextHumpStart = nextWord(name, nextHumpStart);
        }

        const c = name[i];
        patternIndex = indexOfPatternChar(
          this.myPattern,
          c,
          patternIndex + 1,
          this.myPattern.length,
          true,
        );
        if (patternIndex < 0) {
          break;
        }

        if (isHumpStart) {
          humpStartMatchedUpperCase =
            c === this.myPattern[patternIndex] &&
            this.isUpperCase[patternIndex];
        }

        matchingCase += this.evaluateCaseMatching(
          valuedStartMatch,
          patternIndex,
          humpStartMatchedUpperCase,
          i,
          afterGap,
          isHumpStart,
          c,
        );
      }
    }

    const startIndex = first.startOffset;
    const afterSeparator =
      indexOfAny(name, this.hardSeparators, 0, startIndex) >= 0;
    const wordStart =
      startIndex === 0 ||
      (isWordStart(name, startIndex) && !isWordStart(name, startIndex - 1));
    const finalMatch =
      fragments[fragments.length - 1].endOffset === name.length;

    return (
      (wordStart ? 1000 : 0) +
      matchingCase -
      fragments.length +
      -skippedHumps * 10 +
      (afterSeparator ? 0 : 2) +
      (startMatch ? 1 : 0) +
      (finalMatch ? 1 : 0)
    );
  }

  match(name: string): Array<MatchedFragment> | null {
    if (name.length < this.minNameLength) {
      return null;
    }

    if (this.myPattern.length > MAX_CAMEL_HUMP_MATCHING_LENGTH) {
      return this.matchBySubstring(name);
    }

    let patternIndex = 0;
    for (
      let i = 0;
      i < name.length && patternIndex < this.meaningfulCharacters.length;
      i += 1
    ) {
      const c = name[i];
      if (
        c === this.meaningfulCharacters[patternIndex] ||
        c === this.meaningfulCharacters[patternIndex + 1]
      ) {
        patternIndex += 2;
      }
    }
    if (patternIndex < this.minNameLength * 2) {
      return null;
    }

    const ranges = this.matchWildcards(name, 0, 0);
    if (ranges == null) {
      return null;
    }

    return ranges.reverse();
  }

  private evaluateCaseMatching(
    valuedStartMatch: boolean,
    patternIndex: number,
    humpStartMatchedUpperCase: boolean,
    nameIndex: number,
    afterGap: boolean,
    isHumpStart: boolean,
    nameChar: string,
  ): number {
    if (afterGap && isHumpStart && this.isLowerCase[patternIndex]) {
      return -10;
    }

    if (nameChar === this.myPattern[patternIndex]) {
      if (this.isUpperCase[patternIndex]) {
        return 50;
      }
      if (nameIndex === 0 && valuedStartMatch) {
        return 150;
      }
      if (isHumpStart) {
        return 1;
      }
      return 0;
    }

    if (isHumpStart) {
      return -1;
    }
    if (this.isLowerCase[patternIndex] && humpStartMatchedUpperCase) {
      return -1;
    }
    return 0;
  }

  private matchBySubstring(name: string): Array<MatchedFragment> | null {
    const infix = this.isPatternChar(0, "*");
    const patternWithoutWildChar = filterWildcard(this.myPattern);
    if (name.length < patternWithoutWildChar.length) {
      return null;
    }
    if (infix) {
      const index = indexOfIgnoreCase(
        name,
        patternWithoutWildChar,
        0,
        name.length,
      );
      if (index >= 0) {
        return [
          {
            startOffset: index,
            endOffset: index + patternWithoutWildChar.length,
          },
        ];
      }
      return null;
    }

    if (
      regionMatches(
        name,
        0,
        patternWithoutWildChar.length,
        patternWithoutWildChar,
      )
    ) {
      return [
        {
          startOffset: 0,
          endOffset: patternWithoutWildChar.length,
        },
      ];
    }
    return null;
  }

  private matchWildcards(
    name: string,
    patternIndex: number,
    nameIndex: number,
  ): Array<MatchedFragment> | null {
    let localPatternIndex = patternIndex;
    if (nameIndex < 0) {
      return null;
    }

    if (!this.isWildcard(localPatternIndex)) {
      if (localPatternIndex === this.myPattern.length) {
        return [];
      }
      return this.matchFragment(name, localPatternIndex, nameIndex);
    }

    do {
      localPatternIndex += 1;
    } while (this.isWildcard(localPatternIndex));

    if (localPatternIndex === this.myPattern.length) {
      if (
        this.isTrailingSpacePattern() &&
        nameIndex !== name.length &&
        (localPatternIndex < 2 ||
          !this.isUpperCaseOrDigit(localPatternIndex - 2))
      ) {
        const spaceIndex = name.indexOf(" ", nameIndex);
        if (spaceIndex >= 0) {
          return [
            {
              startOffset: spaceIndex,
              endOffset: spaceIndex + 1,
            },
          ];
        }
        return null;
      }
      return [];
    }

    return this.matchSkippingWords(
      name,
      localPatternIndex,
      this.findNextPatternCharOccurrence(name, nameIndex, localPatternIndex),
      true,
    );
  }

  private isTrailingSpacePattern(): boolean {
    return this.isPatternChar(this.myPattern.length - 1, " ");
  }

  private isUpperCaseOrDigit(patternIndex: number): boolean {
    return (
      this.isUpperCase[patternIndex] || isDigit(this.myPattern[patternIndex])
    );
  }

  private matchSkippingWords(
    name: string,
    patternIndex: number,
    nameIndex: number,
    allowSpecialChars: boolean,
  ): Array<MatchedFragment> | null {
    let localNameIndex = nameIndex;
    let maxFoundLength = 0;
    while (localNameIndex >= 0) {
      const fragmentLength = this.seemsLikeFragmentStart(
        name,
        patternIndex,
        localNameIndex,
      )
        ? this.maxMatchingFragment(name, patternIndex, localNameIndex)
        : 0;

      if (
        fragmentLength > maxFoundLength ||
        (localNameIndex + fragmentLength === name.length &&
          this.isTrailingSpacePattern())
      ) {
        if (!this.isMiddleMatch(name, patternIndex, localNameIndex)) {
          maxFoundLength = fragmentLength;
        }
        const ranges = this.matchInsideFragment(
          name,
          patternIndex,
          localNameIndex,
          fragmentLength,
        );
        if (ranges != null) {
          return ranges;
        }
      }

      const next = this.findNextPatternCharOccurrence(
        name,
        localNameIndex + 1,
        patternIndex,
      );
      if (allowSpecialChars) {
        localNameIndex = next;
      } else {
        localNameIndex = this.checkForSpecialChars(
          name,
          localNameIndex + 1,
          next,
          patternIndex,
        );
      }
    }
    return null;
  }

  private findNextPatternCharOccurrence(
    name: string,
    startAt: number,
    patternIndex: number,
  ): number {
    if (
      !this.isPatternChar(patternIndex - 1, "*") &&
      !this.isWordSeparator[patternIndex]
    ) {
      return this.indexOfWordStart(name, patternIndex, startAt);
    }
    return this.indexOfIgnoreCase(name, startAt, patternIndex);
  }

  private checkForSpecialChars(
    name: string,
    start: number,
    end: number,
    patternIndex: number,
  ): number {
    if (end < 0) {
      return -1;
    }

    if (
      !this.hasSeparators &&
      !this.mixedCase &&
      indexOfAny(name, this.hardSeparators, start, end) !== -1
    ) {
      return -1;
    }

    if (
      this.hasDots &&
      !this.isPatternChar(patternIndex - 1, ".") &&
      indexOfChar(name, ".", start, end) !== -1
    ) {
      return -1;
    }

    return end;
  }

  private seemsLikeFragmentStart(
    name: string,
    patternIndex: number,
    nextOccurrence: number,
  ): boolean {
    if (!this.isUpperCase[patternIndex]) {
      return true;
    }

    if (isUpperChar(name[nextOccurrence])) {
      return true;
    }

    if (isWordStart(name, nextOccurrence)) {
      return true;
    }

    return !this.mixedCase && this.matchingMode !== "MATCH_CASE";
  }

  private charEquals(
    patternChar: string,
    patternIndex: number,
    c: string,
    ignoreCase: boolean,
  ): boolean {
    if (patternChar === c) {
      return true;
    }
    if (!ignoreCase) {
      return false;
    }
    return (
      this.toLowerCase[patternIndex] === c ||
      this.toUpperCase[patternIndex] === c
    );
  }

  private matchFragment(
    name: string,
    patternIndex: number,
    nameIndex: number,
  ): Array<MatchedFragment> | null {
    const fragmentLength = this.maxMatchingFragment(
      name,
      patternIndex,
      nameIndex,
    );
    if (fragmentLength === 0) {
      return null;
    }
    return this.matchInsideFragment(
      name,
      patternIndex,
      nameIndex,
      fragmentLength,
    );
  }

  private maxMatchingFragment(
    name: string,
    patternIndex: number,
    nameIndex: number,
  ): number {
    if (!this.isFirstCharMatching(name, nameIndex, patternIndex)) {
      return 0;
    }

    let i = 1;
    const ignoreCase = this.matchingMode !== "MATCH_CASE";
    while (
      nameIndex + i < name.length &&
      patternIndex + i < this.myPattern.length
    ) {
      const nameChar = name[nameIndex + i];
      if (
        !this.charEquals(
          this.myPattern[patternIndex + i],
          patternIndex + i,
          nameChar,
          ignoreCase,
        )
      ) {
        if (
          this.isSkippingDigitBetweenPatternDigits(patternIndex + i, nameChar)
        ) {
          return 0;
        }
        break;
      }
      i += 1;
    }
    return i;
  }

  private isSkippingDigitBetweenPatternDigits(
    patternIndex: number,
    nameChar: string,
  ): boolean {
    return (
      isDigit(this.myPattern[patternIndex]) &&
      isDigit(this.myPattern[patternIndex - 1]) &&
      isDigit(nameChar)
    );
  }

  private matchInsideFragment(
    name: string,
    patternIndex: number,
    nameIndex: number,
    fragmentLength: number,
  ): Array<MatchedFragment> | null {
    const minFragment = this.isMiddleMatch(name, patternIndex, nameIndex)
      ? 3
      : 1;
    const camelHumpRanges = this.improveCamelHumps(
      name,
      patternIndex,
      nameIndex,
      fragmentLength,
      minFragment,
    );
    if (camelHumpRanges != null) {
      return camelHumpRanges;
    }

    return this.findLongestMatchingPrefix(
      name,
      patternIndex,
      nameIndex,
      fragmentLength,
      minFragment,
    );
  }

  private isMiddleMatch(
    name: string,
    patternIndex: number,
    nameIndex: number,
  ): boolean {
    if (!this.isPatternChar(patternIndex - 1, "*")) {
      return false;
    }
    if (this.isWildcard(patternIndex + 1)) {
      return false;
    }
    if (!isLetterOrDigit(name[nameIndex])) {
      return false;
    }
    return !isWordStart(name, nameIndex);
  }

  private findLongestMatchingPrefix(
    name: string,
    patternIndex: number,
    nameIndex: number,
    fragmentLength: number,
    minFragment: number,
  ): Array<MatchedFragment> | null {
    if (patternIndex + fragmentLength >= this.myPattern.length) {
      return [
        {
          startOffset: nameIndex,
          endOffset: nameIndex + fragmentLength,
        },
      ];
    }

    let i = fragmentLength;
    while (i >= minFragment || (i > 0 && this.isWildcard(patternIndex + i))) {
      let ranges: Array<MatchedFragment> | null = null;
      if (this.isWildcard(patternIndex + i)) {
        ranges = this.matchWildcards(name, patternIndex + i, nameIndex + i);
      } else {
        let nextOccurrence = this.findNextPatternCharOccurrence(
          name,
          nameIndex + i + 1,
          patternIndex + i,
        );
        nextOccurrence = this.checkForSpecialChars(
          name,
          nameIndex + i,
          nextOccurrence,
          patternIndex + i,
        );
        if (nextOccurrence >= 0) {
          ranges = this.matchSkippingWords(
            name,
            patternIndex + i,
            nextOccurrence,
            false,
          );
        }
      }
      if (ranges != null) {
        return appendRange(ranges, nameIndex, i);
      }
      i -= 1;
    }
    return null;
  }

  private improveCamelHumps(
    name: string,
    patternIndex: number,
    nameIndex: number,
    maxFragment: number,
    minFragment: number,
  ): Array<MatchedFragment> | null {
    for (let i = minFragment; i < maxFragment; i += 1) {
      if (
        this.isUppercasePatternVsLowercaseNameChar(
          name,
          patternIndex + i,
          nameIndex + i,
        )
      ) {
        const ranges = this.findUppercaseMatchFurther(
          name,
          patternIndex + i,
          nameIndex + i,
        );
        if (ranges != null) {
          return appendRange(ranges, nameIndex, i);
        }
      }
    }
    return null;
  }

  private isUppercasePatternVsLowercaseNameChar(
    name: string,
    patternIndex: number,
    nameIndex: number,
  ): boolean {
    return (
      this.isUpperCase[patternIndex] &&
      this.myPattern[patternIndex] !== name[nameIndex]
    );
  }

  private findUppercaseMatchFurther(
    name: string,
    patternIndex: number,
    nameIndex: number,
  ): Array<MatchedFragment> | null {
    const nextWordStart = this.indexOfWordStart(name, patternIndex, nameIndex);
    return this.matchWildcards(name, patternIndex, nextWordStart);
  }

  private isFirstCharMatching(
    name: string,
    nameIndex: number,
    patternIndex: number,
  ): boolean {
    if (nameIndex >= name.length) {
      return false;
    }

    const ignoreCase = this.matchingMode !== "MATCH_CASE";
    const patternChar = this.myPattern[patternIndex];
    if (
      !this.charEquals(patternChar, patternIndex, name[nameIndex], ignoreCase)
    ) {
      return false;
    }

    if (this.matchingMode !== "FIRST_LETTER") {
      return true;
    }

    if (patternIndex === 0 || (patternIndex === 1 && this.isWildcard(0))) {
      if (this.hasCase(patternIndex)) {
        return this.isUpperCase[patternIndex] === isUpperChar(name[0]);
      }
    }
    return true;
  }

  private hasCase(patternIndex: number): boolean {
    return this.isUpperCase[patternIndex] || this.isLowerCase[patternIndex];
  }

  private isWildcard(patternIndex: number): boolean {
    return (
      patternIndex >= 0 &&
      patternIndex < this.myPattern.length &&
      isWildcardChar(this.myPattern[patternIndex])
    );
  }

  private isPatternChar(patternIndex: number, c: string): boolean {
    if (patternIndex < 0 || patternIndex >= this.myPattern.length) {
      return false;
    }
    return this.myPattern[patternIndex] === c;
  }

  private indexOfWordStart(
    name: string,
    patternIndex: number,
    startFrom: number,
  ): number {
    const p = this.myPattern[patternIndex];
    if (
      startFrom >= name.length ||
      (this.mixedCase &&
        this.isLowerCase[patternIndex] &&
        !(patternIndex > 0 && this.isWordSeparator[patternIndex - 1]))
    ) {
      return -1;
    }

    let i = startFrom;
    const isSpecialSymbol = !isLetterOrDigit(p);
    while (true) {
      i = this.indexOfIgnoreCase(name, i, patternIndex);
      if (i < 0) {
        return -1;
      }
      if (isSpecialSymbol || isWordStart(name, i)) {
        return i;
      }
      i += 1;
    }
  }

  private indexOfIgnoreCase(
    name: string,
    fromIndex: number,
    patternIndex: number,
  ): number {
    const p = this.myPattern[patternIndex];
    if (isAscii(p)) {
      const pUpper = this.toUpperCase[patternIndex];
      const pLower = this.toLowerCase[patternIndex];
      for (let i = fromIndex; i < name.length; i += 1) {
        const c = name[i];
        if (c === pUpper || c === pLower) {
          return i;
        }
      }
      return -1;
    }
    return indexOfChar(name, p, fromIndex, name.length);
  }
}

export function scoreQueryMatch(str: string, query: string): number {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) {
    return 0;
  }

  const matcher = createMatcher(trimmedQuery);
  const normalizedName = queryHasSeparator(trimmedQuery)
    ? normalizeName(str)
    : str;
  const degree = matcher.matchingDegree(normalizedName);
  if (degree === MIN_MATCHING_DEGREE) {
    return 0;
  }
  const adjustedDegree = degree * 10 - str.length;
  if (adjustedDegree <= 0) {
    return 1;
  }
  return adjustedDegree;
}

function createMatcher(pattern: string): MatcherWithFallback {
  const hasSeparator = queryHasSeparator(pattern);
  const mainPattern = hasSeparator ? normalizePattern(pattern) : `*${pattern}`;
  const fallbackPattern = getNamePattern(pattern);
  const mainMatcher = new MinusculeMatcher(
    mainPattern,
    "IGNORE_CASE",
    FILE_PATH_SEPARATORS.join(""),
  );
  const fallbackMatcher =
    hasSeparator && pattern !== fallbackPattern
      ? new MinusculeMatcher(
          fallbackPattern,
          "IGNORE_CASE",
          FILE_PATH_SEPARATORS.join(""),
        )
      : null;

  return new MatcherWithFallback(mainMatcher, fallbackMatcher);
}

function normalizePattern(pattern: string): string {
  let fullPattern = `*${pattern}`;
  for (const separator of FILE_PATH_SEPARATORS) {
    fullPattern = fullPattern.split(separator).join(`*${UNIVERSAL_SEPARATOR}*`);
  }
  return fullPattern;
}

function getNamePattern(pattern: string): string {
  let lastSeparatorIndex = -1;
  for (const separator of FILE_PATH_SEPARATORS) {
    const index = pattern.lastIndexOf(separator);
    if (index >= 0 && index < pattern.length - 1) {
      lastSeparatorIndex = Math.max(lastSeparatorIndex, index);
    }
  }
  return pattern.slice(lastSeparatorIndex + 1);
}

function normalizeName(name: string): string {
  let normalized = name;
  for (const separator of FILE_PATH_SEPARATORS) {
    normalized = normalized.split(separator).join(UNIVERSAL_SEPARATOR);
  }
  return normalized;
}

function queryHasSeparator(query: string): boolean {
  for (const separator of FILE_PATH_SEPARATORS) {
    if (query.includes(separator)) {
      return true;
    }
  }
  return false;
}

function applyStartMatchBonus(
  degree: number,
  fragments: Array<MatchedFragment>,
): number {
  if (fragments.length === 0) {
    return degree;
  }
  if (fragments[0].startOffset === 0) {
    return degree + START_MATCH_WEIGHT;
  }
  return degree;
}

function isWordSeparator(c: string): boolean {
  return (
    c.trim().length === 0 ||
    c === "_" ||
    c === "-" ||
    c === ":" ||
    c === "+" ||
    c === "." ||
    c === "/" ||
    c === "\\"
  );
}

function nextWord(name: string, start: number): number {
  if (start < name.length && isDigit(name[start])) {
    return start + 1;
  }
  return nextWordStart(name, start);
}

function nextWordStart(name: string, start: number): number {
  for (let i = start + 1; i <= name.length; i += 1) {
    if (i >= name.length) {
      return name.length + 1;
    }
    if (isWordStart(name, i)) {
      return i;
    }
  }
  return name.length + 1;
}

function isWordStart(name: string, index: number): boolean {
  if (index < 0 || index >= name.length) {
    return false;
  }
  const c = name[index];
  if (!isLetterOrDigit(c)) {
    return false;
  }
  if (index === 0) {
    return true;
  }
  const prev = name[index - 1];
  if (!isLetterOrDigit(prev)) {
    return true;
  }
  if (isUpperChar(c) && isLowerChar(prev)) {
    return true;
  }
  if (isDigit(c) && !isDigit(prev)) {
    return true;
  }
  return false;
}

function indexOfPatternChar(
  pattern: Array<string>,
  c: string,
  start: number,
  end: number,
  ignoreCase: boolean,
): number {
  if (!ignoreCase) {
    for (let i = start; i < end; i += 1) {
      if (pattern[i] === c) {
        return i;
      }
    }
    return -1;
  }

  const lower = c.toLowerCase();
  const upper = c.toUpperCase();
  for (let i = start; i < end; i += 1) {
    const pc = pattern[i];
    if (pc === lower || pc === upper) {
      return i;
    }
  }
  return -1;
}

function isWildcardChar(pc: string): boolean {
  return pc === " " || pc === "*";
}

function indexOfAny(
  name: string,
  chars: Array<string>,
  start: number,
  end: number,
): number {
  for (let i = start; i < end; i += 1) {
    if (chars.includes(name[i])) {
      return i;
    }
  }
  return -1;
}

function indexOfChar(
  name: string,
  c: string,
  start: number,
  end: number,
): number {
  for (let i = start; i < end; i += 1) {
    if (name[i] === c) {
      return i;
    }
  }
  return -1;
}

function indexOfIgnoreCase(
  name: string,
  needle: string,
  start: number,
  end: number,
): number {
  const lowerName = name.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const index = lowerName.indexOf(lowerNeedle, start);
  if (index < 0) {
    return -1;
  }
  if (index + needle.length > end) {
    return -1;
  }
  return index;
}

function regionMatches(
  name: string,
  nameOffset: number,
  length: number,
  pattern: string,
): boolean {
  if (nameOffset + length > name.length) {
    return false;
  }
  const part = name.slice(nameOffset, nameOffset + length);
  return part.toLowerCase() === pattern.toLowerCase();
}

function filterWildcard(source: Array<string>): string {
  let result = "";
  for (const c of source) {
    if (c !== "*") {
      result += c;
    }
  }
  return result;
}

function appendRange(
  ranges: Array<MatchedFragment>,
  from: number,
  length: number,
): Array<MatchedFragment> {
  if (ranges.length === 0) {
    return [
      {
        startOffset: from,
        endOffset: from + length,
      },
    ];
  }

  const last = ranges[ranges.length - 1];
  if (last.startOffset === from + length) {
    ranges[ranges.length - 1] = {
      startOffset: from,
      endOffset: last.endOffset,
    };
  } else {
    ranges.push({
      startOffset: from,
      endOffset: from + length,
    });
  }
  return ranges;
}

function isAscii(value: string): boolean {
  return value.length === 1 && value.charCodeAt(0) <= 127;
}

function isUpperChar(value: string): boolean {
  return value.toUpperCase() === value && value.toLowerCase() !== value;
}

function isLowerChar(value: string): boolean {
  return value.toLowerCase() === value && value.toUpperCase() !== value;
}

function isDigit(value: string): boolean {
  return value >= "0" && value <= "9";
}

function isLetterOrDigit(value: string): boolean {
  return /[a-z0-9]/i.test(value);
}
