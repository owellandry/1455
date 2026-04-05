import { atom } from "jotai";

import { persistedAtom } from "@/utils/persisted-atom";

export const aHasShownAnnouncementThisSession = atom(false);

export const aHasSeenFastModeAnnouncement = persistedAtom<boolean>(
  "has-seen-fast-mode-announcement",
  false,
);
