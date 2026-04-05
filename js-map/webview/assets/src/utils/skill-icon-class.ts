export function getSkillIconClassName({
  size,
  hasLargeIcon,
  smallClassName = "icon-md",
  largeFallbackClassName = "h-5 w-5",
}: {
  size: "small" | "large";
  hasLargeIcon: boolean;
  smallClassName?: string;
  largeFallbackClassName?: string;
}): string {
  if (size === "large") {
    return hasLargeIcon ? "h-full w-full" : largeFallbackClassName;
  }
  return smallClassName;
}
