import { useState } from "react";

export function useArchiveState({
  onArchiveStart,
  onArchiveSuccess,
  onArchiveError,
}: {
  onArchiveStart?: () => void;
  onArchiveSuccess?: () => void;
  onArchiveError?: () => void;
}): {
  archived: boolean;
  usesExternalArchiveHandling: boolean;
  beginArchive: () => void;
  handleArchiveSuccess: () => void;
  handleArchiveError: () => void;
} {
  const [archived, setArchived] = useState(false);
  const usesExternalArchiveHandling =
    onArchiveStart != null ||
    onArchiveSuccess != null ||
    onArchiveError != null;
  const beginArchive = (): void => {
    if (usesExternalArchiveHandling) {
      onArchiveStart?.();
    } else {
      setArchived(true);
    }
  };
  const handleArchiveSuccess = (): void => {
    onArchiveSuccess?.();
  };
  const handleArchiveError = (): void => {
    if (usesExternalArchiveHandling) {
      onArchiveError?.();
    } else {
      setArchived(false);
    }
  };

  return {
    archived,
    usesExternalArchiveHandling,
    beginArchive,
    handleArchiveSuccess,
    handleArchiveError,
  };
}
