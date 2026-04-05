import type { ConversationSearchLocation, DiffSearchLocation } from "./types";

export const CONTENT_SEARCH_MATCH_CLASS = "codex-thread-find-match";
export const CONTENT_SEARCH_ACTIVE_CLASS = "codex-thread-find-active";
export const CONTENT_SEARCH_MATCH_ID_ATTRIBUTE = "data-content-search-match-id";

const SHADOW_FIND_STYLE_ID = "codex-thread-find-shadow-style";
const SHADOW_FIND_STYLES = `
mark.codex-thread-find-match {
  background-color: var(--vscode-charts-yellow);
  color: var(--color-token-foreground);
  border-radius: var(--radius-2xs);
  padding: 0;
  margin: 0;
  border: 0;
  font: inherit;
  line-height: inherit;
  letter-spacing: inherit;
  word-spacing: inherit;
  vertical-align: baseline;
}

mark.codex-thread-find-active {
  background-color: var(--vscode-charts-orange);
}
`;

type HighlightRoot = HTMLElement | ShadowRoot;

type HighlightRootOptions = {
  includeShadowRoots: boolean;
};

type HighlightResult = {
  matches: Array<HTMLElement>;
  isCapped: boolean;
};

export function createConversationSearchUnitKey(
  turnKey: string,
  unitId: string,
): string {
  return `${turnKey}:${unitId}`;
}

export function createConversationSearchMatchId(
  location: Pick<ConversationSearchLocation, "turnKey" | "unitId" | "start">,
): string {
  return `conversation:${location.turnKey}:${location.unitId}:${location.start}`;
}

export function createDiffSearchMatchId(
  location: Pick<DiffSearchLocation, "path" | "hunkId" | "start">,
): string {
  return `diff:${location.path}:${location.hunkId}:${location.start}`;
}

export function setSearchMatchElementId({
  element,
  matchId,
}: {
  element: HTMLElement;
  matchId: string;
}): void {
  element.setAttribute(CONTENT_SEARCH_MATCH_ID_ATTRIBUTE, matchId);
}

export function findSearchMatchElement({
  container,
  matchId,
  includeShadowRoots,
}: {
  container: HTMLElement;
  matchId: string;
  includeShadowRoots: boolean;
}): HTMLElement | null {
  const escapedMatchId = escapeForAttributeSelector(matchId);
  for (const root of collectHighlightRoots(container, { includeShadowRoots })) {
    const matchElement = root.querySelector<HTMLElement>(
      `[${CONTENT_SEARCH_MATCH_ID_ATTRIBUTE}="${escapedMatchId}"]`,
    );
    if (matchElement != null) {
      return matchElement;
    }
  }

  return null;
}

export function clearSearchHighlights(
  target: HTMLElement,
  options: HighlightRootOptions,
): void {
  collectHighlightRoots(target, options).forEach((root) => {
    const marks = root.querySelectorAll(`mark.${CONTENT_SEARCH_MATCH_CLASS}`);
    marks.forEach((markNode) => {
      const parent = markNode.parentNode;
      if (parent == null) {
        return;
      }
      while (markNode.firstChild) {
        parent.insertBefore(markNode.firstChild, markNode);
      }
      parent.removeChild(markNode);
    });
  });
}

export function highlightQueryInTarget({
  target,
  query,
  maxMatches,
  includeShadowRoots,
}: {
  target: HTMLElement;
  query: string;
  maxMatches: number;
  includeShadowRoots: boolean;
}): HighlightResult {
  if (maxMatches <= 0) {
    return {
      matches: [],
      isCapped: false,
    };
  }

  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) {
    return {
      matches: [],
      isCapped: false,
    };
  }

  const matches = Array<HTMLElement>();
  const roots = collectHighlightRoots(target, {
    includeShadowRoots,
  });
  let isCapped = false;
  for (const root of roots) {
    const remainingMatchBudget = maxMatches - matches.length;
    if (remainingMatchBudget <= 0) {
      isCapped = true;
      break;
    }
    const nextRootResult = highlightTextNodesInRoot({
      root,
      query: trimmedQuery,
      maxMatches: remainingMatchBudget,
    });
    matches.push(...nextRootResult.matches);
    if (nextRootResult.isCapped) {
      isCapped = true;
      break;
    }
  }

  return {
    matches,
    isCapped,
  };
}

export function shouldHandleMutationEvent(
  records: Array<MutationRecord>,
): boolean {
  for (const record of records) {
    if (!isSearchHighlightMutation(record)) {
      return true;
    }
  }
  return false;
}

function collectHighlightRoots(
  target: HTMLElement,
  options: HighlightRootOptions,
): Array<HighlightRoot> {
  const roots: Array<HighlightRoot> = [target];
  if (!options.includeShadowRoots) {
    return roots;
  }

  const stack: Array<HighlightRoot> = [target];
  while (stack.length > 0) {
    const currentRoot = stack.pop();
    if (currentRoot == null) {
      continue;
    }

    const walker = document.createTreeWalker(
      currentRoot,
      NodeFilter.SHOW_ELEMENT,
    );
    let currentNode: Node | null = walker.currentNode;
    while (currentNode != null) {
      if (
        currentNode instanceof HTMLElement &&
        currentNode.shadowRoot != null
      ) {
        ensureShadowFindStyles(currentNode.shadowRoot);
        roots.push(currentNode.shadowRoot);
        stack.push(currentNode.shadowRoot);
      }
      currentNode = walker.nextNode();
    }
  }

  return roots;
}

