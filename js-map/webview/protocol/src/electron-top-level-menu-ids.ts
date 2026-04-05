export const electronTopLevelMenuIds = {
  file: "file-menu",
  edit: "edit-menu",
  view: "view-menu",
  window: "window-menu",
  help: "help-menu",
} as const;

export type ElectronTopLevelMenuId =
  (typeof electronTopLevelMenuIds)[keyof typeof electronTopLevelMenuIds];
