import type { Text } from "mdast";
import type { Node, Parent } from "unist";
import { visit } from "unist-util-visit";

const MARKDOWN_ESCAPABLE_CHARACTERS = new Set([
  "\\",
  "`",
  "*",
  "_",
  "{",
  "}",
  "[",
  "]",
  "(",
  ")",
  "#",
  "+",
  "-",
  ".",
  "!",
  ">",
]);

function isBoundaryCharacter(character: string | undefined): boolean {
  if (character == null) {
    return true;
  }
  return /[\s()[\]{}<>]/.test(character);
}

function isLikelyWindowsPath(source: string, slashIndex: number): boolean {
  const previousCharacter = source[slashIndex - 1];
  const nextCharacter = source[slashIndex + 1];

  if (
    nextCharacter === "\\" &&
    (slashIndex === 0 || isBoundaryCharacter(previousCharacter))
  ) {
    return true;
  }

  if (
    previousCharacter === "\\" &&
    (slashIndex - 1 === 0 || isBoundaryCharacter(source[slashIndex - 2]))
  ) {
    return true;
  }

  for (let index = slashIndex; index >= 0; index -= 1) {
    const character = source[index];
    if (character === "\n" || character === "\r") {
      break;
    }
    if (character === "\\" && index > 0 && source[index - 1] === "\\") {
      if (index - 1 === 0 || isBoundaryCharacter(source[index - 2])) {
        return true;
      }
    }
    if (character === ":" && index > 0) {
      const driveLetter = source[index - 1];
      const nextToColon = source[index + 1];
      if (/[A-Za-z]/.test(driveLetter) && nextToColon === "\\") {
        return true;
      }
    }
  }

  return false;
}

function preserveWindowsPathBackslashes(
  value: string,
  rawValue: string | undefined,
): string {
  if (!rawValue || !rawValue.includes("\\")) {
    return value;
  }

  let result = "";
  let rawIndex = 0;
  let cookedIndex = 0;
  let hasChanges = false;

  while (rawIndex < rawValue.length && cookedIndex < value.length) {
    const rawCharacter = rawValue[rawIndex];
    if (
      rawCharacter === "\\" &&
      rawIndex + 1 < rawValue.length &&
      MARKDOWN_ESCAPABLE_CHARACTERS.has(rawValue[rawIndex + 1])
    ) {
      if (isLikelyWindowsPath(rawValue, rawIndex)) {
        result += "\\";
        hasChanges = true;
      }

      result += value[cookedIndex];
      cookedIndex += 1;
      rawIndex += 2;
      continue;
    }

    result += value[cookedIndex];
    cookedIndex += 1;
    rawIndex += 1;
  }

  if (cookedIndex < value.length) {
    result += value.slice(cookedIndex);
  }

  return hasChanges ? result : value;
}

const SKIP_PARENT_TYPES = new Set(["code", "inlineCode"]);

interface VFileLike {
  value: string | Uint8Array;
}

type RemarkTransformer = (tree: Node, file: VFileLike) => void;
type RemarkPlugin = () => RemarkTransformer;

const remarkPreserveWindowsPaths: RemarkPlugin = () => {
  return (tree, file) => {
    visit(tree, "text", (node, _index, parent) => {
      if (parent && SKIP_PARENT_TYPES.has((parent as Parent).type)) {
        return;
      }

      const textNode = node as Text;
      if (typeof file.value !== "string") {
        return;
      }

      const position = textNode.position;
      if (
        !position ||
        position.start.offset == null ||
        position.end.offset == null
      ) {
        return;
      }

      const rawValue = file.value.slice(
        position.start.offset,
        position.end.offset,
      );
      const updatedValue = preserveWindowsPathBackslashes(
        textNode.value,
        rawValue,
      );

      if (updatedValue !== textNode.value) {
        textNode.value = updatedValue;
      }
    });
  };
};

export { preserveWindowsPathBackslashes, remarkPreserveWindowsPaths };