function ensureShadowFindStyles(root: ShadowRoot): void {
  if (root.getElementById(SHADOW_FIND_STYLE_ID) != null) {
    return;
  }
  const style = document.createElement("style");
  style.id = SHADOW_FIND_STYLE_ID;
  style.textContent = SHADOW_FIND_STYLES;
  root.append(style);
}

function collectTextNodes(root: HighlightRoot): Array<Text> {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node): number {
      if (!(node instanceof Text)) {
        return NodeFilter.FILTER_REJECT;
      }
      const parentElement = node.parentElement;
      if (parentElement == null) {
        return NodeFilter.FILTER_REJECT;
      }
      if (
        parentElement.closest(
          "script, style, textarea, [contenteditable='true'], [data-thread-find-skip]",
        ) != null
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      if (
        parentElement.matches(
          "[data-line-num], [data-line-old-num], [data-line-new-num]",
        )
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes = Array<Text>();
  let currentNode: Node | null = walker.nextNode();
  while (currentNode != null) {
    if (currentNode instanceof Text) {
      textNodes.push(currentNode);
    }
    currentNode = walker.nextNode();
  }
  return textNodes;
}

function highlightTextNodesInRoot({
  root,
  query,
  maxMatches,
}: {
  root: HighlightRoot;
  query: string;
  maxMatches: number;
}): HighlightResult {
  if (maxMatches <= 0) {
    return {
      matches: [],
      isCapped: false,
    };
  }

  const textNodes = collectTextNodes(root);
  if (textNodes.length === 0) {
    return {
      matches: [],
      isCapped: false,
    };
  }

  const segments = Array<{ node: Text; start: number; end: number }>();
  let cursor = 0;
  textNodes.forEach((node) => {
    const text = node.textContent ?? "";
    const nextCursor = cursor + text.length;
    segments.push({
      node,
      start: cursor,
      end: nextCursor,
    });
    cursor = nextCursor;
  });

  const fullText = segments
    .map((segment) => {
      return segment.node.textContent ?? "";
    })
    .join("");
  const lowerText = fullText.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const sourceMatches = Array<{ start: number; end: number }>();
  let searchIndex = 0;
  while (searchIndex < lowerText.length && sourceMatches.length < maxMatches) {
    const matchStart = lowerText.indexOf(lowerQuery, searchIndex);
    if (matchStart === -1) {
      break;
    }
    sourceMatches.push({
      start: matchStart,
      end: matchStart + query.length,
    });
    searchIndex = matchStart + query.length;
  }
  const isCapped =
    sourceMatches.length === maxMatches &&
    lowerText.indexOf(lowerQuery, searchIndex) !== -1;

  const marks = Array<HTMLElement>();
  for (let index = sourceMatches.length - 1; index >= 0; index -= 1) {
    const sourceMatch = sourceMatches[index];
    const startTarget = findTextNodeAtOffset(segments, sourceMatch.start);
    const endTarget = findTextNodeAtOffset(segments, sourceMatch.end - 1);
    if (startTarget == null || endTarget == null) {
      continue;
    }

    const range = document.createRange();
    range.setStart(startTarget.node, sourceMatch.start - startTarget.start);
    range.setEnd(endTarget.node, sourceMatch.end - endTarget.start);

    const mark = document.createElement("mark");
    mark.className = CONTENT_SEARCH_MATCH_CLASS;
    const contents = range.extractContents();
    mark.append(contents);
    range.insertNode(mark);
    marks.push(mark);
  }

  return {
    matches: marks.reverse(),
    isCapped,
  };
}

function findTextNodeAtOffset(
  segments: Array<{ node: Text; start: number; end: number }>,
  offset: number,
): { node: Text; start: number } | null {
  for (const segment of segments) {
    if (offset >= segment.start && offset < segment.end) {
      return {
        node: segment.node,
        start: segment.start,
      };
    }
  }

  return null;
}

function isSearchHighlightMutation(record: MutationRecord): boolean {
  if (record.type === "characterData") {
    const parentElement = record.target.parentElement;
    if (parentElement == null) {
      return false;
    }
    return isSearchMark(parentElement);
  }

  if (record.type !== "childList") {
    return false;
  }

  if (isSearchMark(record.target)) {
    return true;
  }

  const changedNodes = [...record.addedNodes, ...record.removedNodes];
  let hasMarkNodeChange = false;
  for (const node of changedNodes) {
    if (node instanceof Text) {
      continue;
    }
    if (isSearchMark(node)) {
      hasMarkNodeChange = true;
      continue;
    }
    return false;
  }
  return hasMarkNodeChange;
}

function isSearchMark(node: Node): boolean {
  if (!(node instanceof HTMLElement)) {
    return false;
  }
  if (node.classList.contains(CONTENT_SEARCH_ACTIVE_CLASS)) {
    return true;
  }
  return node.classList.contains(CONTENT_SEARCH_MATCH_CLASS);
}

function escapeForAttributeSelector(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }

  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
