import clsx from "clsx";
import { useEffect, useRef } from "react";

import type { ProseMirrorComposerController } from "./composer-controller";

// Note: Currently keep this component in this file to reduce amount of dynamic modules we need to import
// When we migrate to GA, move out of here
export function RichTextInput({
  composerController,
  placeholder,
  ariaLabel,
  minHeight,
  disableAutoFocus = false,
  onSubmit,
  onMentionHandler,
  onSkillMentionHandler,
  className,
}: {
  ariaLabel?: string;
  minHeight?: string;
  disableAutoFocus?: boolean;
  placeholder: string;
  composerController: ProseMirrorComposerController;
  onMentionHandler?: (event: "submit" | "close") => void;
  onSkillMentionHandler?: (event: "submit" | "close") => void;
  onSubmit: () => void;
  className?: string;
}): React.ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentRootRef = rootRef.current;
    if (currentRootRef == null) {
      throw new Error("RichTextInput rootRef is not mounted");
    }

    const editorElement = composerController.view.dom as HTMLElement;
    currentRootRef.appendChild(editorElement);
    // oxlint-disable-next-line react-hooks-js/immutability
    composerController.view.dom.dataset.virtualkeyboard = "true";

    composerController.view.dom.dataset.codexComposer = "true";
    editorElement.style.fontSize = "var(--codex-chat-font-size)";
    editorElement.style.height = "auto";
    editorElement.style.resize = "none";

    return (): void => {
      editorElement.blur();
      if (editorElement.parentElement === currentRootRef) {
        currentRootRef.removeChild(editorElement);
      }
    };
  }, [composerController]);

  useEffect(() => {
    if (disableAutoFocus) {
      return;
    }

    requestAnimationFrame(() => {
      composerController.focus();
    });
  }, [composerController, disableAutoFocus]);

  useEffect(() => {
    const editorElement = composerController.view.dom;
    if (ariaLabel) {
      editorElement.setAttribute("aria-label", ariaLabel);
      return;
    }
    editorElement.removeAttribute("aria-label");
  }, [ariaLabel, composerController]);

  useEffect(() => {
    composerController.view.dom.style.minHeight = minHeight ?? "2.5rem";
  }, [composerController, minHeight]);

  useEffect(() => {
    composerController.setPlaceholder(placeholder);
  }, [placeholder, composerController]);

  useEffect(() => {
    const submitHandler = (): void => onMentionHandler?.("submit");
    const closeHandler = (): void => onMentionHandler?.("close");
    const skillSubmitHandler = (): void => onSkillMentionHandler?.("submit");
    const skillCloseHandler = (): void => onSkillMentionHandler?.("close");

    composerController.addSubmitHandler(onSubmit);
    const hasMentionHandler = onMentionHandler != null;
    if (hasMentionHandler) {
      composerController.eventEmitter.addListener(
        "mention-ui-submit",
        submitHandler,
      );
      composerController.eventEmitter.addListener(
        "mention-ui-close",
        closeHandler,
      );
    }
    const hasSkillMentionHandler = onSkillMentionHandler != null;
    if (hasSkillMentionHandler) {
      composerController.eventEmitter.addListener(
        "skill-mention-ui-submit",
        skillSubmitHandler,
      );
      composerController.eventEmitter.addListener(
        "skill-mention-ui-close",
        skillCloseHandler,
      );
    }
    return (): void => {
      composerController.removeSubmitHandler(onSubmit);
      if (hasMentionHandler) {
        composerController.eventEmitter.removeListener(
          "mention-ui-submit",
          submitHandler,
        );
        composerController.eventEmitter.removeListener(
          "mention-ui-close",
          closeHandler,
        );
      }
      if (hasSkillMentionHandler) {
        composerController.eventEmitter.removeListener(
          "skill-mention-ui-submit",
          skillSubmitHandler,
        );
        composerController.eventEmitter.removeListener(
          "skill-mention-ui-close",
          skillCloseHandler,
        );
      }
    };
  }, [onSubmit, composerController, onMentionHandler, onSkillMentionHandler]);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>): void => {
    const editorElement = composerController.view.dom;
    if (!(event.target instanceof Node)) {
      return;
    }

    if (!editorElement.contains(event.target)) {
      // Clicking within the container but outside of the ProseMirror editor (for
      // example, the padding area around the content) should keep focus in the
      // editor without modifying the current selection.
      event.preventDefault();
      editorElement.focus();
    }
  };

  return (
    <div
      ref={rootRef}
      onMouseDown={handleMouseDown}
      className={clsx(
        "text-size-chat",
        "[&_.ProseMirror]:focus-visible:outline-none",
        "text-token-foreground h-auto max-h-[25dvh] min-h-[4dvh] overflow-y-auto",
        "[&_.ProseMirror]:min-h-[2rem]",
        "[&_.ProseMirror]:h-auto",
        "[&_.ProseMirror]:resize-none",
        "[&_.ProseMirror_p]:m-0",
        className,
      )}
    />
  );
}
