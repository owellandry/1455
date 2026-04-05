export type ButtonSize =
  | "default"
  | "icon"
  | "iconSm"
  | "large"
  | "medium"
  | "composer"
  | "composerSm"
  | "toolbar";

export const BUTTON_RADIUS_BY_SIZE: Record<ButtonSize, string> = {
  default: "rounded-full",
  icon: "rounded-full electron:rounded-md",
  iconSm: "rounded-md",
  large: "rounded-full",
  medium: "rounded-lg",
  composer: "rounded-full",
  composerSm: "rounded-full",
  toolbar: "rounded-lg",
};
