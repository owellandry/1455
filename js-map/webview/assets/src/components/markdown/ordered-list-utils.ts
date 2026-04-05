import type { ReactNode } from "react";
import { isValidElement } from "react";

export function getOrderedListPaddingClassName(digitCount: number): string {
  if (digitCount <= 1) {
    return "pl-8";
  }
  if (digitCount === 2) {
    return "pl-8";
  }
  if (digitCount === 3) {
    return "pl-10";
  }
  if (digitCount === 4) {
    return "pl-12";
  }
  return "pl-14";
}

export function groupOrderedListItems(
  children: Array<ReactNode>,
  start = 1,
): Array<{ start: number; digits: number; items: Array<ReactNode> }> {
  const listItems = children.filter((child) => isValidElement(child));
  const groups: Array<{
    start: number;
    digits: number;
    items: Array<ReactNode>;
  }> = [];

  listItems.forEach((item, index) => {
    const position = start + index;
    const digits = String(position).length;
    const currentGroup = groups[groups.length - 1];
    if (!currentGroup || currentGroup.digits !== digits) {
      groups.push({ start: position, digits, items: [item] });
    } else {
      currentGroup.items.push(item);
    }
  });

  return groups;
}
