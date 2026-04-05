import type { List, ListItem } from "mdast";
import { toString } from "mdast-util-to-string";
import type { Node, Parent } from "unist";

/**
 * LLM output often uses `1.` then `-` (intended as a nested bullet) without indenting.
 * CommonMark parses that as separate lists (so numbering restarts); this reparents the
 * `ul` under the previous `li` and merges adjacent `ol` blocks.
 *
 * This stays conservative, but now also repairs a likely trailing nested `ul` under the
 * last ordered list item when the shape strongly suggests nested details (multiple bullets
 * or a preceding ordered item that ends with a colon).
 */
function isParent(node: Node): node is Parent {
  return (
    typeof (node as Parent).children !== "undefined" &&
    Array.isArray((node as Parent).children)
  );
}

function isList(node: Node | undefined): node is List {
  return node != null && node.type === "list";
}

function isOrderedList(node: Node | undefined): node is List {
  return isList(node) && node.ordered === true;
}

function isUnorderedList(node: Node | undefined): node is List {
  return isList(node) && node.ordered !== true;
}

function getLastListItem(list: List): ListItem | null {
  const lastChild = list.children[list.children.length - 1];
  if (lastChild == null) {
    return null;
  }
  if (lastChild.type !== "listItem") {
    return null;
  }
  return lastChild as ListItem;
}

function getListItemParagraphText(listItem: ListItem): string {
  const paragraph = listItem.children.find(
    (child) => child.type === "paragraph",
  );
  if (paragraph == null) {
    return "";
  }
  return toString(paragraph).trim();
}

function reparentUnorderedListToLastOrderedItem(
  orderedList: List,
  unorderedList: List,
): boolean {
  const lastListItem = getLastListItem(orderedList);
  if (lastListItem == null) {
    return false;
  }
  lastListItem.children.push(unorderedList);
  return true;
}

function shouldRepairTrailingUnorderedList(
  orderedList: List,
  unorderedList: List,
): boolean {
  if (unorderedList.children.length >= 2) {
    return true;
  }

  const lastListItem = getLastListItem(orderedList);
  if (lastListItem == null) {
    return false;
  }

  return getListItemParagraphText(lastListItem).endsWith(":");
}

function repairBrokenOrderedLists(parent: Parent): void {
  let index = 0;
  while (index + 1 < parent.children.length) {
    const maybeOrderedList = parent.children[index];
    const maybeUnorderedList = parent.children[index + 1];
    const maybeNextOrderedList = parent.children[index + 2];

    if (
      isOrderedList(maybeOrderedList) &&
      isUnorderedList(maybeUnorderedList) &&
      isOrderedList(maybeNextOrderedList)
    ) {
      if (
        !reparentUnorderedListToLastOrderedItem(
          maybeOrderedList,
          maybeUnorderedList,
        )
      ) {
        index += 1;
        continue;
      }

      maybeOrderedList.children.push(...maybeNextOrderedList.children);
      parent.children.splice(index + 1, 2);
      continue;
    }

    if (
      isOrderedList(maybeOrderedList) &&
      isUnorderedList(maybeUnorderedList) &&
      shouldRepairTrailingUnorderedList(maybeOrderedList, maybeUnorderedList)
    ) {
      if (
        !reparentUnorderedListToLastOrderedItem(
          maybeOrderedList,
          maybeUnorderedList,
        )
      ) {
        index += 1;
        continue;
      }

      parent.children.splice(index + 1, 1);
      continue;
    }

    index += 1;
  }
}

function repairBrokenOrderedListsRecursive(node: Node): void {
  if (!isParent(node)) {
    return;
  }

  repairBrokenOrderedLists(node);

  node.children.forEach((child) => {
    repairBrokenOrderedListsRecursive(child);
  });
}

interface VFileLike {
  value?: string | Uint8Array;
}

type RemarkTransformer = (tree: Node, file: VFileLike) => void;
type RemarkPlugin = () => RemarkTransformer;

const remarkFixBrokenOrderedLists: RemarkPlugin = () => {
  return (tree) => {
    repairBrokenOrderedListsRecursive(tree);
  };
};

export { remarkFixBrokenOrderedLists };
