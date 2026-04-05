import type { components } from "@oai/sa-server-client";
import startCase from "lodash/startCase";
import uniq from "lodash/uniq";

type Action = components["schemas"]["Action"];

export type AppToolDetails = {
  accessBadges: Array<string>;
  description: string;
  name: string;
  visibility: string | null;
};

export function getAppTools({
  actions,
}: {
  actions: Array<Action>;
}): Array<AppToolDetails> {
  return actions
    .filter((action) => action.is_enabled !== false)
    .map((action) => ({
      accessBadges: getActionAccessBadges(action),
      description: action.description,
      name: action.name,
      visibility: formatMetadataLabel(action.visibility),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function getActionAccessBadges(action: Action): Array<string> {
  return uniq([
    action.is_read_only === true
      ? "READ"
      : getWriteAccessLabel(action.visibility),
    action.is_open_world === true ? "OPEN WORLD" : null,
    action.is_destructive === true ? "DESTRUCTIVE" : null,
  ]).flatMap((value) => (value == null ? [] : [value]));
}

function getWriteAccessLabel(visibility: Action["visibility"]): string | null {
  const formattedVisibility = formatMetadataLabel(visibility);
  if (formattedVisibility == null) {
    return "WRITE";
  }

  return `${formattedVisibility} WRITE`;
}

function formatMetadataLabel(value: string | null | undefined): string | null {
  const trimmedValue = value?.trim();
  if (trimmedValue == null || trimmedValue.length === 0) {
    return null;
  }

  return startCase(trimmedValue.replace(/[:/_.-]+/g, " ")).toUpperCase();
}
