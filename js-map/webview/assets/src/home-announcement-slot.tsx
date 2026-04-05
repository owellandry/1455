import { useRef, type ReactNode } from "react";

export type HomeAnnouncementEntry = {
  content: ReactNode;
  isEligible: boolean;
  isLoading: boolean;
};

function getSelectedHomeAnnouncementIndex(
  entries: Array<HomeAnnouncementEntry>,
): number | null | undefined {
  for (const [index, entry] of entries.entries()) {
    if (entry.isEligible) {
      return index;
    }

    if (entry.isLoading) {
      return undefined;
    }
  }

  return null;
}

export function HomeAnnouncementSlot({
  entries,
}: {
  entries: Array<HomeAnnouncementEntry>;
}): ReactNode {
  const selectedAnnouncementIndexRef = useRef<number | null | undefined>(
    undefined,
  );
  let selectedAnnouncementIndex = selectedAnnouncementIndexRef.current;

  if (selectedAnnouncementIndex === undefined) {
    const currentAnnouncementIndex = getSelectedHomeAnnouncementIndex(entries);
    if (currentAnnouncementIndex !== undefined) {
      selectedAnnouncementIndexRef.current = currentAnnouncementIndex;
      selectedAnnouncementIndex = currentAnnouncementIndex;
    }
  }

  if (selectedAnnouncementIndex == null) {
    return null;
  }

  const selectedEntry = entries[selectedAnnouncementIndex];

  if (selectedEntry == null || !selectedEntry.isEligible) {
    return null;
  }

  return selectedEntry.content;
}
