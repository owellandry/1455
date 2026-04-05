import { signal } from "maitai";

import { AppScope } from "@/scopes/app-scope";
import { persistedSignal } from "@/utils/persisted-signal";

export type RemoteConnectionsOnboardingHandoff =
  | "hidden"
  | "show-add-remote-project-nudge";

export const remoteConnectionsOnboardingHandoff$ = signal<
  typeof AppScope,
  RemoteConnectionsOnboardingHandoff
>(AppScope, "hidden");

export const hasSeenRemoteConnectionsHomeAnnouncement$ =
  persistedSignal<boolean>(
    "has-seen-remote-connections-home-announcement",
    false,
  );
