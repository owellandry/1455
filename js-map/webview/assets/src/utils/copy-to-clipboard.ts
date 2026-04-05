import type { BaseSyntheticEvent } from "react";

function handleError(): void {
  // TODO: show a toast or something
}

export type ClipboardContent = {
  "text/plain"?: string;
  "text/html"?: string;
  "image/png"?: Blob;
  "image/jpeg"?: Blob;
  "image/webp"?: Blob;
};

export type ImageMimeType = "image/png" | "image/jpeg" | "image/webp";

/**
 * Copy the given content to the clipboard. If the copy fails, display a message to the user.
 *
 * @param content Content to write to the clipboard
 * @param event Event that triggered the copy.
 * @returns A promise that resolves when the copy is complete.
 */
export function copyToClipboard(
  content: string | ClipboardContent,
  event?: BaseSyntheticEvent,
): Promise<boolean> {
  const { navigator } = (event?.target?.ownerDocument?.defaultView ??
    window) as Window;
  return new Promise((resolve, reject) => {
    if (!navigator?.clipboard) {
      handleError();
      reject();
      return;
    }

    try {
      if ("write" in navigator.clipboard && "supports" in ClipboardItem) {
        const item = new ClipboardItem(
          Object.fromEntries(
            Object.entries(
              typeof content === "string" ? { "text/plain": content } : content,
            ).map(([type, content]) => [
              type,
              typeof content === "string"
                ? new Blob([content], { type })
                : content,
            ]),
          ),
        );
        navigator.clipboard.write([item]).then(
          () => resolve(true),
          () => {
            handleError();
            reject();
          },
        );
      } else {
        const textToCopy =
          typeof content === "string" ? content : (content["text/plain"] ?? "");
        navigator.clipboard.writeText(textToCopy).then(
          () => resolve(true),
          () => {
            handleError();
            reject();
          },
        );
      }
    } catch {
      handleError();
      reject();
    }
  });
}
