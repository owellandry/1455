import type * as AppServer from "app-server-types";

export const PERSONALITY_PERSISTED_ATOM_KEY = "composer-personality";

function isPersonality(value: unknown): value is AppServer.Personality {
  return value === "friendly" || value === "pragmatic";
}

export function parsePersonality(value: unknown): AppServer.Personality | null {
  return isPersonality(value) ? value : null;
}
