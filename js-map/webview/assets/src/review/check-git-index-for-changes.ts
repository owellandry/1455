const CHECK_GIT_INDEX_FOR_CHANGES_EVENT = "codex-check-git-index-for-changes";

export function dispatchCheckGitIndexForChangesEvent(): void {
  const event = new CustomEvent(CHECK_GIT_INDEX_FOR_CHANGES_EVENT);
  window.dispatchEvent(event);
}

export function addCheckGitIndexForChangesListener(
  listener: () => void,
): () => void {
  const handler = (): void => {
    listener();
  };
  window.addEventListener(CHECK_GIT_INDEX_FOR_CHANGES_EVENT, handler);
  return (): void => {
    window.removeEventListener(CHECK_GIT_INDEX_FOR_CHANGES_EVENT, handler);
  };
}
