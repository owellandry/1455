import Anser from "anser/lib/index.js";
import clsx from "clsx";

import { escapeCarriageReturn } from "../utils/escape-carriage-return";

import "./ansi-block.css";

type AnsiFragment = ReturnType<typeof Anser.ansiToJson>[number];

const BACKSPACE_PATTERN = new RegExp(`[^\\n]${String.fromCharCode(8)}`, "gm");

export function AnsiBlock({
  children,
  className,
}: {
  children: string;
  className?: string;
}): React.ReactElement {
  const ansiFragments = Anser.ansiToJson(
    escapeCarriageReturn(stripBackspacedCharacters(children)),
    {
      json: true,
      remove_empty: true,
      use_classes: true,
    },
  );

  return (
    <code className={clsx(className)}>
      {ansiFragments.map((fragment, index) => (
        <span
          key={`${index}-${fragment.content}`}
          className={clsx(
            fragment.fg != null && `${fragment.fg}-fg`,
            fragment.bg != null && `${fragment.bg}-bg`,
          )}
          style={getAnsiDecorationStyle(fragment)}
        >
          {fragment.content}
        </span>
      ))}
    </code>
  );
}

function getAnsiDecorationStyle(
  fragment: AnsiFragment,
): React.CSSProperties | undefined {
  const decorations = fragment.decoration == null ? [] : [fragment.decoration];

  if (decorations.length === 0) {
    return undefined;
  }

  const style: React.CSSProperties = {};
  const textDecorationLine: Array<string> = [];

  if (decorations.includes("bold")) {
    style.fontWeight = "bold";
  }
  if (decorations.includes("dim")) {
    style.opacity = "0.5";
  }
  if (decorations.includes("italic")) {
    style.fontStyle = "italic";
  }
  if (decorations.includes("hidden")) {
    style.visibility = "hidden";
  }
  if (decorations.includes("underline")) {
    textDecorationLine.push("underline");
  }
  if (decorations.includes("strikethrough")) {
    textDecorationLine.push("line-through");
  }

  if (textDecorationLine.length > 0) {
    style.textDecorationLine = textDecorationLine.join(" ");
  }

  return style;
}

function stripBackspacedCharacters(text: string): string {
  let previousText = text;
  let nextText = previousText;

  do {
    previousText = nextText;
    nextText = previousText.replace(BACKSPACE_PATTERN, "");
  } while (nextText.length < previousText.length);

  return previousText;
}
